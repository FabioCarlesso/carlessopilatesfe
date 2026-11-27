import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';
import { NFSES_NO_BLOCO, PacienteFinanceiroComponent } from './paciente-financeiro.component';
import { UserRole } from '../../../core/models/auth';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../../core/models/plano';
import { AuthService } from '../../../core/services/auth.service';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { CobrancaDialogComponent } from '../../../shared/components/cobranca-dialog/cobranca-dialog.component';
import { PagarPagamentoDialogComponent } from '../../../shared/components/pagar-pagamento-dialog/pagar-pagamento-dialog.component';

/** Quinta-feira, 29/10/2026: fixa o "hoje" do pacote, das situações e do histórico. */
const HOJE = new Date(2026, 9, 29, 9, 0);

const paciente: PacienteResponseDTO = {
  version: 0, id: 10, nome: 'Ana Silva', email: 'ana@email.com', cpf: '123.456.789-00',
  telefone: '(11) 99999-9999', dataNascimento: '1990-05-15', endereco: null, ativo: true,
  cpfNaNota: false, tomadorId: null, tomadorNome: null, tomadorCpfCnpj: null
};

const planoAtivo: PlanoResponseDTO = {
  id: 3, pacienteId: 10, tipo: 'MENSAL', valor: 320, frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-02-01', diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: true, horario: '08:00:00'
};
const planoAntigo: PlanoResponseDTO = {
  ...planoAtivo, id: 1, ativo: false, valor: 280, dataInicio: '2025-01-01', frequenciaSemanal: 'UMA_VEZ',
  diasSemana: ['FRIDAY'], horario: null
};

function pagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 3, valor: 320, status: 'PENDENTE',
    dataPagamento: null, dataVencimento: '2026-11-03', periodoInicio: '2026-10-31', periodoFim: '2026-11-27',
    ...parcial
  };
}

/** Pago no ano anterior, período encerrado: histórico. */
const pagoAnoPassado = pagamento({
  id: 1, status: 'PAGO', valor: 300, dataPagamento: '2025-12-05', dataVencimento: '2025-12-10',
  periodoInicio: '2025-12-01', periodoFim: '2025-12-29', formaPagamento: 'PIX'
});
/** Pago, período encerrado, sem forma (anterior à #132): histórico. */
const pagoSetembro = pagamento({
  id: 2, status: 'PAGO', valor: 300, dataPagamento: '2026-09-05', dataVencimento: '2026-09-10',
  periodoInicio: '2026-09-01', periodoFim: '2026-09-28', formaPagamento: null
});
/** Vencido antigo: continua em aberto, nunca vai para o histórico. */
const vencido = pagamento({
  id: 3, status: 'VENCIDO', valor: 280, dataVencimento: '2026-07-10', periodoInicio: '2026-07-01', periodoFim: '2026-07-28'
});
/** Pago com o período cobrindo hoje: o pacote atual. */
const pacoteEmCurso = pagamento({
  id: 4, status: 'PAGO', valor: 320, dataPagamento: '2026-09-28', dataVencimento: '2026-10-01',
  periodoInicio: '2026-10-01', periodoFim: '2026-10-30', formaPagamento: 'DINHEIRO',
  aulasPacote: 8, aulasRealizadas: 6, aulasSemProfissional: 1
});
/** Renovação gerada pelo job: pendente, começa depois de hoje. */
const renovacao = pagamento({ id: 5, status: 'PENDENTE', valor: 320 });

const pagamentos = [pagoAnoPassado, pagoSetembro, vencido, pacoteEmCurso, renovacao];

function nota(id: number, dataEmissao: string, competencia: string): NotaFiscalEmitidaResponseDTO {
  return {
    id, pacienteId: 10, nomePaciente: 'Ana Silva', competencia, numeroNota: String(100 + id), dataEmissao,
    valor: 320, observacoes: null, dataCriacao: `${dataEmissao}T10:00:00`, dataAtualizacao: null
  };
}

const nfses = [nota(1, '2026-08-05', '07/2026'), nota(3, '2026-10-05', '09/2026'), nota(2, '2026-09-05', '08/2026')];

describe('PacienteFinanceiroComponent', () => {
  let fixture: ComponentFixture<PacienteFinanceiroComponent>;
  let component: PacienteFinanceiroComponent;
  let pacienteSpy: jasmine.SpyObj<PacienteService>;
  let planoSpy: jasmine.SpyObj<PlanoService>;
  let pagamentoSpy: jasmine.SpyObj<PagamentoService>;
  let nfseSpy: jasmine.SpyObj<NfseEmitidaService>;

  interface Opcoes {
    id?: string;
    papeis?: UserRole[];
    paciente?: Observable<PacienteResponseDTO>;
    pagamentos?: Observable<PagamentoResponseDTO[]>;
    planoAtivo?: PlanoResponseDTO | null;
    planos?: Observable<PlanoResponseDTO[]>;
    nfses?: Observable<NotaFiscalEmitidaResponseDTO[]>;
  }

  function criar(opcoes: Opcoes = {}): HTMLElement {
    const papeis = opcoes.papeis ?? ['ADMIN'];
    pacienteSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    pacienteSpy.buscar.and.returnValue(opcoes.paciente ?? of(paciente));
    planoSpy = jasmine.createSpyObj('PlanoService', ['buscarAtivo', 'listar']);
    planoSpy.buscarAtivo.and.returnValue(of(opcoes.planoAtivo === undefined ? planoAtivo : opcoes.planoAtivo));
    planoSpy.listar.and.returnValue(opcoes.planos ?? of([planoAntigo, planoAtivo]));
    pagamentoSpy = jasmine.createSpyObj('PagamentoService', ['listar', 'pagar', 'listarCobrancas', 'registrarCobranca']);
    pagamentoSpy.listar.and.returnValue(opcoes.pagamentos ?? of(pagamentos));
    pagamentoSpy.listarCobrancas.and.returnValue(of([]));
    nfseSpy = jasmine.createSpyObj('NfseEmitidaService', ['listarPorPaciente']);
    nfseSpy.listarPorPaciente.and.returnValue(opcoes.nfses ?? of(nfses));
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
        { provide: NfseEmitidaService, useValue: nfseSpy },
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: opcoes.id ?? '10' }) } }
        }
      ]
    });
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(PacienteFinanceiroComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }
    return fixture.nativeElement as HTMLElement;
  }

  function texto(el: Element | null | undefined): string {
    return normalizarEspacos(el?.textContent).replace(/\s+/g, ' ').trim();
  }

  function secao(el: HTMLElement, titulo: string): HTMLElement {
    return el.querySelector(`#titulo-${titulo}`)!.closest('section') as HTMLElement;
  }

  function total(el: HTMLElement, situacao: string): string {
    const bloco = el.querySelector(`[data-situacao="${situacao}"]`);
    return Array.from(bloco?.children ?? []).map(span => texto(span)).join(' ');
  }

  function linhas(el: HTMLElement, tabela: string): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>(`.${tabela} tbody tr`));
  }

  function linhaDoPagamento(el: HTMLElement, id: number): HTMLElement {
    return el.querySelector(`.tabela-vigentes tr[data-pagamento="${id}"]`) as HTMLElement;
  }

  function hrefs(el: Element): string[] {
    return Array.from(el.querySelectorAll('a')).map(a => a.getAttribute('href') ?? '');
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
    expect(pagamentoSpy.listar).toHaveBeenCalledOnceWith(10);
    expect(nfseSpy.listarPorPaciente).toHaveBeenCalledWith(10);
  });

  it('should show the patient name and the "Financeiro" breadcrumb', () => {
    const el = criar();
    expect(texto(el.querySelector('h1'))).toBe('Financeiro do Paciente');
    expect(texto(el.querySelector('.page-subtitle'))).toBe('Ana Silva');
    expect(texto(el.querySelector('app-breadcrumb'))).toContain('Financeiro');
  });

  it('should gather plan, package, payments, NFSE and history in a single screen', () => {
    const el = criar();
    const titulos = Array.from(el.querySelectorAll('.financeiro-bloco h2')).map(h => texto(h));
    expect(titulos).toEqual(['Plano ativo', 'Pacote atual', 'Pagamentos', 'Notas fiscais', 'Histórico']);
  });

  describe('plano ativo', () => {
    it('should show frequency, days, time, value and start of the active plan', () => {
      const el = criar();
      const bloco = texto(secao(el, 'plano').querySelector('.plano-ativo'));
      expect(bloco).toContain('Mensal');
      expect(bloco).toContain('2x por semana');
      expect(bloco).toContain('Segunda, Quarta');
      expect(bloco).toContain('08:00');
      expect(bloco).toContain('R$ 320,00');
      expect(bloco).toContain('01/02/2026');
    });

    it('should say when the active plan has no time', () => {
      const el = criar({ planoAtivo: { ...planoAtivo, horario: null } });
      expect(texto(secao(el, 'plano').querySelector('.plano-ativo'))).toContain('Sem horário');
    });

    it('should offer to switch the plan through the existing plan form, and the plan list as subscreen', () => {
      const el = criar();
      const bloco = secao(el, 'plano');
      const trocar = Array.from(bloco.querySelectorAll('a')).find(a => texto(a) === 'Trocar plano');
      expect(trocar?.getAttribute('href')).toBe('/planos/novo/10');
      expect(texto(bloco.querySelector('#dica-trocar-plano'))).toContain('inativa o atual');
      expect(hrefs(bloco)).toContain('/planos/paciente/10');
    });

    it('should offer a new plan when there is no active plan', () => {
      const el = criar({ planoAtivo: null });
      const bloco = secao(el, 'plano');
      expect(texto(bloco.querySelector('.empty-state'))).toBe('Nenhum plano ativo.');
      const novo = Array.from(bloco.querySelectorAll('a')).find(a => texto(a) === 'Novo plano');
      expect(novo?.getAttribute('href')).toBe('/planos/novo/10');
    });

    it('should show its own error without hiding the payments', () => {
      const el = criar({ planos: throwError(() => new Error('500')) });
      expect(texto(secao(el, 'plano').querySelector('.alert-danger'))).toBe('Erro ao carregar os planos.');
      expect(linhas(el, 'tabela-vigentes').length).toBe(3);
    });
  });

  describe('pacote atual', () => {
    it('should show "X de N" with the numbers from the API and the last class date', () => {
      const el = criar();
      const bloco = secao(el, 'pacote');
      expect(component.pacote()?.pagamento.id).toBe(4);
      expect(texto(bloco.querySelector('.pacote__situacao'))).toBe('Pacote em curso');
      expect(texto(bloco.querySelector('.pacote__contagem'))).toBe('6 de 8 aulas realizadas no pacote');
      expect(texto(bloco.querySelector('.pacote__ultima-aula'))).toBe('30/10/2026');
      expect(texto(bloco.querySelector('.pacote__detalhes'))).toContain('01/10/2026 – 30/10/2026');
      expect(bloco.querySelector('app-grafico-proporcao')).toBeTruthy();
      expect(component.segmentosPacote().map(s => s.valor)).toEqual([6, 2]);
    });

    it('should warn about classes of the package without a professional', () => {
      const el = criar();
      expect(texto(secao(el, 'pacote').querySelector('.aviso-sem-profissional'))).toBe('1 aula sem profissional');
    });

    it('should keep the period but omit the count when the API does not send the package fields', () => {
      const semCampos = { ...pacoteEmCurso, aulasPacote: undefined, aulasRealizadas: undefined, aulasSemProfissional: undefined };
      const el = criar({ pagamentos: of([semCampos]) });
      const bloco = secao(el, 'pacote');
      expect(bloco.querySelector('.pacote__contagem')).toBeNull();
      expect(bloco.querySelector('app-grafico-proporcao')).toBeNull();
      expect(bloco.querySelector('.aviso-sem-profissional')).toBeNull();
      expect(texto(bloco.querySelector('.pacote__ultima-aula'))).toBe('30/10/2026');
    });

    it('should fall back to the latest package already started when none covers today', () => {
      const el = criar({ pagamentos: of([pagoAnoPassado, { ...pagoSetembro, aulasPacote: 8, aulasRealizadas: 8 }]) });
      const bloco = secao(el, 'pacote');
      expect(component.pacote()?.pagamento.id).toBe(2);
      expect(texto(bloco.querySelector('.pacote__situacao'))).toBe('Último pacote, já encerrado');
      expect(texto(bloco.querySelector('.pacote__contagem'))).toBe('8 de 8 aulas realizadas no pacote');
    });

    it('should show the next package when none started yet', () => {
      const el = criar({ pagamentos: of([{ ...renovacao, aulasPacote: 1, aulasRealizadas: 0 }]) });
      const bloco = secao(el, 'pacote');
      expect(texto(bloco.querySelector('.pacote__situacao'))).toBe('Próximo pacote, ainda não iniciado');
      expect(texto(bloco.querySelector('.pacote__contagem'))).toBe('0 de 1 aula realizada no pacote');
    });

    it('should say when there is no package', () => {
      const el = criar({ pagamentos: of([]) });
      expect(texto(secao(el, 'pacote').querySelector('.empty-state'))).toBe('Nenhum pacote: o paciente ainda não tem pagamentos.');
    });

    it('should link to the classes of the package only for who reaches the schedule', () => {
      expect(hrefs(secao(criar(), 'pacote'))).toContain('/aulas/pagamento/4');
      TestBed.resetTestingModule();
      expect(hrefs(secao(criar({ papeis: ['FINANCEIRO'] }), 'pacote'))).not.toContain('/aulas/pagamento/4');
    });

    it('should show loading and error states of its own', () => {
      let el = criar({ pagamentos: new Subject<PagamentoResponseDTO[]>() });
      expect(texto(secao(el, 'pacote').querySelector('.loading'))).toBe('Carregando pacote...');
      TestBed.resetTestingModule();
      el = criar({ pagamentos: throwError(() => new Error('500')) });
      expect(texto(secao(el, 'pacote').querySelector('.alert-danger'))).toBe('Erro ao carregar o pacote.');
    });
  });

  describe('pagamentos', () => {
    it('should total each payment situation', () => {
      const el = criar();
      expect(total(el, 'PAGO')).toBe('Pago R$ 920,00 3 pagamentos');
      expect(total(el, 'PENDENTE')).toBe('Pendente R$ 320,00 1 pagamento');
      expect(total(el, 'VENCIDO')).toBe('Vencido R$ 280,00 1 pagamento');
    });

    it('should sum only what was paid in the current year', () => {
      const el = criar();
      expect(total(el, 'ANO')).toBe('Pago em 2026 R$ 620,00 pela data do pagamento');
    });

    it('should list open and current payments, latest due date first, leaving ended paid ones to the history', () => {
      const el = criar();
      expect(linhas(el, 'tabela-vigentes').map(tr => tr.dataset['pagamento'])).toEqual(['5', '4', '3']);
      const primeira = Array.from(linhas(el, 'tabela-vigentes')[0].querySelectorAll('td')).slice(0, 6).map(td => texto(td));
      expect(primeira).toEqual(['Pendente', 'R$ 320,00', '31/10/2026 – 27/11/2026', '03/11/2026', '—', '—']);
    });

    it('should highlight overdue payments with an alert and a marked row', () => {
      const el = criar();
      const alerta = secao(el, 'pagamentos').querySelector('[role="alert"]');
      expect(texto(alerta)).toBe('1 pagamento vencido somando R$ 280,00.');
      const vencida = linhaDoPagamento(el, 3);
      expect(vencida.classList).toContain('linha-vencida');
      expect(texto(vencida.querySelector('.badge'))).toBe('Vencido');
      expect(texto(vencida.querySelectorAll('td')[5])).toBe('111 dias');
    });

    it('should count a pending payment past its due date as overdue', () => {
      const el = criar({ pagamentos: of([pagamento({ id: 9, status: 'PENDENTE', valor: 150, dataVencimento: '2026-10-20' })]) });
      expect(total(el, 'VENCIDO')).toBe('Vencido R$ 150,00 1 pagamento');
      expect(total(el, 'PENDENTE')).toBe('Pendente R$ 0,00 0 pagamentos');
    });

    it('should warn about classes without a professional in the row', () => {
      const el = criar();
      expect(texto(linhaDoPagamento(el, 4).querySelector('.aviso-sem-profissional'))).toBe('1 aula sem profissional');
      expect(linhaDoPagamento(el, 5).querySelector('.aviso-sem-profissional')).toBeNull();
    });

    it('should show an empty state with zeroed totals for a patient without payments', () => {
      const el = criar({ pagamentos: of([]) });
      expect(texto(secao(el, 'pagamentos').querySelector('.empty-state'))).toBe('Nenhum pagamento em aberto ou vigente.');
      expect(total(el, 'PAGO')).toBe('Pago R$ 0,00 0 pagamentos');
      expect(el.querySelector('.tabela-vigentes')).toBeNull();
    });

    it('should show its own error without hiding the other sections', () => {
      const el = criar({ pagamentos: throwError(() => new Error('500')) });
      expect(texto(secao(el, 'pagamentos').querySelector('.alert-danger'))).toBe('Erro ao carregar os pagamentos.');
      expect(texto(secao(el, 'plano'))).toContain('2x por semana');
      expect(linhas(el, 'tabela-nfse').length).toBe(3);
    });

    it('should show a loading state while payments load', () => {
      const el = criar({ pagamentos: new Subject<PagamentoResponseDTO[]>() });
      expect(texto(secao(el, 'pagamentos').querySelector('.loading'))).toBe('Carregando pagamentos...');
    });

    it('should keep the payment list and the new payment form as subscreens', () => {
      const el = criar();
      expect(hrefs(secao(el, 'pagamentos'))).toEqual(jasmine.arrayContaining(['/pagamentos/novo/10', '/pagamentos/paciente/10']));
    });

    describe('ações por papel', () => {
      function acoes(el: HTMLElement, id: number): string[] {
        return Array.from(linhaDoPagamento(el, id).querySelectorAll('.acoes .btn')).map(b => texto(b));
      }

      it('should give ADMIN pay, billing contact and classes', () => {
        const el = criar();
        expect(acoes(el, 5)).toEqual(['Confirmar pagamento', 'Cobrança', 'Ver aulas']);
        expect(acoes(el, 4)).toEqual(['Ver aulas']);
        // VENCIDO gravado não oferece a confirmação, exatamente como a lista de pagamentos.
        expect(acoes(el, 3)).toEqual(['Cobrança', 'Ver aulas']);
      });

      it('should give RECEPCAO pay and classes, without the ADMIN-only billing contact', () => {
        const el = criar({ papeis: ['RECEPCAO'] });
        expect(acoes(el, 5)).toEqual(['Confirmar pagamento', 'Ver aulas']);
        expect(acoes(el, 3)).toEqual(['Ver aulas']);
      });

      it('should give FINANCEIRO only pay, without classes nor billing contact', () => {
        const el = criar({ papeis: ['FINANCEIRO'] });
        expect(acoes(el, 5)).toEqual(['Confirmar pagamento']);
        expect(acoes(el, 3)).toEqual([]);
      });

      it('should name each row action with its due date', () => {
        const el = criar();
        expect(linhaDoPagamento(el, 5).querySelector('.acao-pagar')?.getAttribute('aria-label'))
          .toBe('Confirmar pagamento com vencimento em 03/11/2026');
        expect(linhaDoPagamento(el, 3).querySelector('.acao-cobranca')?.getAttribute('aria-label'))
          .toBe('Cobrança do pagamento com vencimento em 10/07/2026');
      });
    });

    describe('confirmar pagamento', () => {
      function abrirPagar(el: HTMLElement): PagarPagamentoDialogComponent {
        (linhaDoPagamento(el, 5).querySelector('.acao-pagar') as HTMLButtonElement).click();
        fixture.detectChanges();
        return fixture.debugElement.query(By.directive(PagarPagamentoDialogComponent)).componentInstance;
      }

      it('should confirm through the shared dialog, show the success and reload the payments', () => {
        const el = criar();
        pagamentoSpy.pagar.and.returnValue(of({ ...renovacao, status: 'PAGO', dataPagamento: '2026-10-29' }));
        const dialogo = abrirPagar(el);
        expect(dialogo.pagamentoId()).toBe(5);

        dialogo.form.setValue({ dataPagamento: '2026-10-29', formaPagamento: 'PIX' });
        (el.querySelector('.dialog-actions .btn:not(.btn-outline)') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(pagamentoSpy.pagar).toHaveBeenCalledOnceWith(5, '2026-10-29', 'PIX');
        expect(el.querySelector('app-pagar-pagamento-dialog')).toBeNull();
        expect(texto(el.querySelector('.alert-success'))).toBe('Pagamento confirmado com sucesso.');
        expect(pagamentoSpy.listar).toHaveBeenCalledTimes(2);
      });

      it('should show the refusal without hiding the table', () => {
        const el = criar();
        pagamentoSpy.pagar.and.returnValue(throwError(() => new Error('500')));
        const dialogo = abrirPagar(el);
        dialogo.form.setValue({ dataPagamento: '2026-10-29', formaPagamento: null });
        dialogo.confirmar();
        fixture.detectChanges();

        expect(texto(secao(el, 'pagamentos').querySelector('.alert-danger[role="alert"]')))
          .toBe('Erro ao confirmar pagamento.');
        expect(el.querySelector('app-pagar-pagamento-dialog')).toBeNull();
        expect(linhas(el, 'tabela-vigentes').length).toBe(3);
      });

      it('should close the dialog on cancel', () => {
        const el = criar();
        abrirPagar(el);
        (el.querySelector('.dialog-actions .btn-outline') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(el.querySelector('app-pagar-pagamento-dialog')).toBeNull();
        expect(pagamentoSpy.pagar).not.toHaveBeenCalled();
      });
    });

    describe('contato de cobrança', () => {
      function abrirCobranca(el: HTMLElement): CobrancaDialogComponent {
        (linhaDoPagamento(el, 3).querySelector('.acao-cobranca') as HTMLButtonElement).click();
        fixture.detectChanges();
        return fixture.debugElement.query(By.directive(CobrancaDialogComponent)).componentInstance;
      }

      it('should open the shared billing dialog with the payment and its days overdue', () => {
        const el = criar();
        const dialogo = abrirCobranca(el);

        expect(dialogo.pagamento().id).toBe(3);
        expect(pagamentoSpy.listarCobrancas).toHaveBeenCalledOnceWith(3);
        expect(texto(el.querySelector('.dialog-title'))).toBe('Cobrança — Ana Silva');
        expect(texto(el.querySelector('.cobranca-resumo'))).toContain('dias em atraso');
      });

      it('should close the dialog', () => {
        const el = criar();
        abrirCobranca(el);
        (el.querySelector('.dialog .btn-outline') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(el.querySelector('app-cobranca-dialog')).toBeNull();
      });

      // O pagamento foi quitado em outra aba depois da carga.
      it('should reload the payments when the dialog says they are outdated', () => {
        const el = criar();
        const dialogo = abrirCobranca(el);
        pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
        dialogo.cobrancaForm.setValue({ dataContato: dialogo.hoje, observacao: 'Ligação.' });
        (el.querySelector('.dialog .btn-primary') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(pagamentoSpy.listar).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('histórico', () => {
    it('should list ended paid payments with their payment method', () => {
      const el = criar();
      const anteriores = linhas(el, 'tabela-anteriores');
      expect(anteriores.map(tr => tr.dataset['pagamento'])).toEqual(['2', '1']);
      expect(Array.from(anteriores[1].querySelectorAll('td')).map(td => texto(td)))
        .toEqual(['R$ 300,00', '01/12/2025 – 29/12/2025', '10/12/2025', '05/12/2025', 'PIX']);
      expect(texto(anteriores[0].querySelectorAll('td')[4])).toBe('—');
    });

    it('should list ended plans, latest first', () => {
      const el = criar();
      const planos = secao(el, 'historico').querySelectorAll('.planos-encerrados li');
      expect(planos.length).toBe(1);
      expect(texto(planos[0])).toContain('Mensal · 1x por semana');
      expect(texto(planos[0])).toContain('Sexta');
      expect(texto(planos[0])).toContain('R$ 280,00');
    });

    it('should list every plan as ended when there is no active plan', () => {
      const el = criar({ planoAtivo: null });
      expect(secao(el, 'historico').querySelectorAll('.planos-encerrados li').length).toBe(2);
    });

    it('should show empty states', () => {
      const el = criar({ pagamentos: of([renovacao]), planos: of([planoAtivo]) });
      const vazios = Array.from(secao(el, 'historico').querySelectorAll('.empty-state')).map(e => texto(e));
      expect(vazios).toEqual(['Nenhum pagamento anterior.', 'Nenhum plano encerrado.']);
    });

    it('should show errors of its own', () => {
      const el = criar({ pagamentos: throwError(() => new Error('500')), planos: throwError(() => new Error('500')) });
      const erros = Array.from(secao(el, 'historico').querySelectorAll('.alert-danger')).map(e => texto(e));
      expect(erros).toEqual(['Erro ao carregar os pagamentos anteriores.', 'Erro ao carregar os planos encerrados.']);
    });
  });

  describe('notas fiscais', () => {
    it('should list the issued NFSEs, latest first, with edit links', () => {
      const el = criar();
      const notas = linhas(el, 'tabela-nfse');
      expect(notas.map(tr => texto(tr.querySelector('td')))).toEqual(['09/2026', '08/2026', '07/2026']);
      expect(Array.from(notas[0].querySelectorAll('td')).slice(0, 4).map(td => texto(td)))
        .toEqual(['09/2026', '05/10/2026', '103', 'R$ 320,00']);
      expect(notas[0].querySelector('a')?.getAttribute('href')).toBe('/pacientes/10/nfse-emitidas/3/editar');
    });

    it('should offer the shortcut to register a NFSE and the full list as subscreen', () => {
      const el = criar();
      const bloco = secao(el, 'nfse');
      const registrar = Array.from(bloco.querySelectorAll('a')).find(a => texto(a) === 'Registrar NFSE');
      expect(registrar?.getAttribute('href')).toBe('/pacientes/10/nfse-emitidas/nova');
      expect(hrefs(bloco)).toContain('/pacientes/10/nfse-emitidas');
    });

    it(`should show only the ${NFSES_NO_BLOCO} latest NFSEs and say how many there are`, () => {
      const muitas = Array.from({ length: 7 }, (_, i) => nota(i + 1, `2026-0${i + 1}-05`, `0${i + 1}/2026`));
      const el = criar({ nfses: of(muitas) });
      expect(linhas(el, 'tabela-nfse').length).toBe(NFSES_NO_BLOCO);
      expect(texto(el.querySelector('.nfse-contagem'))).toBe('Mostrando as 5 mais recentes de 7 NFSEs.');
    });

    it('should show an empty state and its own error', () => {
      let el = criar({ nfses: of([]) });
      expect(texto(secao(el, 'nfse').querySelector('.empty-state'))).toBe('Nenhuma NFSE registrada.');
      expect(el.querySelector('.nfse-contagem')).toBeNull();
      TestBed.resetTestingModule();
      el = criar({ nfses: throwError(() => new Error('500')) });
      expect(texto(secao(el, 'nfse').querySelector('.alert-danger'))).toBe('Erro ao carregar as NFSEs.');
    });

    it('should not request NFSEs from a role without fiscal access', () => {
      const el = criar({ papeis: ['RECEPCAO'] });
      expect(nfseSpy.listarPorPaciente).not.toHaveBeenCalled();
      expect(el.querySelector('#titulo-nfse')).toBeNull();
    });

    it('should show the NFSE block to FINANCEIRO', () => {
      const el = criar({ papeis: ['FINANCEIRO'] });
      expect(el.querySelector('#titulo-nfse')).toBeTruthy();
    });
  });
});
