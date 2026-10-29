import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { PacienteDetailComponent } from './paciente-detail.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { UserRole } from '../../../core/models/auth';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../../core/models/plano';
import { AuthService } from '../../../core/services/auth.service';
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
  ativo: true
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

describe('PacienteDetailComponent', () => {
  let component: PacienteDetailComponent;
  let fixture: ComponentFixture<PacienteDetailComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;
  let planoServiceSpy: jasmine.SpyObj<PlanoService>;
  let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
  let router: Router;

  function criarSpiesCobranca(plano: PlanoResponseDTO | null, pagamentos: PagamentoResponseDTO[]) {
    planoServiceSpy = jasmine.createSpyObj('PlanoService', ['buscarAtivo']);
    planoServiceSpy.buscarAtivo.and.returnValue(of(plano));
    pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['listar']);
    pagamentoServiceSpy.listar.and.returnValue(of(pagamentos));
  }

  function authFake(roles: readonly UserRole[]) {
    return { hasAnyRole: (aceitos: readonly UserRole[]) => aceitos.some(r => roles.includes(r)) };
  }

  function setup(
    paciente: PacienteResponseDTO = mockPacienteAtivo,
    roles: readonly UserRole[] = ['PROFISSIONAL'],
    plano: PlanoResponseDTO | null = null,
    pagamentos: PagamentoResponseDTO[] = []
  ) {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'ativar', 'inativar']);
    serviceSpy.buscar.and.returnValue(of(paciente));
    criarSpiesCobranca(plano, pagamentos);

    TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: PlanoService, useValue: planoServiceSpy },
        { provide: PagamentoService, useValue: pagamentoServiceSpy },
        { provide: AuthService, useValue: authFake(roles) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('with active patient', () => {
    beforeEach(() => setup(mockPacienteAtivo));

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
    beforeEach(() => setup(mockPacienteInativo));

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
    beforeEach(() => setup(mockPacienteAtivo));

    it('should set erro when buscar fails', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Paciente não encontrado.');
      expect(component.loading).toBeFalse();
    });
  });

  it('should not call buscar when id route param is invalid', () => {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'ativar', 'inativar']);
    criarSpiesCobranca(null, []);

    TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: PlanoService, useValue: planoServiceSpy },
        { provide: PagamentoService, useValue: pagamentoServiceSpy },
        { provide: AuthService, useValue: authFake(['ADMIN']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } }
      ]
    });

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should not fire a second inativar request while the action is in progress', () => {
    setup(mockPacienteAtivo);
    const pending = new Subject<void>();
    serviceSpy.inativar.and.returnValue(pending.asObservable());

    component.inativar();
    component.inativar();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();
  });

  describe('bloco Plano e renovação (issue #133)', () => {
    function bloco(): HTMLElement | null {
      return fixture.nativeElement.querySelector('.plano-renovacao');
    }

    function situacaoExibida(): string | null {
      return bloco()?.querySelector('[data-situacao]')?.getAttribute('data-situacao') ?? null;
    }

    it('should not render the block nor call plans/payments for PROFISSIONAL', () => {
      setup(mockPacienteAtivo, ['PROFISSIONAL'], mockPlano, [mockPagamento({})]);
      expect(bloco()).toBeNull();
      expect(planoServiceSpy.buscarAtivo).not.toHaveBeenCalled();
      expect(pagamentoServiceSpy.listar).not.toHaveBeenCalled();
      expect(component.situacaoPlano).toBeNull();
    });

    for (const papel of ['ADMIN', 'RECEPCAO', 'FINANCEIRO'] as const) {
      it(`should render the block for ${papel}`, () => {
        setup(mockPacienteAtivo, [papel], mockPlano, [mockPagamento({ periodoFim: somarDias(hojeIso(), 40) })]);
        expect(bloco()).not.toBeNull();
        expect(planoServiceSpy.buscarAtivo).toHaveBeenCalledWith(1);
        expect(pagamentoServiceSpy.listar).toHaveBeenCalledWith(1);
        expect(situacaoExibida()).toBe('PAGO');
      });
    }

    it('should show "Sem plano ativo" without fetching payments when the API answers 204', () => {
      setup(mockPacienteAtivo, ['RECEPCAO'], null);
      expect(situacaoExibida()).toBe('SEM_PLANO');
      expect(bloco()?.textContent).toContain('Sem plano ativo');
      expect(pagamentoServiceSpy.listar).not.toHaveBeenCalled();
    });

    it('should show "Nenhuma cobrança registrada" when the active plan has no payments', () => {
      setup(mockPacienteAtivo, ['ADMIN'], mockPlano, [mockPagamento({ planoId: 99 })]);
      expect(situacaoExibida()).toBe('SEM_PAGAMENTO');
      expect(bloco()?.textContent).toContain('Nenhuma cobrança registrada');
    });

    it('should show the open charge when the last payment is pending', () => {
      setup(mockPacienteAtivo, ['ADMIN'], mockPlano, [
        mockPagamento({ id: 1 }),
        mockPagamento({ id: 2, status: 'PENDENTE', periodoInicio: '2026-02-01', periodoFim: '2026-02-28' })
      ]);
      expect(situacaoExibida()).toBe('EM_ABERTO');
      expect(bloco()?.textContent).toContain('Cobrança em aberto');
      expect(bloco()?.querySelector('a.btn')).toBeNull();
    });

    it('should offer "Renovar" with prefill query params when the paid period is ending', () => {
      const periodoFim = somarDias(hojeIso(), 5);
      setup(mockPacienteAtivo, ['FINANCEIRO'], mockPlano, [mockPagamento({ periodoFim })]);
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
      setup(mockPacienteAtivo, ['ADMIN'], mockPlano, [mockPagamento({ periodoFim: somarDias(hojeIso(), 16) })]);
      expect(situacaoExibida()).toBe('PAGO');
      expect(bloco()?.textContent).not.toContain('Renovar');
    });

    it('should show an error message when the plan lookup fails', () => {
      setup(mockPacienteAtivo, ['ADMIN'], mockPlano);
      planoServiceSpy.buscarAtivo.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erroSituacao).toBe('Erro ao carregar a situação do plano.');
      expect(component.carregandoSituacao).toBeFalse();
    });
  });
});
