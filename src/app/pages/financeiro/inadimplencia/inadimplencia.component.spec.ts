import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Page } from '../../../core/models/common';
import { ContatoCobrancaDTO } from '../../../core/models/inadimplencia';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PagamentoResponseDTO } from '../../../core/models/plano';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { InadimplenciaComponent } from './inadimplencia.component';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

/** Segunda-feira, 12/10/2026: fixa o "hoje" dos dias em atraso. */
const HOJE = new Date(2026, 9, 12, 9, 0);

const vencido: PagamentoResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Silva',
  planoId: 1,
  valor: 250,
  status: 'VENCIDO',
  dataPagamento: null,
  dataVencimento: '2026-09-12',
  periodoInicio: '2026-09-01',
  periodoFim: '2026-09-30'
};

const pendente: PagamentoResponseDTO = {
  ...vencido,
  id: 2,
  pacienteId: 11,
  pacienteNome: 'Bruno Lima',
  valor: 180,
  status: 'PENDENTE',
  dataVencimento: '2026-10-20'
};

const pago: PagamentoResponseDTO = {
  ...vencido,
  id: 3,
  pacienteId: 12,
  pacienteNome: 'Carla Souza',
  valor: 300,
  status: 'PAGO',
  dataPagamento: '2026-08-05',
  dataVencimento: '2026-08-01'
};

const contatos: ContatoCobrancaDTO[] = [
  {
    id: 8,
    pagamentoId: 1,
    dataContato: '2026-10-10',
    observacao: 'Ligação: prometeu pagar na sexta.',
    registradoPor: 'admin@carlesso.com',
    registradoEm: '2026-10-10T14:03:00'
  },
  {
    id: 7,
    pagamentoId: 1,
    dataContato: '2026-09-20',
    observacao: 'Mensagem por WhatsApp.',
    registradoPor: 'recepcao@carlesso.com',
    registradoEm: '2026-09-20T09:15:00'
  }
];

const ana: PacienteResponseDTO = {
  version: 0,
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@exemplo.com',
  cpf: '000.000.000-00',
  telefone: '',
  dataNascimento: '1990-01-01',
  endereco: null,
  ativo: false
};

function pagina(content: PagamentoResponseDTO[], meta: Partial<Page<PagamentoResponseDTO>['page']> = {}) {
  return {
    content,
    page: { size: 10, number: 0, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0, ...meta }
  };
}

function erroHttp(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('InadimplenciaComponent', () => {
  let fixture: ComponentFixture<InadimplenciaComponent>;
  let component: InadimplenciaComponent;
  let pagamentoSpy: jasmine.SpyObj<PagamentoService>;
  let pacienteSpy: jasmine.SpyObj<PacienteService>;

  beforeEach(async () => {
    pagamentoSpy = jasmine.createSpyObj('PagamentoService', ['listarTodos', 'listarCobrancas', 'registrarCobranca']);
    pagamentoSpy.listarTodos.and.returnValue(of(pagina([vencido, pendente, pago])));
    pagamentoSpy.listarCobrancas.and.returnValue(of(contatos));
    pagamentoSpy.registrarCobranca.and.returnValue(of(contatos[0]));
    pacienteSpy = jasmine.createSpyObj('PacienteService', ['listar']);
    pacienteSpy.listar.and.returnValue(of({ content: [ana], page: { size: 8, number: 0, totalElements: 1, totalPages: 1 } }));

    await TestBed.configureTestingModule({
      imports: [InadimplenciaComponent],
      providers: [
        provideLocalePtBr(),
        provideRouter([]),
        { provide: PagamentoService, useValue: pagamentoSpy },
        { provide: PacienteService, useValue: pacienteSpy }
      ]
    }).compileComponents();
  });

  /** Cria a tela com o relógio fixo em {@link HOJE} durante a primeira carga. */
  function criar(fixarHoje = true): void {
    if (fixarHoje) {
      jasmine.clock().install();
      jasmine.clock().mockDate(HOJE);
    }
    try {
      fixture = TestBed.createComponent(InadimplenciaComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    } finally {
      if (fixarHoje) jasmine.clock().uninstall();
    }
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const todos = (seletor: string) => Array.from(el().querySelectorAll<HTMLElement>(seletor));
  const texto = (seletor: string) => el().querySelector(seletor)?.textContent?.trim() ?? '';
  const ultimaChamada = () => pagamentoSpy.listarTodos.calls.mostRecent().args;

  /** Abre o diálogo com o relógio em {@link HOJE}, que vira o teto da data do contato. */
  function abrirCobranca(indice: number): void {
    const botoes = todos('.table tbody tr .acoes button');
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      botoes[indice].click();
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }
  }

  describe('carga inicial', () => {
    it('should open on pending and overdue payments, oldest due date first', () => {
      criar();

      expect(pagamentoSpy.listarTodos).toHaveBeenCalledOnceWith(
        { status: ['PENDENTE', 'VENCIDO'] },
        0,
        10,
        ['dataVencimento,asc']
      );
      expect(component.filtro.status).toEqual({ PENDENTE: true, VENCIDO: true, PAGO: false });
    });

    it('should render patient, value, due date, days overdue and status of each payment', () => {
      criar();

      const linhas = todos('.table tbody tr');
      expect(linhas.length).toBe(3);
      const celulas = Array.from(linhas[0].querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
      expect(celulas[0]).toBe('Ana Silva');
      expect(normalizarEspacos(celulas[1])).toBe('R$ 250,00');
      expect(celulas[2]).toBe('12/09/2026');
      expect(celulas[3]).toBe('30 dias');
      expect(celulas[4]).toBe('Vencido');
      expect(linhas[0].querySelector('.dias-atraso--em-atraso')).toBeTruthy();
      expect(linhas[0].querySelector('.badge-vencido')).toBeTruthy();
    });

    it('should show a dash for payments that are not overdue or already paid', () => {
      criar();

      const atrasos = todos('.table tbody .dias-atraso').map(td => td.textContent?.trim());
      expect(atrasos).toEqual(['30 dias', '—', '—']);
      expect(todos('.dias-atraso--em-atraso').length).toBe(1);
    });

    it('should link each row to the patient and to the patient financial history', () => {
      criar();

      const linha = todos('.table tbody tr')[0];
      expect(linha.querySelector('a[href="/pacientes/10"]')).toBeTruthy();
      const financeiro = linha.querySelector('a[href="/pagamentos/paciente/10"]');
      expect(financeiro?.textContent?.trim()).toBe('Financeiro');
      expect(financeiro?.getAttribute('aria-label')).toBe('Financeiro de Ana Silva');
    });

    it('should show the pagination summary', () => {
      criar();
      expect(el().querySelector('app-pagination-summary')).toBeTruthy();
    });

    it('should show the empty state when nothing matches', () => {
      pagamentoSpy.listarTodos.and.returnValue(of(pagina([])));
      criar();

      expect(texto('.empty-state')).toBe('Nenhum pagamento encontrado para os filtros aplicados.');
      expect(el().querySelector('.table')).toBeNull();
    });

    it('should show the API message when loading fails', () => {
      pagamentoSpy.listarTodos.and.returnValue(throwError(() => erroHttp(500, { erro: 'Falha no banco.' })));
      criar();

      expect(texto('.alert-danger')).toBe('Falha no banco.');
      expect(el().querySelector('.empty-state')).toBeNull();
    });

    it('should fall back to the last valid page when the current one no longer exists', () => {
      criar();
      pagamentoSpy.listarTodos.calls.reset();
      pagamentoSpy.listarTodos.and.returnValues(
        of(pagina([], { number: 4, totalPages: 2, totalElements: 15 })),
        of(pagina([vencido], { number: 1, totalPages: 2, totalElements: 15 }))
      );
      component.totalPages = 5;

      component.pagina(4);

      expect(pagamentoSpy.listarTodos.calls.count()).toBe(2);
      expect(pagamentoSpy.listarTodos.calls.argsFor(1)[1]).toBe(1);
      expect(component.currentPage).toBe(1);
    });
  });

  describe('ordenação', () => {
    // Dias em atraso não existem na API: ordenar por eles é ordenar por status e,
    // dentro dele, pelo vencimento na direção oposta — no servidor, valendo para
    // todas as páginas, sem misturar pagos e pendentes no prazo aos vencidos.
    it('should sort by days overdue through status and the inverse due date sort', () => {
      criar();
      const cabecalho = todos('th button').find(b => b.textContent?.includes('Dias em atraso'))!;

      cabecalho.click();
      fixture.detectChanges();
      expect(ultimaChamada()[3]).toEqual(['status,asc', 'dataVencimento,desc']);

      cabecalho.click();
      fixture.detectChanges();
      expect(ultimaChamada()[3]).toEqual(['status,desc', 'dataVencimento,asc']);
      expect(component.ordenacao).toEqual({ campo: 'diasAtraso', direcao: 'desc' });
    });

    it('should sort by the API fields and go back to the first page', () => {
      criar();
      component.currentPage = 2;

      component.ordenar('paciente.nome');

      expect(ultimaChamada()[1]).toBe(0);
      expect(ultimaChamada()[3]).toEqual(['paciente.nome,asc']);
    });
  });

  describe('filtros', () => {
    it('should apply status, due date range and patient', () => {
      criar();
      component.filtro.status = { PENDENTE: false, VENCIDO: true, PAGO: true };
      component.filtro.vencimentoDe = '2026-01-01';
      component.filtro.vencimentoAte = '2026-09-30';
      component.selecionarPaciente(ana);
      component.currentPage = 3;

      component.buscar();

      expect(ultimaChamada()).toEqual([
        { status: ['VENCIDO', 'PAGO'], vencimentoDe: '2026-01-01', vencimentoAte: '2026-09-30', pacienteId: 10 },
        0,
        10,
        ['dataVencimento,asc']
      ]);
    });

    it('should reject an inverted due date range without calling the API', () => {
      criar();
      pagamentoSpy.listarTodos.calls.reset();
      component.filtro.vencimentoDe = '2026-09-30';
      component.filtro.vencimentoAte = '2026-01-01';

      component.buscar();
      fixture.detectChanges();

      expect(pagamentoSpy.listarTodos).not.toHaveBeenCalled();
      expect(texto('.filtro-erro')).toBe('O vencimento inicial não pode ser posterior ao final.');
      // A lista do último filtro aplicado continua na tela.
      expect(todos('.table tbody tr').length).toBe(3);
    });

    it('should require at least one status', () => {
      criar();
      pagamentoSpy.listarTodos.calls.reset();
      component.filtro.status = { PENDENTE: false, VENCIDO: false, PAGO: false };

      component.buscar();
      fixture.detectChanges();

      expect(pagamentoSpy.listarTodos).not.toHaveBeenCalled();
      expect(texto('.filtro-erro')).toBe('Selecione ao menos um status.');
    });

    it('should clear the validation message once the filters are valid', () => {
      criar();
      component.filtro.status = { PENDENTE: false, VENCIDO: false, PAGO: false };
      component.buscar();
      component.filtro.status.PAGO = true;

      component.buscar();
      fixture.detectChanges();

      expect(component.erroFiltro).toBeNull();
      expect(el().querySelector('.filtro-erro')).toBeNull();
    });

    it('should page with the applied filter, not with the one still being edited', () => {
      pagamentoSpy.listarTodos.and.returnValue(of(pagina([vencido], { totalPages: 3, totalElements: 21 })));
      criar();
      component.filtro.vencimentoDe = '2026-05-01';

      component.pagina(1);

      expect(ultimaChamada()[0]).toEqual({ status: ['PENDENTE', 'VENCIDO'] });
      expect(ultimaChamada()[1]).toBe(1);
    });

    it('should restore the defaults when clearing', () => {
      criar();
      component.filtro.status = { PENDENTE: false, VENCIDO: false, PAGO: true };
      component.filtro.vencimentoDe = '2026-01-01';
      component.selecionarPaciente(ana);
      component.ordenar('valor');

      component.limparFiltros();

      expect(component.pacienteSelecionado).toBeNull();
      expect(component.filtro).toEqual({
        status: { PENDENTE: true, VENCIDO: true, PAGO: false },
        vencimentoDe: '',
        vencimentoAte: ''
      });
      expect(ultimaChamada()).toEqual([
        { status: ['PENDENTE', 'VENCIDO'], vencimentoDe: undefined, vencimentoAte: undefined, pacienteId: undefined },
        0,
        10,
        ['dataVencimento,asc']
      ]);
    });

    it('should change the page size and go back to the first page', () => {
      criar();
      component.currentPage = 2;

      component.alterarTamanhoPagina(20);

      expect(ultimaChamada()[1]).toBe(0);
      expect(ultimaChamada()[2]).toBe(20);
    });

    // Inativos incluídos: deixar o estúdio não quita o que ficou em aberto.
    it('should search patients by name, including inactive ones, after the debounce', fakeAsync(() => {
      criar(false);
      const input = el().querySelector('#buscaPaciente') as HTMLInputElement;

      input.value = 'An';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      expect(pacienteSpy.listar).toHaveBeenCalledOnceWith(0, 8, { nome: 'An' }, 'nome');
      const sugestao = el().querySelector('.sugestao') as HTMLButtonElement;
      expect(sugestao.textContent).toContain('Ana Silva');

      sugestao.click();
      fixture.detectChanges();
      tick(300);

      expect(component.pacienteSelecionado).toBe(ana);
      expect(texto('.paciente-selecionado span')).toBe('Ana Silva');
      expect(el().querySelector('#buscaPaciente')).toBeNull();
    }));

    it('should not search with fewer than two letters', fakeAsync(() => {
      criar(false);
      component.busca.setValue('A');
      tick(300);

      expect(pacienteSpy.listar).not.toHaveBeenCalled();
    }));

    it('should tell a failed patient search apart from an empty result', fakeAsync(() => {
      pacienteSpy.listar.and.returnValue(throwError(() => erroHttp(500)));
      criar(false);
      component.busca.setValue('Ana');
      tick(300);
      fixture.detectChanges();

      expect(texto('.sugestao-status')).toBe('Não foi possível buscar agora.');
      expect(component.erro).toBeNull();
    }));

    it('should remove the patient filter', () => {
      criar();
      component.selecionarPaciente(ana);
      fixture.detectChanges();

      (el().querySelector('.paciente-selecionado button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.pacienteSelecionado).toBeNull();
      expect(el().querySelector('#buscaPaciente')).toBeTruthy();
    });
  });

  describe('cobrança', () => {
    it('should open the dialog with the payment summary and its contact history', () => {
      criar();

      abrirCobranca(0);

      expect(pagamentoSpy.listarCobrancas).toHaveBeenCalledOnceWith(1);
      expect(texto('.dialog-title')).toBe('Cobrança — Ana Silva');
      expect(normalizarEspacos(texto('.cobranca-resumo'))).toContain('R$ 250,00 · vencimento 12/09/2026');
      expect(texto('.cobranca-resumo')).toContain('30 dias em atraso');
      const itens = todos('.cobranca-contato');
      expect(itens.length).toBe(2);
      expect(itens[0].querySelector('.cobranca-contato-data')?.textContent?.trim()).toBe('10/10/2026');
      expect(itens[0].querySelector('.cobranca-contato-observacao')?.textContent?.trim())
        .toBe('Ligação: prometeu pagar na sexta.');
      expect(itens[0].querySelector('.cobranca-contato-registro')?.textContent?.trim())
        .toBe('Registrado por admin@carlesso.com em 10/10/2026 às 14:03');
    });

    it('should prefill the contact date with today', () => {
      criar();
      abrirCobranca(0);

      expect(component.cobrancaForm.getRawValue()).toEqual({ dataContato: '2026-10-12', observacao: '' });
      expect((el().querySelector('#dataContato') as HTMLInputElement).max).toBe('2026-10-12');
    });

    it('should register a contact with a trimmed note and reload the history', () => {
      criar();
      abrirCobranca(0);
      pagamentoSpy.listarCobrancas.calls.reset();
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: '  Ligação sem resposta.  ' });

      (el().querySelector('.dialog .btn-primary') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(pagamentoSpy.registrarCobranca).toHaveBeenCalledOnceWith(1, {
        dataContato: '2026-10-11',
        observacao: 'Ligação sem resposta.'
      });
      expect(pagamentoSpy.listarCobrancas).toHaveBeenCalledOnceWith(1);
      expect(texto('.dialog .alert-success')).toBe('Contato de cobrança registrado.');
      expect(component.campoCobranca('observacao').value).toBe('');
    });

    it('should not submit an empty, blank or too long note', () => {
      criar();
      abrirCobranca(0);

      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: '   ' });
      component.registrarContato();
      fixture.detectChanges();
      expect(texto('.cobranca-form .invalid-feedback')).toBe('Descreva o contato.');

      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'x'.repeat(501) });
      component.registrarContato();
      fixture.detectChanges();
      expect(texto('.cobranca-form .invalid-feedback')).toBe('A observação deve ter no máximo 500 caracteres.');

      expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
    });

    it('should not submit a future or missing contact date', () => {
      criar();
      abrirCobranca(0);

      component.cobrancaForm.setValue({ dataContato: '2026-10-13', observacao: 'Ligação.' });
      component.registrarContato();
      fixture.detectChanges();
      expect(texto('.cobranca-form .invalid-feedback')).toBe('A data do contato não pode ser futura.');

      component.cobrancaForm.setValue({ dataContato: '', observacao: 'Ligação.' });
      component.registrarContato();
      fixture.detectChanges();
      expect(texto('.cobranca-form .invalid-feedback')).toBe('Informe a data do contato.');

      expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
    });

    it('should show the note length counter', () => {
      criar();
      abrirCobranca(0);
      component.campoCobranca('observacao').setValue('Ligação');
      fixture.detectChanges();

      expect(texto('#observacaoCobrancaHint')).toBe('7/500 caracteres.');
    });

    it('should only show the history for a paid payment', () => {
      criar();

      abrirCobranca(2);

      expect(el().querySelector('.cobranca-form')).toBeNull();
      expect(el().querySelector('.dialog .btn-primary')).toBeNull();
      expect(texto('.cobranca-aviso')).toContain('Pagamento quitado');
      expect(todos('.cobranca-contato').length).toBe(2);
      component.registrarContato();
      expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
    });

    // O pagamento foi quitado depois da carga da lista.
    it('should turn the dialog read-only and reload the list on 422', () => {
      criar();
      abrirCobranca(0);
      pagamentoSpy.listarTodos.calls.reset();
      pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(422, { erro: 'Pagamento já está pago.' })));
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

      component.registrarContato();
      fixture.detectChanges();

      expect(texto('.dialog .alert-danger')).toBe('Pagamento já está pago.');
      expect(component.cobranca?.status).toBe('PAGO');
      expect(el().querySelector('.cobranca-form')).toBeNull();
      expect(pagamentoSpy.listarTodos).toHaveBeenCalledTimes(1);
    });

    it('should fall back to a specific message on 422 without a body', () => {
      criar();
      abrirCobranca(0);
      pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(422)));
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

      component.registrarContato();

      expect(component.erroCobranca).toBe('Este pagamento já foi quitado e não aceita novos contatos de cobrança.');
    });

    it('should reload the list when the payment no longer exists', () => {
      criar();
      abrirCobranca(0);
      pagamentoSpy.listarTodos.calls.reset();
      pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(404)));
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

      component.registrarContato();

      expect(component.erroCobranca).toBe('Pagamento não encontrado.');
      expect(pagamentoSpy.listarTodos).toHaveBeenCalledTimes(1);
    });

    it('should show the API validation message and keep the note on 400', () => {
      criar();
      abrirCobranca(0);
      pagamentoSpy.registrarCobranca.and.returnValue(
        throwError(() => erroHttp(400, { observacao: 'A observação é obrigatória.' })));
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

      component.registrarContato();
      fixture.detectChanges();

      expect(texto('.dialog .alert-danger')).toBe('A observação é obrigatória.');
      expect(component.campoCobranca('observacao').value).toBe('Ligação.');
      expect(component.registrando).toBeFalse();
    });

    it('should show empty and failed history states', () => {
      pagamentoSpy.listarCobrancas.and.returnValue(of([]));
      criar();
      abrirCobranca(0);
      expect(texto('.cobranca-historico-status')).toBe('Nenhum contato registrado para este pagamento.');

      component.fecharCobranca();
      pagamentoSpy.listarCobrancas.and.returnValue(throwError(() => erroHttp(500)));
      fixture.detectChanges();
      abrirCobranca(1);
      expect(texto('.cobranca-historico-status')).toBe('Não foi possível carregar os contatos de cobrança.');
    });

    it('should drop a late history response after the dialog is closed', () => {
      const atrasado = new Subject<ContatoCobrancaDTO[]>();
      pagamentoSpy.listarCobrancas.and.returnValue(atrasado as Observable<ContatoCobrancaDTO[]>);
      criar();
      abrirCobranca(0);
      expect(texto('.cobranca-historico-status')).toBe('Carregando contatos...');

      (el().querySelector('.dialog .btn-outline') as HTMLButtonElement).click();
      fixture.detectChanges();
      atrasado.next(contatos);

      expect(el().querySelector('.dialog')).toBeNull();
      expect(component.contatos).toEqual([]);
    });

    it('should not close the dialog while a contact is being registered', () => {
      pagamentoSpy.registrarCobranca.and.returnValue(new Subject<ContatoCobrancaDTO>());
      criar();
      abrirCobranca(0);
      component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

      component.registrarContato();
      component.fecharCobranca();

      expect(component.registrando).toBeTrue();
      expect(component.cobranca).not.toBeNull();
    });
  });
});
