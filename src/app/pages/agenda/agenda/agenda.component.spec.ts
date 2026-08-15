import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { BloqueioAgendaResponseDTO } from '../../../core/models/bloqueio-agenda';
import { ListaEsperaResponseDTO } from '../../../core/models/lista-espera';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { BloqueioAgendaService } from '../../../core/services/bloqueio-agenda.service';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { isOnPush } from '../../../../testing/onpush';
import { AgendaComponent } from './agenda.component';

/** Quarta-feira, 20/05/2026 — o dia âncora de todos os cenários. */
const HOJE = new Date(2026, 4, 20, 9, 0);

function sessao(dados: Partial<SessaoResponseDTO> & { id: number; dataHora: string }): SessaoResponseDTO {
  return {
    pacienteId: 10,
    nomePaciente: 'Ana Silva',
    tipo: 'PILATES',
    duracao: 50,
    profissionalId: 3,
    nomeProfissional: 'Carla Fisio',
    status: 'AGENDADA',
    observacoes: null,
    dataCriacao: '2026-05-01T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

function aula(dados: Partial<AulaResponseDTO> & { id: number; data: string }): AulaResponseDTO {
  return {
    pacienteId: 20,
    pacienteNome: 'Bruno Costa',
    pagamentoId: 1,
    realizada: false,
    profissionalId: null,
    profissionalNome: null,
    ...dados
  };
}

const profissionais: ProfissionalResponseDTO[] = [
  {
    id: 3,
    nome: 'Carla Fisio',
    email: 'carla@email.com',
    cpf: '111.111.111-11',
    telefone: null,
    numeroRegistro: null,
    tipoContrato: 'PJ',
    percentualPagamentoAula: 50,
    dataInicio: '2024-01-01',
    ativo: true
  },
  {
    id: 5,
    nome: 'Diego Pilates',
    email: 'diego@email.com',
    cpf: '222.222.222-22',
    telefone: null,
    numeroRegistro: null,
    tipoContrato: 'CLT',
    percentualPagamentoAula: 40,
    dataInicio: '2024-01-01',
    ativo: true
  }
];

const paginaProfissionais: ProfissionalPage = {
  content: profissionais,
  page: { totalElements: 2, totalPages: 1, size: 100, number: 0 }
};

/** Sessão de Ana na quarta, aula de Bruno na quinta, sessão cancelada na sexta. */
const sessaoDoDia = sessao({ id: 7, dataHora: '2026-05-20T14:00' });
const sessaoCancelada = sessao({
  id: 8,
  dataHora: '2026-05-22T09:00',
  status: 'CANCELADA',
  tipo: 'FISIOTERAPIA',
  pacienteId: 30,
  nomePaciente: 'Célia Dias',
  profissionalId: 5,
  nomeProfissional: 'Diego Pilates'
});
const aulaPendente = aula({ id: 3, data: '2026-05-21' });

function bloqueio(
  dados: Partial<BloqueioAgendaResponseDTO> & { id: number; dataInicio: string }
): BloqueioAgendaResponseDTO {
  const horaInicio = dados.horaInicio ?? null;
  const horaFim = dados.horaFim ?? null;
  return {
    dataFim: dados.dataInicio,
    horaInicio,
    horaFim,
    diaInteiro: horaInicio === null && horaFim === null,
    motivo: 'Feriado municipal',
    dataCriacao: '2026-01-02T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

/** Quinta (21/05/2026) bloqueada o dia inteiro. */
const bloqueioDaQuinta = bloqueio({ id: 1, dataInicio: '2026-05-21', motivo: 'Feriado municipal' });

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;
  let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;
  let bloqueioServiceSpy: jasmine.SpyObj<BloqueioAgendaService>;
  let listaEsperaServiceSpy: jasmine.SpyObj<ListaEsperaService>;

  async function setup(opcoes: {
    sessoes?: SessaoResponseDTO[];
    aulas?: AulaResponseDTO[];
    bloqueios?: BloqueioAgendaResponseDTO[];
    fila?: ListaEsperaResponseDTO[];
    erroSessoes?: HttpErrorResponse;
    erroProfissionais?: HttpErrorResponse;
    erroBloqueios?: HttpErrorResponse;
    profissionais?: ProfissionalResponseDTO[];
  } = {}) {
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['listarPorPeriodo', 'realizar', 'cancelar']);
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['listarPorPeriodo', 'realizar']);
    profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
    bloqueioServiceSpy = jasmine.createSpyObj('BloqueioAgendaService', ['listarPorPeriodo']);
    listaEsperaServiceSpy = jasmine.createSpyObj('ListaEsperaService', ['listar']);

    listaEsperaServiceSpy.listar.and.returnValue(of(opcoes.fila ?? []));
    bloqueioServiceSpy.listarPorPeriodo.and.returnValue(
      opcoes.erroBloqueios ? throwError(() => opcoes.erroBloqueios) : of(opcoes.bloqueios ?? []));

    sessaoServiceSpy.listarPorPeriodo.and.returnValue(
      opcoes.erroSessoes ? throwError(() => opcoes.erroSessoes) : of(opcoes.sessoes ?? [sessaoDoDia, sessaoCancelada]));
    aulaServiceSpy.listarPorPeriodo.and.returnValue(of(opcoes.aulas ?? [aulaPendente]));
    sessaoServiceSpy.realizar.and.returnValue(of(sessao({ id: 7, dataHora: '2026-05-20T14:00', status: 'REALIZADA' })));
    sessaoServiceSpy.cancelar.and.returnValue(of(sessao({ id: 7, dataHora: '2026-05-20T14:00', status: 'CANCELADA' })));
    aulaServiceSpy.realizar.and.returnValue(of(aula({ id: 3, data: '2026-05-21', realizada: true })));
    profissionalServiceSpy.listar.and.returnValue(
      opcoes.erroProfissionais
        ? throwError(() => opcoes.erroProfissionais)
        : of(opcoes.profissionais
          ? { ...paginaProfissionais, content: opcoes.profissionais }
          : paginaProfissionais));

    await TestBed.configureTestingModule({
      imports: [AgendaComponent, RouterTestingModule],
      providers: [
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: AulaService, useValue: aulaServiceSpy },
        { provide: ProfissionalService, useValue: profissionalServiceSpy },
        { provide: BloqueioAgendaService, useValue: bloqueioServiceSpy },
        { provide: ListaEsperaService, useValue: listaEsperaServiceSpy }
      ]
    }).compileComponents();

    // O componente resolve `hoje` na construção. O relógio é fixado apenas em
    // volta da criação — os spies devolvem `of(...)`, então a carga inteira
    // acontece de forma síncrona dentro deste trecho — e desinstalado logo em
    // seguida, para não substituir os timers do resto da suíte.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(AgendaComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }
  }

  function texto(seletor: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';
  }

  function todos(seletor: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(seletor));
  }

  /**
   * As ações são disparadas pelos botões, e não pelos métodos do componente:
   * com `OnPush`, quem marca a view suja é o próprio evento de clique — chamar
   * o método direto mudaria o estado sem que a tela fosse reavaliada, e o teste
   * passaria a medir algo que o usuário não vê.
   */
  function clicar(seletor: string): void {
    ((fixture.nativeElement as HTMLElement).querySelector(seletor) as HTMLElement).click();
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should use OnPush change detection', () => {
    expect(isOnPush(AgendaComponent)).toBeTrue();
  });

  // 20/05/2026 é quarta: a semana da tela vai de domingo (17) a sábado (23), e
  // é exatamente esse o período pedido à API.
  it('should open on the current week and request that period', async () => {
    await setup();

    expect(component.visao).toBe('semanal');
    expect(component.referencia).toBe('2026-05-20');
    expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
    expect(aulaServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
    expect(texto('.calendario-titulo')).toBe('17 a 23 de maio de 2026');
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should render the weekday header and one cell per day of the week', async () => {
    await setup();

    expect(todos('.calendario-coluna').map(coluna => coluna.textContent?.trim()))
      .toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    expect(todos('.calendario-celula').length).toBe(7);
  });

  // O que a recepção procura na grade é o nome do paciente, não o tipo — que
  // se repete a tarde inteira.
  it('should title each event with the patient name', async () => {
    await setup();

    expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
      .toEqual(['Ana Silva', 'Bruno Costa', 'Célia Dias']);
  });

  it('should distinguish the events by origin and status', async () => {
    await setup();

    const eventos = todos('.calendario-grade .evento');
    expect(eventos.length).toBe(3);
    expect(eventos[0].classList).toContain('evento-sessao');
    expect(eventos[0].classList).toContain('evento-agendada');
    expect(eventos[1].classList).toContain('evento-aula');
    expect(eventos[1].classList).toContain('evento-agendada');
    expect(eventos[2].classList).toContain('evento-sessao');
    expect(eventos[2].classList).toContain('evento-cancelada');
  });

  // `table`, e não `grid`: a ARIA APG define `grid` como widget interativo com
  // navegação por setas, que esta tela não implementa.
  it('should expose the grid as static tabular data', async () => {
    await setup();

    expect(todos('.calendario-grade')[0].getAttribute('role')).toBe('table');
    expect(todos('.calendario-celula')[0].getAttribute('role')).toBe('cell');
  });

  it('should announce the period and the event count in a live region', async () => {
    await setup();

    const resumo = (fixture.nativeElement as HTMLElement).querySelector('.calendario-resumo') as HTMLElement;
    expect(resumo.getAttribute('role')).toBe('status');
    expect(resumo.textContent?.trim()).toBe('17 a 23 de maio de 2026: 3 eventos no período.');
  });

  describe('navegação e visões', () => {
    it('should fetch the next week when navigating forward', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.navegar(1);
      fixture.detectChanges();

      expect(component.referencia).toBe('2026-05-27');
      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-24', '2026-05-30');
      expect(texto('.calendario-titulo')).toBe('24 a 30 de maio de 2026');
    });

    // Trocar de visão preserva o dia âncora e busca de novo: o período mudou de
    // tamanho, e a coleção é do período.
    it('should switch to the daily view keeping the anchor day', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.alterarVisao('diaria');
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-20', '2026-05-20');
      expect(texto('.calendario-titulo')).toBe('Quarta-feira, 20 de maio de 2026');
      // Sem grade de 7 colunas: um dia é uma coluna só, e vale a lista.
      expect(todos('.calendario-grade').length).toBe(0);
      expect(todos('.calendario-lista .agenda-evento').length).toBe(1);
    });

    it('should move by day in the daily view', async () => {
      await setup();
      component.alterarVisao('diaria');
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.navegar(1);
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-21', '2026-05-21');
    });

    it('should disable "Hoje" while the current period is on screen', async () => {
      await setup();

      const hoje = todos('.calendario-navegacao .btn-secondary')[0] as HTMLButtonElement;
      expect(hoje.disabled).toBeTrue();

      component.navegar(1);
      fixture.detectChanges();
      expect((todos('.calendario-navegacao .btn-secondary')[0] as HTMLButtonElement).disabled).toBeFalse();
    });
  });

  describe('filtros', () => {
    it('should filter by professional without touching the API', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.filtro.profissionalId = 5;
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Célia Dias']);
    });

    // "Aula" é a origem, e não um tipo de sessão: nenhum par de parâmetros do
    // servidor expressa esse recorte, e é por isso que ele mora no cliente.
    it('should filter classes apart from the session types', async () => {
      await setup();

      component.filtro.tipo = 'AULA';
      component.aplicarFiltros();
      fixture.detectChanges();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Bruno Costa']);

      component.filtro.tipo = 'FISIOTERAPIA';
      component.aplicarFiltros();
      fixture.detectChanges();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Célia Dias']);
    });

    it('should filter by status', async () => {
      await setup();

      component.filtro.status = 'CANCELADA';
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(todos('.calendario-grade .evento').length).toBe(1);
      expect(component.filtrosAtivos).toBe(1);
    });

    it('should say the empty period is a consequence of the filters', async () => {
      await setup();

      component.filtro.status = 'REALIZADA';
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período com os filtros aplicados.');
      expect(texto('.calendario-resumo'))
        .toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período (com filtros).');
    });

    it('should restore every event when the filters are cleared', async () => {
      await setup();
      component.filtro.status = 'CANCELADA';
      component.aplicarFiltros();

      component.limparFiltros();
      fixture.detectChanges();

      expect(component.filtrosAtivos).toBe(0);
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });

  describe('estados de carga', () => {
    it('should show the empty state for a period without events', async () => {
      await setup({ sessoes: [], aulas: [] });

      expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período.');
      expect(texto('.calendario-resumo'))
        .toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período.');
    });

    it('should show a single error banner when the period fails to load', async () => {
      await setup({ erroSessoes: new HttpErrorResponse({ status: 500 }) });

      expect(texto('.alert-danger')).toBe('Não foi possível carregar a agenda.');
      expect(todos('.calendario-grade').length).toBe(0);
      // A barra de período continua na tela: navegar para outro período é a
      // saída natural de uma carga que falhou.
      expect(todos('.calendario-barra').length).toBe(1);
    });

    // O filtro por profissional é acessório: sem ele ainda dá para ler a agenda,
    // então a falha não acende a faixa de erro da tela.
    it('should keep the agenda readable when the professional list fails', async () => {
      await setup({ erroProfissionais: new HttpErrorResponse({ status: 500 }) });

      expect(component.profissionais).toEqual([]);
      expect(component.erro).toBeNull();
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });

  describe('detalhe e ações rápidas', () => {
    function abrirPrimeiroEvento(): void {
      clicar('.calendario-grade .evento');
    }

    it('should open the detail panel with the event data', async () => {
      await setup();

      abrirPrimeiroEvento();

      expect(component.eventoSelecionado?.chave).toBe('sessao-7');
      expect(texto('.detalhe-titulo')).toBe('Ana Silva');
      expect(todos('.detalhe-painel .detail-item span:not(.label)').map(item => item.textContent?.trim()))
        .toEqual(['Sessão: Pilates', '20 de maio de 2026 às 14:00', 'Agendada', 'Carla Fisio']);
    });

    it('should close the detail panel', async () => {
      await setup();
      abrirPrimeiroEvento();

      clicar('.detalhe-fechar');

      expect(component.eventoSelecionado).toBeNull();
      expect(todos('.detalhe-painel').length).toBe(0);
    });

    it('should confirm before marking a session as done and reload the period', async () => {
      await setup();
      abrirPrimeiroEvento();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      clicar('.detalhe-acoes .btn-primary');
      expect(todos('app-confirmar-dialog').length).toBe(1);

      clicar('.dialog-actions .btn');

      expect(sessaoServiceSpy.realizar).toHaveBeenCalledWith(7);
      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
      expect(component.acaoPendente).toBeNull();
      expect(texto('.alert-success')).toBe('Evento marcado como realizado.');
    });

    it('should cancel a session through the danger confirmation', async () => {
      await setup();
      abrirPrimeiroEvento();

      clicar('.detalhe-acoes .btn-danger');
      expect(component.tituloConfirmacao).toBe('Cancelar sessão');
      expect(component.mensagemConfirmacao)
        .toBe('Cancelar Sessão: Pilates de Ana Silva em 20 de maio de 2026? '
          + 'O cancelamento não pode ser desfeito pela agenda.');

      clicar('.dialog-actions .btn');

      expect(sessaoServiceSpy.cancelar).toHaveBeenCalledWith(7);
      expect(texto('.alert-success')).toBe('Sessão cancelada.');
    });

    // Aviso da lista de espera no cancelamento (issue #137).
    describe('aviso da lista de espera', () => {
      const interessado: ListaEsperaResponseDTO = {
        id: 5,
        pacienteId: 20,
        pacienteNome: 'Bruno Lima',
        diaSemana: 'WEDNESDAY',
        horaInicio: '13:30:00',
        horaFim: '15:00:00',
        dataEntrada: '2026-05-01T08:00:00',
        observacao: null
      };

      // A sessão âncora é quarta, 14:00, com 50 minutos de duração — a faixa
      // consultada é a dela, e não só o instante inicial.
      it('should ask the queue for the slot the cancellation frees', async () => {
        await setup({ fila: [interessado] });
        abrirPrimeiroEvento();

        clicar('.detalhe-acoes .btn-danger');

        expect(listaEsperaServiceSpy.listar).toHaveBeenCalledWith({
          diaSemana: 'WEDNESDAY',
          horaInicio: '14:00',
          horaFim: '14:50'
        });
      });

      it('should name the interested patients in the confirmation', async () => {
        await setup({ fila: [interessado] });
        abrirPrimeiroEvento();

        clicar('.detalhe-acoes .btn-danger');

        expect(texto('.dialog .alert-warning'))
          .toBe('1 pessoa na lista de espera para este horário: Bruno Lima — Quarta, das 13:30 às 15:00.');
      });

      it('should not consult the queue when marking an event as done', async () => {
        await setup({ fila: [interessado] });
        abrirPrimeiroEvento();

        clicar('.detalhe-acoes .btn-primary');

        expect(listaEsperaServiceSpy.listar).not.toHaveBeenCalled();
      });

      // O aviso é um extra: derrubar o cancelamento porque a fila não carregou
      // trocaria a ação principal pela acessória.
      it('should stay silent when the queue fails to load', async () => {
        await setup();
        listaEsperaServiceSpy.listar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        abrirPrimeiroEvento();

        clicar('.detalhe-acoes .btn-danger');

        expect(component.avisoListaEspera).toBeNull();
        expect(component.erroAcao).toBeNull();
        expect(component.acaoPendente).toBe('cancelar');
      });

      it('should drop the queue when the confirmation is dismissed', async () => {
        await setup({ fila: [interessado] });
        abrirPrimeiroEvento();
        clicar('.detalhe-acoes .btn-danger');

        clicar('.dialog-actions .btn-outline');

        expect(component.interessados).toEqual([]);
      });
    });

    // A aula não tem cancelamento na API: só o booleano `realizada`.
    it('should not offer cancellation for a class', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      expect(component.podeRealizar).toBeTrue();
      expect(component.podeCancelar).toBeFalse();
    });

    // O `PATCH /aulas/{id}/realizar` exige o profissional, e a aula pode chegar
    // sem nenhum atribuído.
    it('should require a professional before completing a class', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      clicar('.detalhe-acoes .btn-primary');

      expect(aulaServiceSpy.realizar).not.toHaveBeenCalled();
      expect(component.acaoPendente).toBeNull();
      expect(component.profissionalInvalido).toBeTrue();
      expect(texto('.detalhe-painel .alert-danger'))
        .toBe('Selecione um profissional para marcar a aula como realizada.');
    });

    it('should complete a class with the chosen professional', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      component.profissionalDaAcao = 5;
      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');

      expect(aulaServiceSpy.realizar).toHaveBeenCalledWith(3, 5);
    });

    // Regressão da revisão da PR: a resposta do `PATCH` chega fora de qualquer
    // evento de template, então sem `markForCheck` nada do que o ramo de
    // sucesso muda chega ao DOM — o diálogo continuaria na tela, com o scroll
    // do fundo travado, até a recarga do período responder. O `Subject` separa
    // as duas respostas; com `of(...)` síncrono o defeito é invisível.
    it('should render the outcome as soon as the action responds, before the reload', async () => {
      await setup();
      const acao = new Subject<SessaoResponseDTO>();
      sessaoServiceSpy.realizar.and.returnValue(acao);
      const recarga = new Subject<SessaoResponseDTO[]>();
      abrirPrimeiroEvento();

      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');
      expect(todos('app-confirmar-dialog').length).toBe(1);

      // A recarga do período fica pendente de propósito.
      sessaoServiceSpy.listarPorPeriodo.and.returnValue(recarga);
      acao.next(sessao({ id: 7, dataHora: '2026-05-20T14:00', status: 'REALIZADA' }));
      fixture.detectChanges();

      expect(todos('app-confirmar-dialog').length).toBe(0);
      expect(todos('.detalhe-painel').length).toBe(0);
      expect(texto('.alert-success')).toBe('Evento marcado como realizado.');
      expect(texto('.loading')).toBe('Carregando...');
    });

    // O painel some ao fechar; sem devolver o foco, o Tab seguinte recomeçaria
    // do topo da página. É o contrato que o `ConfirmarDialogComponent` já segue.
    // Pela linha da lista, e não pelo chip da grade: a janela do Karma tem
    // 765px, dentro do `@media (max-width: 768px)` que esconde a grade, e
    // elemento com `display: none` não recebe foco.
    it('should return focus to the element that opened the panel', async () => {
      await setup();
      document.body.appendChild(fixture.nativeElement);

      try {
        const linha = (fixture.nativeElement as HTMLElement)
          .querySelector('.calendario-lista .agenda-evento') as HTMLButtonElement;
        linha.focus();
        linha.click();
        fixture.detectChanges();
        expect(document.activeElement).toBe(
          (fixture.nativeElement as HTMLElement).querySelector('.detalhe-painel'));

        clicar('.detalhe-fechar');

        expect(document.activeElement).toBe(linha);
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    // Com o painel aberto e focado, trocar de evento não pode eleger o próprio
    // painel como destino do foco: ele é o elemento que vai sumir ao fechar.
    it('should keep the original trigger when the panel swaps events', async () => {
      await setup();
      document.body.appendChild(fixture.nativeElement);

      try {
        const linhas = todos('.calendario-lista .agenda-evento') as HTMLButtonElement[];
        linhas[0].focus();
        linhas[0].click();
        fixture.detectChanges();
        // Foco está no painel; a troca de evento parte de dentro dele.
        linhas[1].click();
        fixture.detectChanges();

        clicar('.detalhe-fechar');

        expect(document.activeElement).toBe(linhas[0]);
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    // Trocar de evento com o painel aberto reaproveita a view: o setter do
    // `@ViewChild` não dispara, o foco fica no chip e só a região viva conta ao
    // leitor de tela que o painel passou a descrever outro evento.
    it('should announce the panel content when it swaps to another event', async () => {
      await setup();
      abrirPrimeiroEvento();
      const painel = (fixture.nativeElement as HTMLElement).querySelector('.detalhe-painel') as HTMLElement;
      expect(painel.getAttribute('aria-live')).toBe('polite');

      clicar('.calendario-grade .evento-aula');

      expect(texto('.detalhe-titulo')).toBe('Bruno Costa');
      // Mesmo elemento, conteúdo novo: é isso que a região viva anuncia.
      expect((fixture.nativeElement as HTMLElement).querySelector('.detalhe-painel')).toBe(painel);
    });

    // `!valor` barraria o profissional de id 0 exibindo "selecione um
    // profissional" com o nome dele visível no select.
    it('should accept a professional whose id is zero', async () => {
      await setup({ profissionais: [{ ...profissionais[0], id: 0, nome: 'Zero Fisio' }] });
      clicar('.calendario-grade .evento-aula');

      component.profissionalDaAcao = 0;
      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');

      expect(component.profissionalInvalido).toBeFalse();
      expect(aulaServiceSpy.realizar).toHaveBeenCalledWith(3, 0);
    });

    // Uma ação que falha não pode apagar da tela a agenda que continua válida.
    it('should keep the grid on screen when an action fails', async () => {
      await setup();
      sessaoServiceSpy.realizar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      abrirPrimeiroEvento();

      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');

      expect(component.erroAcao).toBe('Erro ao marcar o evento como realizado.');
      expect(component.erro).toBeNull();
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });

  // Bloqueios de agenda (issue #135): feriados, manutenções e eventos em que o
  // estúdio não funciona. Aparecem na grade sem virar evento — não abrem painel,
  // não entram nos filtros e não têm ação.
  describe('bloqueios de agenda', () => {
    /** Quinta-feira, 21/05/2026: a quinta célula da semana que abre em 17/05. */
    const INDICE_QUINTA = 4;

    it('should request the blocks for the same period as the events', async () => {
      await setup();

      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
    });

    it('should refetch the blocks when navigating to another period', async () => {
      await setup();
      bloqueioServiceSpy.listarPorPeriodo.calls.reset();

      component.navegar(1);
      fixture.detectChanges();

      expect(bloqueioServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-24', '2026-05-30');
    });

    it('should mark only the blocked cell, with the reason visible', async () => {
      await setup({ bloqueios: [bloqueioDaQuinta] });

      const celulas = todos('.calendario-celula');
      const marcas = todos('.calendario-celula .celula-bloqueio');
      expect(marcas.length).toBe(1);
      expect(marcas[0].textContent?.trim()).toBe('Feriado municipal');
      expect(celulas[INDICE_QUINTA].classList).toContain('celula-bloqueada');
      expect(celulas[0].classList).not.toContain('celula-bloqueada');
    });

    // A cor sozinha não distingue o dia bloqueado para quem usa leitor de tela:
    // a frase completa entra no rótulo da célula.
    it('should describe the block in the cell accessible label', async () => {
      await setup({ bloqueios: [bloqueioDaQuinta] });

      expect(todos('.calendario-celula')[INDICE_QUINTA].getAttribute('aria-label'))
        .toBe('21 de maio de 2026. Estúdio bloqueado: Feriado municipal — 21/05/2026, dia inteiro');
    });

    it('should render a block with a time range with its hours', async () => {
      const manutencao = bloqueio({
        id: 2,
        dataInicio: '2026-05-21',
        horaInicio: '08:00:00',
        horaFim: '12:00:00',
        motivo: 'Manutenção'
      });
      await setup({ bloqueios: [manutencao] });

      expect(todos('.calendario-celula')[INDICE_QUINTA].getAttribute('aria-label'))
        .toBe('21 de maio de 2026. Estúdio bloqueado: Manutenção — 21/05/2026, das 08:00 às 12:00');
    });

    // O bloqueio é uma condição do dia, não um evento dele: não pode entrar na
    // contagem do resumo nem abrir o painel de detalhe.
    it('should not turn the block into an event', async () => {
      await setup({ sessoes: [], aulas: [], bloqueios: [bloqueioDaQuinta] });

      expect(todos('.calendario-grade .evento').length).toBe(0);
      expect(component.grade.totalEventos).toBe(0);
      expect(component.eventoSelecionado).toBeNull();
    });

    it('should announce the blocked days in the live region', async () => {
      await setup({ sessoes: [], aulas: [], bloqueios: [bloqueioDaQuinta] });

      expect(texto('.calendario-resumo'))
        .toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período. 1 dia bloqueado no período.');
    });

    // Um feriado sem nenhuma aula marcada é justamente o que precisa aparecer:
    // na visão diária ele seria a única coisa a mostrar.
    it('should list a blocked day that has no events', async () => {
      await setup({ sessoes: [], aulas: [], bloqueios: [bloqueioDaQuinta] });
      component.alterarVisao('diaria');
      component.navegar(1);
      fixture.detectChanges();

      expect(component.diasDaLista.map(dia => dia.dia)).toEqual(['2026-05-21']);
      expect(texto('.calendario-lista .agenda-bloqueio'))
        .toBe('Estúdio bloqueado: Feriado municipal — 21/05/2026, dia inteiro');
      expect((fixture.nativeElement as HTMLElement).querySelector('.calendario-lista .empty-state')).toBeNull();
    });

    // O bloqueio é um aviso sobre a agenda: derrubar a grade porque o feriado
    // não carregou trocaria a informação principal pela acessória.
    it('should keep the agenda when the blocks request fails', async () => {
      await setup({ erroBloqueios: new HttpErrorResponse({ status: 500 }) });

      expect(component.erro).toBeNull();
      expect(component.bloqueios).toEqual([]);
      expect(todos('.calendario-grade .evento').length).toBe(3);
      expect(todos('.celula-bloqueio').length).toBe(0);
    });

    // Os filtros recortam eventos; o bloqueio é do dia e continua marcado.
    it('should keep the block visible under an active filter', async () => {
      await setup({ bloqueios: [bloqueioDaQuinta] });

      component.filtro.tipo = 'FISIOTERAPIA';
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(todos('.calendario-grade .evento').length).toBe(1);
      expect(todos('.calendario-celula .celula-bloqueio').length).toBe(1);
    });
  });
});
