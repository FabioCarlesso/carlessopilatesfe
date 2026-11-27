import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Page, PacienteResponseDTO } from '../../../core/models/paciente';
import { PacienteService } from '../../../core/services/paciente.service';
import { ProfissionalPacientesComponent } from './profissional-pacientes.component';

function paciente(id: number, nome: string, ativo = true): PacienteResponseDTO {
  return {
    version: 0,
    id,
    nome,
    email: null,
    cpf: null,
    telefone: '11999999999',
    dataNascimento: '1990-01-01',
    endereco: null,
    ativo,
    cpfNaNota: false,
    tomadorId: null,
    tomadorNome: null,
    tomadorCpfCnpj: null,
    profissionalPadraoId: 3,
    profissionalPadraoNome: 'Carla Fisio'
  };
}

function pagina(content: PacienteResponseDTO[], number = 0, totalPages = 1, totalElements = content.length): Page<PacienteResponseDTO> {
  return { content, page: { size: 10, number, totalElements, totalPages } };
}

describe('ProfissionalPacientesComponent', () => {
  let fixture: ComponentFixture<ProfissionalPacientesComponent>;
  let component: ProfissionalPacientesComponent;
  let serviceSpy: jasmine.SpyObj<PacienteService>;

  async function setup(resposta = of(pagina([paciente(7, 'Ana Silva'), paciente(8, 'Bruno Costa', false)]))) {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['listar']);
    serviceSpy.listar.and.returnValue(resposta);

    await TestBed.configureTestingModule({
      imports: [ProfissionalPacientesComponent, RouterTestingModule],
      providers: [{ provide: PacienteService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalPacientesComponent);
    component = fixture.componentInstance;
    component.profissionalId = 3;
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should ask the API only for the patients of this professional', async () => {
    await setup();

    expect(serviceSpy.listar).toHaveBeenCalledOnceWith(0, 10, { profissionalId: 3 });
  });

  it('should list name with link, phone and status', async () => {
    await setup();

    const linhas = Array.from(el().querySelectorAll('tbody tr'));
    expect(linhas.length).toBe(2);
    expect(linhas[0].querySelector('a')?.getAttribute('href')).toBe('/pacientes/7');
    expect(linhas[0].textContent).toContain('Ana Silva');
    expect(linhas[0].querySelector('.status-badge')?.textContent?.trim()).toBe('Ativo');
    expect(linhas[1].querySelector('.status-badge')?.classList).toContain('inactive');
    expect(el().querySelector('.pacientes-total')?.textContent?.trim()).toBe('2 pacientes');
  });

  it('should show the empty state when no patient has this default', async () => {
    await setup(of(pagina([])));

    expect(el().querySelector('.empty-state__mensagem')?.textContent?.trim())
      .toBe('Nenhum paciente com este fisioterapeuta padrão.');
    expect(el().querySelector('table')).toBeNull();
  });

  it('should show an error when the list fails', async () => {
    await setup(throwError(() => new Error('falha')));

    expect(el().querySelector('.alert-danger')?.textContent?.trim()).toBe('Erro ao carregar os pacientes do profissional.');
    expect(component.loading).toBeFalse();
  });

  it('should paginate on the server', async () => {
    await setup(of(pagina([paciente(7, 'Ana Silva')], 0, 2, 11)));
    const botoes = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.pagination button'));

    expect(el().querySelector('.pagina-atual')?.textContent?.trim()).toBe('Página 1 de 2');
    expect(botoes()[0].disabled).toBeTrue();

    serviceSpy.listar.and.returnValue(of(pagina([paciente(9, 'Célia Dias')], 1, 2, 11)));
    botoes()[1].click();
    fixture.detectChanges();

    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10, { profissionalId: 3 });
    expect(component.pagina).toBe(1);
    expect(botoes()[1].disabled).toBeTrue();

    serviceSpy.listar.and.returnValue(of(pagina([paciente(7, 'Ana Silva')], 0, 2, 11)));
    botoes()[0].click();
    fixture.detectChanges();
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, { profissionalId: 3 });
  });

  it('should hide the pagination when there is a single page', async () => {
    await setup();

    expect(el().querySelector('.pagination')).toBeNull();
  });
});
