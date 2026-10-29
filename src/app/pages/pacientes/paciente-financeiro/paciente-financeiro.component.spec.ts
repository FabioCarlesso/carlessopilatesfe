import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';
import { PacienteFinanceiroComponent } from './paciente-financeiro.component';
import { UserRole } from '../../../core/models/auth';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AulaResponseDTO, PagamentoResponseDTO, PlanoResponseDTO } from '../../../core/models/plano';
import { AulaService } from '../../../core/services/aula.service';
import { AuthService } from '../../../core/services/auth.service';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';

const ANO = new Date().getFullYear();

const paciente: PacienteResponseDTO = {
  version: 0, id: 10, nome: 'Ana Silva', email: 'ana@email.com', cpf: '123.456.789-00',
  telefone: '(11) 99999-9999', dataNascimento: '1990-05-15', endereco: null, ativo: true
};

const planoAtivo: PlanoResponseDTO = {
  id: 3, pacienteId: 10, tipo: 'MENSAL', valor: 320, frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: `${ANO}-02-01`, diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: true, horario: null
};
const planoAntigo: PlanoResponseDTO = { ...planoAtivo, id: 1, ativo: false, valor: 280, dataInicio: `${ANO - 1}-01-01` };

function pagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 3, valor: 320, status: 'PENDENTE',
    dataPagamento: null, dataVencimento: '2999-01-10', periodoInicio: '2999-01-01', periodoFim: '2999-01-31',
    ...parcial
  };
}

const pagamentos: PagamentoResponseDTO[] = [
  pagamento({ id: 1, status: 'PAGO', valor: 300, dataPagamento: `${ANO}-01-05`, dataVencimento: `${ANO}-01-10` }),
  pagamento({ id: 2, status: 'PAGO', valor: 280, dataPagamento: `${ANO - 1}-12-05`, dataVencimento: `${ANO - 1}-12-10` }),
  pagamento({ id: 3, status: 'VENCIDO', valor: 320, dataVencimento: '2000-03-10' }),
  pagamento({ id: 4, status: 'PENDENTE', valor: 320, dataVencimento: '2999-01-10' })
];

const aulas = [
  { id: 1, realizada: true }, { id: 2, realizada: true }, { id: 3, realizada: false }
] as AulaResponseDTO[];

const nfses = [
  { id: 1, competencia: '01/2026', dataEmissao: '2026-02-05', numeroNota: '11', valor: 300 },
  { id: 2, competencia: '02/2026', dataEmissao: '2026-03-05', numeroNota: '12', valor: 320 }
] as NotaFiscalEmitidaResponseDTO[];

describe('PacienteFinanceiroComponent', () => {
  let fixture: ComponentFixture<PacienteFinanceiroComponent>;
  let component: PacienteFinanceiroComponent;
  let pacienteSpy: jasmine.SpyObj<PacienteService>;
  let planoSpy: jasmine.SpyObj<PlanoService>;
  let pagamentoSpy: jasmine.SpyObj<PagamentoService>;
  let aulaSpy: jasmine.SpyObj<AulaService>;
  let nfseSpy: jasmine.SpyObj<NfseEmitidaService>;

  interface Opcoes {
    id?: string;
    papeis?: UserRole[];
    paciente?: Observable<PacienteResponseDTO>;
    pagamentos?: Observable<PagamentoResponseDTO[]>;
    aulas?: Observable<AulaResponseDTO[]>;
    planoAtivo?: PlanoResponseDTO | null;
    planos?: Observable<PlanoResponseDTO[]>;
  }

  function criar(opcoes: Opcoes = {}): HTMLElement {
    const papeis = opcoes.papeis ?? ['ADMIN'];
    pacienteSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    pacienteSpy.buscar.and.returnValue(opcoes.paciente ?? of(paciente));
    planoSpy = jasmine.createSpyObj('PlanoService', ['buscarAtivo', 'listar']);
    planoSpy.buscarAtivo.and.returnValue(of(opcoes.planoAtivo === undefined ? planoAtivo : opcoes.planoAtivo));
    planoSpy.listar.and.returnValue(opcoes.planos ?? of([planoAntigo, planoAtivo]));
    pagamentoSpy = jasmine.createSpyObj('PagamentoService', ['listar']);
    pagamentoSpy.listar.and.returnValue(opcoes.pagamentos ?? of(pagamentos));
    aulaSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente']);
    aulaSpy.listarPorPaciente.and.returnValue(opcoes.aulas ?? of(aulas));
    nfseSpy = jasmine.createSpyObj('NfseEmitidaService', ['listarPorPaciente']);
    nfseSpy.listarPorPaciente.and.returnValue(of(nfses));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAnyRole']);
    authSpy.hasAnyRole.and.callFake((roles: readonly UserRole[]) => roles.some(r => papeis.includes(r)));

    TestBed.configureTestingModule({
      imports: [PacienteFinanceiroComponent],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: PacienteService, useValue: pacienteSpy },
        { provide: PlanoService, useValue: planoSpy },
        { provide: PagamentoService, useValue: pagamentoSpy },
        { provide: AulaService, useValue: aulaSpy },
        { provide: NfseEmitidaService, useValue: nfseSpy },
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: opcoes.id ?? '10' }) } }
        }
      ]
    });
    fixture = TestBed.createComponent(PacienteFinanceiroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function texto(el: Element | null): string {
    return normalizarEspacos(el?.textContent).replace(/\s+/g, ' ').trim();
  }

  function total(el: HTMLElement, situacao: string): string {
    const bloco = el.querySelector(`[data-situacao="${situacao}"]`);
    return Array.from(bloco?.children ?? []).map(span => texto(span)).join(' ');
  }

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(PacienteFinanceiroComponent)).toBeTrue();
  });

  it('should show "Identificador inválido." without calling the API for an invalid route id', () => {
    const el = criar({ id: 'abc' });
    expect(texto(el.querySelector('.alert-danger'))).toBe('Identificador inválido.');
    expect(pacienteSpy.buscar).not.toHaveBeenCalled();
    expect(planoSpy.listar).not.toHaveBeenCalled();
    expect(pagamentoSpy.listar).not.toHaveBeenCalled();
    expect(aulaSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(nfseSpy.listarPorPaciente).not.toHaveBeenCalled();
  });

  it('should show an error and skip the sections when the patient is not found', () => {
    const el = criar({ paciente: throwError(() => new Error('404')) });
    expect(texto(el.querySelector('.alert-danger'))).toBe('Paciente não encontrado.');
    expect(pagamentoSpy.listar).not.toHaveBeenCalled();
    expect(el.querySelector('.financeiro-grid')).toBeNull();
  });

  it('should show a loading state while the patient is loading', () => {
    const el = criar({ paciente: new Subject<PacienteResponseDTO>() });
    expect(texto(el.querySelector('.loading'))).toBe('Carregando...');
  });

  it('should load every section of the patient for a user with all the areas', () => {
    criar();
    expect(planoSpy.buscarAtivo).toHaveBeenCalledWith(10);
    expect(planoSpy.listar).toHaveBeenCalledWith(10);
    expect(pagamentoSpy.listar).toHaveBeenCalledWith(10);
    expect(aulaSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(nfseSpy.listarPorPaciente).toHaveBeenCalledWith(10);
  });

  it('should show the patient name in the header', () => {
    const el = criar();
    expect(texto(el.querySelector('.page-subtitle'))).toBe('Ana Silva');
  });

  describe('payments', () => {
    it('should total each payment situation', () => {
      const el = criar();
      expect(total(el, 'PAGO')).toBe('Pago R$ 580,00 2 pagamentos');
      expect(total(el, 'PENDENTE')).toBe('Pendente R$ 320,00 1 pagamento');
      expect(total(el, 'VENCIDO')).toBe('Vencido R$ 320,00 1 pagamento');
    });

    it('should sum only what was paid in the current year', () => {
      const el = criar();
      expect(total(el, 'ANO')).toBe(`Pago em ${ANO} R$ 300,00 pela data do pagamento`);
    });

    it('should count a pending payment past its due date as overdue', () => {
      const el = criar({
        pagamentos: of([pagamento({ id: 9, status: 'PENDENTE', valor: 150, dataVencimento: '2001-01-10' })])
      });
      expect(total(el, 'VENCIDO')).toBe('Vencido R$ 150,00 1 pagamento');
      expect(total(el, 'PENDENTE')).toBe('Pendente R$ 0,00 0 pagamentos');
    });

    it('should highlight overdue payments with an alert and a marked row', () => {
      const el = criar();
      const alerta = el.querySelector('[role="alert"]');
      expect(texto(alerta)).toBe('1 pagamento vencido somando R$ 320,00.');

      const linhas = Array.from(el.querySelectorAll('tbody tr'));
      const vencidas = linhas.filter(tr => tr.classList.contains('linha-vencida'));
      expect(vencidas.length).toBe(1);
      expect(texto(vencidas[0].querySelector('.badge'))).toBe('Vencido');
      expect(vencidas[0].querySelector('.badge')!.classList).toContain('badge-vencido');
      expect(texto(vencidas[0].lastElementChild)).toMatch(/^\d+ dias$/);
    });

    it('should list payments from the latest due date and format money and dates', () => {
      const el = criar();
      const primeira = Array.from(el.querySelectorAll('tbody tr')[0].querySelectorAll('td')).map(td => texto(td));
      expect(primeira).toEqual(['Pendente', 'R$ 320,00', '01/01/2999 – 31/01/2999', '10/01/2999', '—', '—']);
      expect(component.pagamentos.map(l => l.pagamento.id)).toEqual([4, 1, 2, 3]);
    });

    it('should not show the overdue alert when nothing is overdue', () => {
      const el = criar({ pagamentos: of([pagamentos[0]]) });
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(el.querySelector('.linha-vencida')).toBeNull();
    });

    it('should show an empty state with zeroed totals for a patient without payments', () => {
      const el = criar({ pagamentos: of([]) });
      expect(texto(el.querySelector('#titulo-pagamentos')!.closest('section')!.querySelector('.empty-state')))
        .toBe('Nenhum pagamento registrado.');
      expect(total(el, 'PAGO')).toBe('Pago R$ 0,00 0 pagamentos');
      expect(el.querySelector('table')).toBeNull();
    });

    it('should show its own error without hiding the other sections', () => {
      const el = criar({ pagamentos: throwError(() => new Error('500')) });
      expect(component.erroPagamentos).toBe('Erro ao carregar os pagamentos.');
      expect(texto(el.querySelector('#titulo-planos')!.closest('section'))).toContain('Plano ativo');
      expect(el.querySelector('app-grafico-proporcao')).toBeTruthy();
    });

    it('should show a loading state while payments load', () => {
      const el = criar({ pagamentos: new Subject<PagamentoResponseDTO[]>() });
      expect(texto(el.querySelector('#titulo-pagamentos')!.closest('section')!.querySelector('.loading')))
        .toBe('Carregando pagamentos...');
    });
  });

  describe('plans', () => {
    it('should show the active plan and the previous ones', () => {
      const el = criar();
      const secao = el.querySelector('#titulo-planos')!.closest('section')!;
      expect(texto(secao.querySelector('.plano-ativo'))).toContain('Mensal · 2x por semana');
      expect(texto(secao.querySelector('.plano-ativo'))).toContain('R$ 320,00');
      const anteriores = secao.querySelectorAll('.planos-anteriores li');
      expect(anteriores.length).toBe(1);
      expect(texto(anteriores[0])).toContain('R$ 280,00');
    });

    it('should say when there is no active plan and list every plan as previous', () => {
      const el = criar({ planoAtivo: null });
      const secao = el.querySelector('#titulo-planos')!.closest('section')!;
      expect(texto(secao.querySelector('.empty-state'))).toBe('Nenhum plano ativo.');
      expect(secao.querySelectorAll('.planos-anteriores li').length).toBe(2);
    });

    it('should show its own error', () => {
      const el = criar({ planos: throwError(() => new Error('500')) });
      expect(texto(el.querySelector('#titulo-planos')!.closest('section')!.querySelector('.alert-danger')))
        .toBe('Erro ao carregar os planos.');
    });
  });

  describe('classes', () => {
    it('should count done and pending classes', () => {
      const el = criar();
      expect(component.aulas).toEqual({ realizadas: 2, pendentes: 1, total: 3 });
      const legenda = texto(el.querySelector('#titulo-aulas')!.closest('section'));
      expect(legenda).toContain('Realizadas');
      expect(legenda).toContain('Pendentes');
    });

    it('should not request classes from a role without access to the schedule', () => {
      const el = criar({ papeis: ['FINANCEIRO'] });
      expect(aulaSpy.listarPorPaciente).not.toHaveBeenCalled();
      expect(el.querySelector('#titulo-aulas')).toBeNull();
    });

    it('should show its own error', () => {
      const el = criar({ aulas: throwError(() => new Error('500')) });
      expect(texto(el.querySelector('#titulo-aulas')!.closest('section')!.querySelector('.alert-danger')))
        .toBe('Erro ao carregar as aulas.');
    });
  });

  describe('NFSE', () => {
    it('should show the latest issued NFSE', () => {
      const el = criar();
      const secao = texto(el.querySelector('#titulo-nfse')!.closest('section'));
      expect(secao).toContain('02/2026');
      expect(secao).toContain('05/03/2026');
      expect(secao).toContain('R$ 320,00');
    });

    it('should not request NFSEs from a role without fiscal access', () => {
      const el = criar({ papeis: ['RECEPCAO'] });
      expect(nfseSpy.listarPorPaciente).not.toHaveBeenCalled();
      expect(el.querySelector('#titulo-nfse')).toBeNull();
      expect(aulaSpy.listarPorPaciente).toHaveBeenCalled();
    });
  });
});
