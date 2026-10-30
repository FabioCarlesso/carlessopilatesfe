import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacientePlanoTratamentoListComponent } from './paciente-plano-tratamento-list.component';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockPlano: PlanoTratamentoResponseDTO = {
  version: 0,
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataInicio: '2026-05-01',
  dataFimPrevista: null,
  objetivosTratamento: 'Redução de dor lombar',
  intervencoesPlanejadas: 'Pilates solo',
  numeroSessoesPrevistas: 24,
  frequenciaSessoes: '2x por semana',
  responsavelTratamento: null,
  observacoes: null,
  dataCriacao: '2026-05-01T10:00:00',
  dataAtualizacao: null
};

const mockPlanoAnterior: PlanoTratamentoResponseDTO = {
  ...mockPlano,
  id: 2,
  dataInicio: '2026-01-10',
  dataFimPrevista: '2026-04-30',
  numeroSessoesPrevistas: null,
  frequenciaSessoes: null
};

describe('PacientePlanoTratamentoListComponent', () => {
  let component: PacientePlanoTratamentoListComponent;
  let fixture: ComponentFixture<PacientePlanoTratamentoListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let planoTratamentoServiceSpy: jasmine.SpyObj<PlanoTratamentoService>;

  async function setup(
    planos: PlanoTratamentoResponseDTO[] = [mockPlano],
    pacienteId = '10'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    planoTratamentoServiceSpy = jasmine.createSpyObj('PlanoTratamentoService', [
      'listarPorPaciente',
      'inativar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(of(planos));

    await TestBed.configureTestingModule({
      imports: [PacientePlanoTratamentoListComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: PlanoTratamentoService, useValue: planoTratamentoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacientePlanoTratamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient and plans', async () => {
    await setup([mockPlano]);

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(planoTratamentoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.planos).toEqual([mockPlano]);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should show empty state when no plans exist', async () => {
    await setup([]);

    expect(component.planos.length).toBe(0);
    expect(component.erro).toBeNull();
  });

  it('should render the API fields of each plan', async () => {
    await setup([mockPlano, mockPlanoAnterior]);

    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.plano-card'));
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Redução de dor lombar');
    expect(cards[0].textContent).toContain('Pilates solo');
    expect(cards[0].textContent).toContain('24 sessões previstas');
    expect(cards[0].textContent).toContain('2x por semana');
    expect(cards[0].textContent).not.toContain('Previsão de término');
    expect(cards[1].textContent).toContain('Previsão de término: 30/04/2026');
    expect(cards[1].textContent).not.toContain('sessões previstas');
  });

  it('should set erro when patient loading fails', async () => {
    await setup([]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when plans loading fails', async () => {
    await setup([]);
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component['carregarPlanos']();

    expect(component.erro).toBe('Erro ao carregar planos de tratamento.');
    expect(component.loading).toBeFalse();
  });

  // O backend responde 404 em `/planos-tratamento/paciente/{id}` quando o paciente está
  // inativo, tratando-o como inexistente (issue #203). Como o paciente já foi carregado
  // antes da listagem, 404 aqui significa "sem planos" e deve cair no estado vazio, não na
  // faixa de erro.
  it('should show the empty state when the list responds 404 (inactive patient)', async () => {
    await setup([mockPlano]);
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { erro: 'Paciente não encontrado: 1' } }))
    );

    component['carregarPlanos']();
    fixture.detectChanges();

    expect(component.planos).toEqual([]);
    expect(component.erro).toBeNull();
    expect(component.loading).toBeFalse();
    const vazio: HTMLElement | null = fixture.nativeElement.querySelector('.empty-state');
    expect(vazio?.querySelector('.empty-state__mensagem')?.textContent?.trim()).toBe('Nenhum plano de tratamento cadastrado.');
    expect(vazio?.querySelector('.empty-state__acoes a')?.textContent?.trim()).toBe('Novo Plano');
    expect(fixture.nativeElement.querySelector('.alert-danger')).toBeNull();
  });

  it('should keep the error banner when the list fails with a status other than 404', async () => {
    await setup([]);
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component['carregarPlanos']();
    fixture.detectChanges();

    expect(component.erro).toBe('Erro ao carregar planos de tratamento.');
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  describe('inativar', () => {
    beforeEach(async () => setup([mockPlano]));

    it('should open and cancel the confirmation', () => {
      component.confirmarInativar(1);
      expect(component.confirmarInativarId).toBe(1);

      component.cancelarInativar();
      expect(component.confirmarInativarId).toBeNull();
    });

    it('should DELETE the plan and reload the list on success', fakeAsync(() => {
      planoTratamentoServiceSpy.inativar.and.returnValue(of(undefined));
      planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(of([]));

      component.confirmarInativar(1);
      component.inativar();

      expect(planoTratamentoServiceSpy.inativar).toHaveBeenCalledWith(1);
      expect(planoTratamentoServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(2);
      expect(component.planos).toEqual([]);
      expect(component.confirmarInativarId).toBeNull();
      expect(component.sucesso).toBe('Plano de tratamento inativado com sucesso.');
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));

    it('should set erro when inativar fails', () => {
      planoTratamentoServiceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));

      component.confirmarInativar(1);
      component.inativar();

      expect(component.erro).toBe('Erro ao inativar plano de tratamento.');
      expect(component.acaoEmAndamento).toBeFalse();
      expect(component.confirmarInativarId).toBeNull();
    });

    it('should not call service without a pending confirmation', () => {
      component.inativar();

      expect(planoTratamentoServiceSpy.inativar).not.toHaveBeenCalled();
    });

    it('should block duplicate requests while one is pending', () => {
      const pending = new Subject<void>();
      planoTratamentoServiceSpy.inativar.and.returnValue(pending.asObservable());

      component.confirmarInativar(1);
      component.inativar();
      component.inativar();
      component.cancelarInativar();

      expect(planoTratamentoServiceSpy.inativar).toHaveBeenCalledTimes(1);
      expect(component.acaoEmAndamento).toBeTrue();
      expect(component.confirmarInativarId).toBe(1);

      pending.next();
      pending.complete();

      expect(component.acaoEmAndamento).toBeFalse();
    });
  });

  // O card usava `--surface`, `--c-primary` e `--radius-lg`, que nunca foram
  // definidos em `_tokens.scss`: o fundo não era pintado, a borda de destaque
  // caía para `currentColor` (faixa creme de 4px no tema escuro) e o
  // raio para `0` (issue #213). O guard trava os nomes que existem de fato.
  it('should paint the card with real tokens in both themes', async () => {
    await setup([mockPlano]);
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const card = (fixture.nativeElement as HTMLElement)
        .querySelector('.plano-card') as HTMLElement;

      expect(getComputedStyle(card).borderRadius).toBe('8px');

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(55, 79, 108)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(24, 34, 48)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(168, 188, 202)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });

});
