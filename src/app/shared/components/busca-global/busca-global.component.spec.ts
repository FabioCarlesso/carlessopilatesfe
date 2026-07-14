import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { PacienteResponseDTO, Page } from '../../../core/models/paciente';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';
import { isOnPush } from '../../../../testing/onpush';
import { BuscaGlobalComponent } from './busca-global.component';

const DEBOUNCE_MS = 300;

function pagina<T>(content: T[]): Page<T> {
  return {
    content,
    page: { size: 5, number: 0, totalElements: content.length, totalPages: 1 }
  } as Page<T>;
}

function paciente(id: number, nome: string): PacienteResponseDTO {
  return {
    id,
    nome,
    email: `${nome}@teste.com`,
    cpf: '123.456.789-01',
    telefone: '11999999999',
    dataNascimento: '1990-01-01',
    endereco: null,
    ativo: true
  };
}

function profissional(id: number, nome: string): ProfissionalResponseDTO {
  return {
    id,
    nome,
    email: `${nome}@teste.com`,
    cpf: '98765432100',
    telefone: null,
    tipoContrato: 'PJ',
    percentualPagamentoAula: 50,
    dataInicio: '2024-01-01',
    ativo: true
  };
}

describe('BuscaGlobalComponent', () => {
  let pacienteService: jasmine.SpyObj<PacienteService>;
  let profissionalService: jasmine.SpyObj<ProfissionalService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let fixture: ComponentFixture<BuscaGlobalComponent>;
  let component: BuscaGlobalComponent;

  function setup(admin = false): void {
    pacienteService = jasmine.createSpyObj<PacienteService>('PacienteService', ['listar']);
    profissionalService = jasmine.createSpyObj<ProfissionalService>('ProfissionalService', ['listar']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    authService.isAdmin.and.returnValue(admin);
    pacienteService.listar.and.returnValue(of(pagina<PacienteResponseDTO>([])));
    profissionalService.listar.and.returnValue(of(pagina<ProfissionalResponseDTO>([]) as ProfissionalPage));

    TestBed.configureTestingModule({
      imports: [BuscaGlobalComponent],
      providers: [
        { provide: PacienteService, useValue: pacienteService },
        { provide: ProfissionalService, useValue: profissionalService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(BuscaGlobalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function digitar(termo: string): void {
    component.termo.setValue(termo);
    tick(DEBOUNCE_MS);
    fixture.detectChanges();
  }

  function statusVisivel(): string {
    const el = fixture.nativeElement as HTMLElement;
    return el.querySelector('.busca-global-status.is-visivel')?.textContent?.trim() ?? '';
  }

  it('deve usar ChangeDetectionStrategy.OnPush', () => {
    expect(isOnPush(BuscaGlobalComponent)).toBeTrue();
  });

  it('não deve buscar com termo menor que o mínimo', fakeAsync(() => {
    setup();
    digitar('a');

    expect(pacienteService.listar).not.toHaveBeenCalled();
    expect(component.aberto).toBeFalse();
  }));

  it('deve buscar pacientes por nome com debounce', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(7, 'Maria')])));

    component.termo.setValue('Mar');
    expect(pacienteService.listar).not.toHaveBeenCalled();

    tick(DEBOUNCE_MS);
    fixture.detectChanges();

    expect(pacienteService.listar).toHaveBeenCalledWith(0, 5, { nome: 'Mar' });
    expect(component.resultados).toEqual([
      { tipo: 'paciente', id: 7, nome: 'Maria', detalhe: '123.456.789-01' }
    ]);
    expect(component.buscando).toBeFalse();
  }));

  it('deve buscar pacientes por CPF preservando a máscara digitada', fakeAsync(() => {
    setup();
    digitar('123.456.789-01');

    // O filtro `cpf` da API é `LIKE %termo%` sobre o valor gravado como digitado no
    // cadastro: normalizar para só dígitos deixaria de casar com um CPF salvo com máscara.
    expect(pacienteService.listar).toHaveBeenCalledWith(0, 5, { cpf: '123.456.789-01' });
  }));

  it('deve buscar por CPF parcial, sem exigir o documento completo', fakeAsync(() => {
    setup();
    digitar('123');

    expect(pacienteService.listar).toHaveBeenCalledWith(0, 5, { cpf: '123' });
  }));

  it('não deve buscar profissionais para usuário não ADMIN', fakeAsync(() => {
    setup(false);
    digitar('Ana');

    expect(profissionalService.listar).not.toHaveBeenCalled();
  }));

  it('não deve buscar profissionais quando o termo é um CPF', fakeAsync(() => {
    setup(true);
    digitar('123.456');

    expect(profissionalService.listar).not.toHaveBeenCalled();
  }));

  it('deve incluir profissionais nos resultados quando o usuário é ADMIN', fakeAsync(() => {
    setup(true);
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana Paciente')])));
    profissionalService.listar.and.returnValue(
      of(pagina([profissional(2, 'Ana Profissional')]) as ProfissionalPage)
    );

    digitar('Ana');

    expect(profissionalService.listar).toHaveBeenCalledWith(0, 5, { nome: 'Ana' });
    expect(component.resultados.map(r => r.tipo)).toEqual(['paciente', 'profissional']);
  }));

  it('deve manter os pacientes quando a busca de profissionais falha', fakeAsync(() => {
    setup(true);
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana')])));
    profissionalService.listar.and.returnValue(throwError(() => new Error('falha')));

    digitar('Ana');

    expect(component.resultados.length).toBe(1);
    expect(component.erro).toBeFalse();
    expect(component.semResultados).toBeFalse();
  }));

  it('deve exibir erro, e não "nenhum resultado", quando a busca falha', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(throwError(() => new Error('offline')));

    digitar('Ana');

    expect(component.erro).toBeTrue();
    expect(component.semResultados).toBeFalse();
    expect(statusVisivel()).toContain('Não foi possível buscar agora');
  }));

  it('deve sinalizar nenhum resultado quando a busca não retorna registros', fakeAsync(() => {
    setup();
    digitar('Zzz');

    expect(component.semResultados).toBeTrue();
    expect(statusVisivel()).toContain('Nenhum resultado');
  }));

  it('deve manter a live region no DOM mesmo sem mensagem', fakeAsync(() => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const status = el.querySelector('.busca-global-status');

    expect(status).toBeTruthy();
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.classList.contains('is-visivel')).toBeFalse();
  }));

  it('deve navegar por teclado e abrir o detalhe do resultado selecionado', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana'), paciente(2, 'Bruno')])));
    digitar('An');

    component.aoTeclar(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    component.aoTeclar(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.indiceAtivo).toBe(1);

    component.aoTeclar(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(router.navigate).toHaveBeenCalledWith(['/pacientes', 2]);
    expect(component.termo.value).toBe('');
    expect(component.aberto).toBeFalse();
    tick(DEBOUNCE_MS);
  }));

  it('deve abrir o detalhe ao clicar em um resultado com o mouse', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(3, 'Ana')])));
    digitar('An');

    const item = (fixture.nativeElement as HTMLElement).querySelector('.busca-global-item') as HTMLElement;
    item.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/pacientes', 3]);
    expect(component.aberto).toBeFalse();
    tick(DEBOUNCE_MS);
  }));

  it('deve navegar para o detalhe do profissional ao selecionar', fakeAsync(() => {
    setup(true);
    pacienteService.listar.and.returnValue(of(pagina<PacienteResponseDTO>([])));
    profissionalService.listar.and.returnValue(of(pagina([profissional(9, 'Ana')]) as ProfissionalPage));
    digitar('Ana');

    component.selecionar(component.resultados[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/profissionais', 9]);
    tick(DEBOUNCE_MS);
  }));

  it('deve fechar os resultados ao pressionar Esc sem propagar para a navbar', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana')])));
    digitar('An');
    expect(component.aberto).toBeTrue();

    const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    const stopPropagation = spyOn(evento, 'stopPropagation');
    component.aoTeclar(evento);

    expect(component.aberto).toBeFalse();
    expect(component.indiceAtivo).toBe(-1);
    expect(stopPropagation).toHaveBeenCalled();
  }));

  it('deve fechar os resultados ao clicar fora do componente', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana')])));
    digitar('An');
    expect(component.aberto).toBeTrue();

    document.body.click();
    fixture.detectChanges();

    expect(component.aberto).toBeFalse();
  }));

  it('deve manter os resultados abertos ao clicar dentro do componente', fakeAsync(() => {
    setup();
    pacienteService.listar.and.returnValue(of(pagina([paciente(1, 'Ana')])));
    digitar('An');

    const campo = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    campo.click();
    fixture.detectChanges();

    expect(component.aberto).toBeTrue();
  }));

  it('deve focar o campo com o atalho "/"', fakeAsync(() => {
    setup();
    const campo = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const focus = spyOn(campo, 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));

    expect(focus).toHaveBeenCalled();
  }));

  it('deve focar o campo com o atalho Ctrl+K', fakeAsync(() => {
    setup();
    const campo = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const focus = spyOn(campo, 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(focus).toHaveBeenCalled();
  }));
});
