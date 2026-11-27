import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { PacienteDetailComponent } from './paciente-detail.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { UserRole } from '../../../core/models/auth';
import { AulaResponseDTO, PagamentoResponseDTO, PlanoResponseDTO } from '../../../core/models/plano';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { AuthService } from '../../../core/services/auth.service';
import { AulaService } from '../../../core/services/aula.service';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { hojeIso, somarDias } from '../../../shared/utils/calendario';

const mockPacienteAtivo: PacienteResponseDTO = {
  version: 0,
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true,
  cpfNaNota: false,
  tomadorId: null,
  tomadorNome: null,
  tomadorCpfCnpj: null
};

const mockPacienteInativo: PacienteResponseDTO = { ...mockPacienteAtivo, ativo: false };

const mockPlano: PlanoResponseDTO = {
  id: 7,
  pacienteId: 1,
  tipo: 'MENSAL',
  valor: 250,
  frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-01-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'],
  ativo: true,
  horario: null
};

function mockPagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1,
    pacienteId: 1,
    pacienteNome: 'Ana Silva',
    planoId: 7,
    valor: 250,
    status: 'PAGO',
    dataPagamento: '2026-01-05',
    dataVencimento: '2026-01-11',
    periodoInicio: '2026-01-01',
    periodoFim: '2026-01-31',
    ...parcial
  };
}

function mockAula(parcial: Partial<AulaResponseDTO>): AulaResponseDTO {
  return {
    id: 1,
    pacienteId: 1,
    pacienteNome: 'Ana Silva',
    pagamentoId: 1,
    data: hojeIso(),
    horario: '08:00:00',
    realizada: false,
    ...parcial
  };
}

interface Cenario {
  paciente?: PacienteResponseDTO;
  roles?: readonly UserRole[];
  aba?: string | null;
  plano?: PlanoResponseDTO | null;
  pagamentos?: PagamentoResponseDTO[];
  aulas?: AulaResponseDTO[];
  avaliacoes?: Pick<AvaliacaoFisioterapeuticaResponseDTO, 'dataAvaliacao'>[];
  evolucoes?: Pick<EvolucaoSessaoResponseDTO, 'dataHoraRegistro'>[];
}

describe('PacienteDetailComponent', () => {
  let component: PacienteDetailComponent;
  let fixture: ComponentFixture<PacienteDetailComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;
  let planoServiceSpy: jasmine.SpyObj<PlanoService>;
  let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;
  let avaliacaoServiceSpy: jasmine.SpyObj<AvaliacaoFisioterapeuticaService>;
  let evolucaoServiceSpy: jasmine.SpyObj<EvolucaoSessaoService>;
  let queryParams: BehaviorSubject<ParamMap>;
  let router: Router;

  function authFake(roles: readonly UserRole[]) {
    return { hasAnyRole: (aceitos: readonly UserRole[]) => aceitos.some(r => roles.includes(r)) };
  }

  function criarSpies(cenario: Cenario) {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'ativar', 'inativar']);
    serviceSpy.buscar.and.returnValue(of(cenario.paciente ?? mockPacienteAtivo));
    planoServiceSpy = jasmine.createSpyObj('PlanoService', ['buscarAtivo']);
    planoServiceSpy.buscarAtivo.and.returnValue(of(cenario.plano ?? null));
    pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['listar']);
    pagamentoServiceSpy.listar.and.returnValue(of(cenario.pagamentos ?? []));
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente']);
    aulaServiceSpy.listarPorPaciente.and.returnValue(of(cenario.aulas ?? []));
    avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', ['listarPorPaciente']);
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(
      of((cenario.avaliacoes ?? []) as AvaliacaoFisioterapeuticaResponseDTO[])
    );
    evolucaoServiceSpy = jasmine.createSpyObj('EvolucaoSessaoService', ['listarPorPaciente']);
    evolucaoServiceSpy.listarPorPaciente.and.returnValue(of((cenario.evolucoes ?? []) as EvolucaoSessaoResponseDTO[]));
  }

  function configurar(cenario: Cenario, paramMap: ParamMap) {
    criarSpies(cenario);
    queryParams = new BehaviorSubject(convertToParamMap(cenario.aba ? { aba: cenario.aba } : {}));

    TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: PlanoService, useValue: planoServiceSpy },
        { provide: PagamentoService, useValue: pagamentoServiceSpy },
        { provide: AulaService, useValue: aulaServiceSpy },
        { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
        { provide: EvolucaoSessaoService, useValue: evolucaoServiceSpy },
        { provide: AuthService, useValue: authFake(cenario.roles ?? ['PROFISSIONAL']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap }, queryParamMap: queryParams.asObservable() } }
      ]
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function setup(cenario: Cenario = {}) {
    configurar(cenario, convertToParamMap({ id: '1' }));
  }

  /** Simula a navegação que `selecionarAba` (ou o voltar do navegador) produziria. */
  function irParaUrl(aba: string | null) {
    queryParams.next(convertToParamMap(aba ? { aba } : {}));
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rotulosDasAbas(): string[] {
    return Array.from(el().querySelectorAll('[role="tab"]')).map(t => t.textContent?.trim() ?? '');
  }

  function abaSelecionada(): string | null {
    return el().querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null;
  }

  function painel(): HTMLElement | null {
    return el().querySelector('[role="tabpanel"]');
  }

  function atalhos(): string[] {
    return Array.from(el().querySelectorAll('a.link-card span:last-child')).map(a => a.textContent?.trim() ?? '');
  }

  function resumo(chave: string): string {
    return el().querySelector(`[data-resumo="${chave}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  describe('nota fiscal (#287)', () => {
    function secaoNotaFiscal(): string {
      const secoes = Array.from(el().querySelectorAll('.detail-section'));
      return secoes.find(sec => sec.querySelector('h2')?.textContent?.trim() === 'Nota fiscal')?.textContent ?? '';
    }

    it('should show that the patient does not want CPF on the invoice', () => {
      setup();
      expect(secaoNotaFiscal()).toContain('Não');
      expect(secaoNotaFiscal()).not.toContain('Tomador');
    });

    it('should show the tomador when the invoice goes to someone else', () => {
      setup({ paciente: { ...mockPacienteAtivo, cpfNaNota: true, tomadorId: 9, tomadorNome: 'Empresa Ltda', tomadorCpfCnpj: '11222333000181' } });
      expect(secaoNotaFiscal()).toContain('Sim');
      expect(secaoNotaFiscal()).toContain('Empresa Ltda — 11.222.333/0001-81');
    });

    it('should flag the pendencia when CPF is wanted but missing', () => {
      setup({ paciente: { ...mockPacienteAtivo, cpf: null, cpfNaNota: true } });
      expect(secaoNotaFiscal()).toContain('Sem CPF cadastrado');
    });
  });

  describe('fisioterapeuta padrão (issue #300)', () => {
    const comPadrao: PacienteResponseDTO = { ...mockPacienteAtivo, profissionalPadraoId: 3, profissionalPadraoNome: 'Carla Fisio' };

    function campoPadrao(): HTMLElement {
      return el().querySelector('[data-campo="profissional-padrao"]') as HTMLElement;
    }

    it('should link the default professional for the admin', () => {
      setup({ paciente: comPadrao, roles: ['ADMIN'] });
      const link = campoPadrao().querySelector('a');
      expect(link?.textContent?.trim()).toBe('Carla Fisio');
      expect(link?.getAttribute('href')).toBe('/profissionais/3');
    });

    // A rota do profissional é só do ADMIN: o link levaria os demais ao 403.
    it('should show the name without link for the other roles', () => {
      setup({ paciente: comPadrao, roles: ['RECEPCAO'] });
      expect(campoPadrao().querySelector('a')).toBeNull();
      expect(campoPadrao().textContent).toContain('Carla Fisio');
    });

    it('should say when there is no default', () => {
      setup({ roles: ['ADMIN'] });
      expect(campoPadrao().textContent).toContain('Sem padrão');
    });
  });

  describe('with active patient', () => {
    beforeEach(() => setup());

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load patient by id on init', () => {
      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.paciente).toEqual(mockPacienteAtivo);
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should initialize confirmarInativar and confirmarAtivar as false', () => {
      expect(component.confirmarInativar).toBeFalse();
      expect(component.confirmarAtivar).toBeFalse();
    });

    it('should call inativar service and navigate to /pacientes on success', () => {
      serviceSpy.inativar.and.returnValue(of(undefined));
      component.inativar();
      expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should set erro when inativar fails', () => {
      serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
      component.inativar();
      expect(component.erro).toBe('Erro ao inativar paciente.');
    });

    it('should not call inativar service when paciente is null', () => {
      component.paciente = null;
      component.inativar();
      expect(serviceSpy.inativar).not.toHaveBeenCalled();
    });
  });

  describe('with inactive patient', () => {
    beforeEach(() => setup({ paciente: mockPacienteInativo }));

    it('should load inactive patient', () => {
      expect(component.paciente?.ativo).toBeFalse();
    });

    it('should call ativar service and navigate to /pacientes on success', () => {
      serviceSpy.ativar.and.returnValue(of(undefined));
      component.ativar();
      expect(serviceSpy.ativar).toHaveBeenCalledWith(1);
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should set erro when ativar fails', () => {
      serviceSpy.ativar.and.returnValue(throwError(() => new Error('fail')));
      component.ativar();
      expect(component.erro).toBe('Erro ao ativar paciente.');
    });

    it('should not call ativar service when paciente is null', () => {
      component.paciente = null;
      component.ativar();
      expect(serviceSpy.ativar).not.toHaveBeenCalled();
    });
  });

  describe('load error', () => {
    beforeEach(() => setup());

    it('should set erro when buscar fails', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Paciente não encontrado.');
      expect(component.loading).toBeFalse();
    });
  });

  it('should not call buscar nor any summary when id route param is invalid', () => {
    configurar({ roles: ['ADMIN'] }, convertToParamMap({ id: 'abc' }));

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.buscar).not.toHaveBeenCalled();
    expect(avaliacaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(component.aba).toBeNull();
  });

  it('should not fire a second inativar request while the action is in progress', () => {
    setup();
    const pending = new Subject<void>();
    serviceSpy.inativar.and.returnValue(pending.asObservable());

    component.inativar();
    component.inativar();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();
  });

  describe('áreas do paciente (issue #301)', () => {
    it('should show the three areas for ADMIN, opening Clínico by default', () => {
      setup({ roles: ['ADMIN'] });
      expect(rotulosDasAbas()).toEqual(['Clínico', 'Agenda', 'Financeiro']);
      expect(abaSelecionada()).toBe('Clínico');
      expect(painel()?.id).toBe('painel-clinico');
      expect(painel()?.getAttribute('aria-labelledby')).toBe('aba-clinico');
    });

    it('should wire the tabs with the WAI-ARIA attributes', () => {
      setup({ roles: ['ADMIN'], aba: 'agenda' });
      const abas = Array.from(el().querySelectorAll<HTMLElement>('[role="tab"]'));
      expect(el().querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Áreas do paciente');
      expect(abas.map(a => a.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
      expect(abas.map(a => a.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
      expect(abas[1].getAttribute('aria-controls')).toBe('painel-agenda');
      expect(abas[0].getAttribute('aria-controls')).toBeNull();
    });

    it('should keep every shortcut inside an area, 14 in all for ADMIN', () => {
      setup({ roles: ['ADMIN'] });
      const vistos: string[] = [];
      for (const aba of ['clinico', 'agenda', 'financeiro']) {
        irParaUrl(aba);
        const links = Array.from(el().querySelectorAll('a.link-card'));
        expect(links.every(a => a.closest('[role="tabpanel"]') !== null)).toBeTrue();
        vistos.push(...atalhos());
      }
      expect(vistos).toEqual([
        'Avaliação', 'Anamnese', 'Avaliação Fisioterapêutica', 'Análise Postural', 'Plano de Tratamento', 'Reavaliações',
        'Histórico de Evoluções',
        'Aulas', 'Atendimentos', 'Calendário',
        'Financeiro do paciente', 'Planos', 'Pagamentos', 'NFSEs Emitidas'
      ]);
      expect(el().querySelector('.links-section')).toBeNull();
    });

    it('should open the area given by the URL', () => {
      setup({ roles: ['ADMIN'], aba: 'financeiro' });
      expect(abaSelecionada()).toBe('Financeiro');
      expect(painel()?.id).toBe('painel-financeiro');
    });

    it('should fall back to the default area when the URL value is invalid', () => {
      setup({ roles: ['ADMIN'], aba: 'xyz' });
      expect(abaSelecionada()).toBe('Clínico');
    });

    it('should fall back to the default when the URL names an area the role cannot reach', () => {
      setup({ roles: ['RECEPCAO'], aba: 'clinico' });
      expect(abaSelecionada()).toBe('Agenda');
      expect(avaliacaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
    });

    it('should write the chosen tab to the URL on click', () => {
      setup({ roles: ['ADMIN'] });
      const agenda = el().querySelector<HTMLButtonElement>('#aba-agenda')!;
      agenda.click();
      expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
        queryParams: { aba: 'agenda' },
        queryParamsHandling: 'merge'
      }));
    });

    it('should not navigate when the open tab is clicked again', () => {
      setup({ roles: ['ADMIN'] });
      el().querySelector<HTMLButtonElement>('#aba-clinico')!.click();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should follow the URL on browser back/forward', () => {
      setup({ roles: ['ADMIN'], aba: 'agenda' });
      irParaUrl('financeiro');
      expect(abaSelecionada()).toBe('Financeiro');
      irParaUrl(null);
      expect(abaSelecionada()).toBe('Clínico');
    });

    it('should move between tabs with arrows, Home and End, taking focus along', () => {
      setup({ roles: ['ADMIN'] });
      const clinico = el().querySelector<HTMLButtonElement>('#aba-clinico')!;
      const agenda = el().querySelector<HTMLButtonElement>('#aba-agenda')!;
      const navigate = router.navigate as jasmine.Spy;

      clinico.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ aba: 'agenda' });
      expect(document.activeElement).toBe(agenda);

      clinico.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ aba: 'financeiro' });

      clinico.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ aba: 'financeiro' });

      irParaUrl('financeiro');
      el().querySelector('#aba-financeiro')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ aba: 'clinico' });

      const chamadas = navigate.calls.count();
      clinico.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(navigate.calls.count()).toBe(chamadas);
    });

    it('should load each summary only when its area is first opened', () => {
      setup({ roles: ['ADMIN'] });
      expect(avaliacaoServiceSpy.listarPorPaciente).toHaveBeenCalledOnceWith(1);
      expect(evolucaoServiceSpy.listarPorPaciente).toHaveBeenCalledOnceWith(1);
      expect(aulaServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
      expect(planoServiceSpy.buscarAtivo).not.toHaveBeenCalled();
      expect(pagamentoServiceSpy.listar).not.toHaveBeenCalled();

      irParaUrl('agenda');
      expect(aulaServiceSpy.listarPorPaciente).toHaveBeenCalledOnceWith(1);

      irParaUrl('clinico');
      irParaUrl('agenda');
      expect(avaliacaoServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
      expect(aulaServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
    });

    describe('atalhos por papel', () => {
      it('should show Clínico and Agenda, without Financeiro, for PROFISSIONAL', () => {
        setup({ roles: ['PROFISSIONAL'] });
        expect(rotulosDasAbas()).toEqual(['Clínico', 'Agenda']);
        irParaUrl('financeiro');
        expect(abaSelecionada()).toBe('Clínico');
        expect(planoServiceSpy.buscarAtivo).not.toHaveBeenCalled();
        expect(pagamentoServiceSpy.listar).not.toHaveBeenCalled();
      });

      it('should show Agenda and Financeiro without NFSE for RECEPCAO', () => {
        setup({ roles: ['RECEPCAO'] });
        expect(rotulosDasAbas()).toEqual(['Agenda', 'Financeiro']);
        expect(abaSelecionada()).toBe('Agenda');
        expect(atalhos()).toEqual(['Aulas', 'Atendimentos', 'Calendário']);
        irParaUrl('financeiro');
        expect(atalhos()).toEqual(['Financeiro do paciente', 'Planos', 'Pagamentos']);
      });

      it('should show only Financeiro, with NFSE, for FINANCEIRO', () => {
        setup({ roles: ['FINANCEIRO'] });
        expect(rotulosDasAbas()).toEqual(['Financeiro']);
        expect(atalhos()).toEqual(['Financeiro do paciente', 'Planos', 'Pagamentos', 'NFSEs Emitidas']);
        expect(aulaServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
        expect(avaliacaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
      });

      it('should not render any area for a role without access to them', () => {
        setup({ roles: ['PACIENTE'] });
        expect(el().querySelector('[role="tablist"]')).toBeNull();
        expect(atalhos()).toEqual([]);
      });

      it('should point the main Financeiro shortcut to the consolidated screen', () => {
        setup({ roles: ['RECEPCAO'], aba: 'financeiro' });
        const link = el().querySelector<HTMLAnchorElement>('a.link-card--principal');
        expect(link?.textContent).toContain('Financeiro do paciente');
        expect(link?.getAttribute('href')).toBe('/pacientes/1/financeiro');
      });
    });

    describe('resumo clínico', () => {
      it('should show the dates of the last assessment and evolution', () => {
        setup({
          roles: ['PROFISSIONAL'],
          avaliacoes: [{ dataAvaliacao: '2026-03-01' }, { dataAvaliacao: '2026-09-10' }],
          evolucoes: [{ dataHoraRegistro: '2026-10-20T08:30:00' }]
        });
        expect(resumo('ultima-avaliacao')).toContain('10/09/2026');
        expect(resumo('ultima-evolucao')).toContain('20/10/2026');
      });

      it('should say there is nothing yet for a brand-new patient', () => {
        setup({ roles: ['PROFISSIONAL'] });
        expect(resumo('ultima-avaliacao')).toContain('Nenhuma avaliação registrada');
        expect(resumo('ultima-evolucao')).toContain('Nenhuma evolução registrada');
      });

      it('should show an error when the summary fails', () => {
        setup({ roles: ['PROFISSIONAL'], aba: 'agenda' });
        evolucaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));
        irParaUrl('clinico');
        expect(el().querySelector('[role="tabpanel"] .alert-danger')?.textContent).toContain('Erro ao carregar o resumo clínico.');
        expect(component.resumoClinico.carregando).toBeFalse();
      });
    });

    describe('resumo da agenda', () => {
      it('should show the next class and the recent absences, ignoring holidays', () => {
        const hoje = hojeIso();
        setup({
          roles: ['RECEPCAO'],
          aulas: [
            mockAula({ id: 1, data: somarDias(hoje, -3) }),
            mockAula({ id: 2, data: somarDias(hoje, -2), feriado: true, realizada: true }),
            mockAula({ id: 3, data: somarDias(hoje, -1), realizada: true }),
            mockAula({ id: 4, data: somarDias(hoje, 2), horario: '18:30:00', profissionalNome: 'Carla' })
          ]
        });
        const proxima = resumo('proxima-aula');
        expect(proxima).toContain(`${somarDias(hoje, 2).split('-').reverse().join('/')} às 18:30`);
        expect(proxima).toContain('Carla');
        const faltas = resumo('faltas-recentes');
        expect(faltas).toContain('Faltas nos últimos 30 dias');
        expect(faltas).toContain(somarDias(hoje, -3).split('-').reverse().join('/'));
        expect(faltas).not.toContain(somarDias(hoje, -2).split('-').reverse().join('/'));
        expect(el().querySelector('[data-resumo="faltas-recentes"] .badge')?.textContent?.trim()).toBe('1');
      });

      it('should show a class without time nor professional', () => {
        setup({ roles: ['RECEPCAO'], aulas: [mockAula({ horario: null })] });
        expect(resumo('proxima-aula')).not.toContain('às');
      });

      it('should say there is nothing yet for a brand-new patient', () => {
        setup({ roles: ['RECEPCAO'] });
        expect(resumo('proxima-aula')).toContain('Nenhuma aula agendada');
        expect(resumo('faltas-recentes')).toContain('Nenhuma falta');
      });

      it('should show an error when the summary fails', () => {
        setup({ roles: ['RECEPCAO'], aba: 'financeiro' });
        aulaServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));
        irParaUrl('agenda');
        expect(painel()?.textContent).toContain('Erro ao carregar o resumo da agenda.');
      });
    });

    describe('resumo financeiro', () => {
      it('should show the active plan, next due date and pending charges', () => {
        const hoje = hojeIso();
        setup({
          roles: ['FINANCEIRO'],
          plano: mockPlano,
          pagamentos: [
            mockPagamento({ id: 1, status: 'VENCIDO', dataVencimento: somarDias(hoje, -20), valor: 100 }),
            mockPagamento({ id: 2, status: 'PENDENTE', dataVencimento: somarDias(hoje, 5), periodoFim: somarDias(hoje, 30) })
          ]
        });
        expect(planoServiceSpy.buscarAtivo).toHaveBeenCalledWith(1);
        expect(pagamentoServiceSpy.listar).toHaveBeenCalledWith(1);
        expect(resumo('plano-ativo')).toContain('Mensal');
        expect(resumo('plano-ativo')).toContain('250');
        expect(resumo('proximo-vencimento')).toContain(somarDias(hoje, 5).split('-').reverse().join('/'));
        const pendencias = resumo('pendencias');
        expect(pendencias).toContain('1 vencida(s)');
        expect(pendencias).toContain('100');
        expect(pendencias).toContain('1 em aberto');
      });

      it('should say there is nothing yet for a brand-new patient', () => {
        setup({ roles: ['FINANCEIRO'] });
        expect(resumo('plano-ativo')).toContain('Sem plano ativo');
        expect(resumo('proximo-vencimento')).toContain('Nenhuma cobrança a vencer');
        expect(resumo('pendencias')).toContain('Nenhuma');
      });

      it('should show an error when the summary fails', () => {
        setup({ roles: ['ADMIN'] });
        planoServiceSpy.buscarAtivo.and.returnValue(throwError(() => new Error('fail')));
        irParaUrl('financeiro');
        expect(component.resumoFinanceiro.erro).toBe('Erro ao carregar o resumo financeiro.');
        expect(component.resumoFinanceiro.carregando).toBeFalse();
        expect(painel()?.querySelector('.alert-danger')).not.toBeNull();
      });
    });

    describe('renovação do plano (issue #133)', () => {
      function bloco(): HTMLElement | null {
        return el().querySelector('.plano-renovacao');
      }

      function situacaoExibida(): string | null {
        return bloco()?.querySelector('[data-situacao]')?.getAttribute('data-situacao') ?? null;
      }

      function setupFinanceiro(plano: PlanoResponseDTO | null, pagamentos: PagamentoResponseDTO[] = []) {
        setup({ roles: ['ADMIN'], aba: 'financeiro', plano, pagamentos });
      }

      it('should offer to create a plan when there is none', () => {
        setupFinanceiro(null);
        expect(situacaoExibida()).toBe('SEM_PLANO');
        expect(bloco()?.querySelector('a')?.getAttribute('href')).toBe('/planos/novo/1');
      });

      it('should show "Nenhuma cobrança registrada" when the active plan has no payments', () => {
        setupFinanceiro(mockPlano, [mockPagamento({ planoId: 99 })]);
        expect(situacaoExibida()).toBe('SEM_PAGAMENTO');
        expect(bloco()?.textContent).toContain('Nenhuma cobrança registrada');
      });

      it('should show the open charge when the last payment is pending', () => {
        setupFinanceiro(mockPlano, [
          mockPagamento({ id: 1 }),
          mockPagamento({ id: 2, status: 'PENDENTE', periodoInicio: '2026-02-01', periodoFim: '2026-02-28' })
        ]);
        expect(situacaoExibida()).toBe('EM_ABERTO');
        expect(bloco()?.textContent).toContain('Cobrança em aberto');
        expect(bloco()?.querySelector('a.btn')).toBeNull();
      });

      it('should offer "Renovar" with prefill query params when the paid period is ending', () => {
        const periodoFim = somarDias(hojeIso(), 5);
        setupFinanceiro(mockPlano, [mockPagamento({ periodoFim })]);
        expect(situacaoExibida()).toBe('RENOVAR');
        expect(bloco()?.textContent).toContain('Plano vence em 5 dias');

        const renovar: HTMLAnchorElement = bloco()!.querySelector('a.btn')!;
        expect(renovar.textContent?.trim()).toBe('Renovar');
        const inicio = somarDias(periodoFim, 1);
        const url = new URL(renovar.href);
        expect(url.pathname).toBe('/pagamentos/novo/1');
        expect(url.searchParams.get('planoId')).toBe('7');
        expect(url.searchParams.get('valor')).toBe('250');
        expect(url.searchParams.get('periodoInicio')).toBe(inicio);
        expect(url.searchParams.get('dataVencimento')).toBe(somarDias(inicio, 10));
      });

      it('should not offer "Renovar" while more than 15 days remain', () => {
        setupFinanceiro(mockPlano, [mockPagamento({ periodoFim: somarDias(hojeIso(), 16) })]);
        expect(situacaoExibida()).toBe('PAGO');
        expect(bloco()?.textContent).not.toContain('Renovar');
      });
    });
  });
});
