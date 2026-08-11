import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SessaoResponseDTO, SessaoTipo, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import {
  CALENDARIO_STATUS_LABEL,
  CalendarioDia,
  CalendarioEvento,
  CalendarioGrade,
  CalendarioOrigem,
  CalendarioStatus,
  DIAS_SEMANA_ABREVIADO,
  DIAS_SEMANA_EXTENSO,
  formatarDiaExtenso,
  hojeIso,
  intervaloDoPeriodo,
  mapearEventosComPaciente,
  montarGrade,
  navegarPeriodo
} from '../../../shared/utils/calendario';

/**
 * Visões da agenda do estúdio. O calendário do paciente também oferece a
 * mensal, que aqui ficaria ilegível: um mês inteiro de atendimentos de **todos**
 * os pacientes não cabe numa célula de 92px.
 */
export type AgendaVisao = 'semanal' | 'diaria';

/**
 * O filtro de tipo mistura o tipo da sessão com a origem "aula": para quem
 * olha a agenda, "Pilates", "Fisioterapia" e "Aula" são três coisas na mesma
 * escala, e não dois eixos.
 */
export type AgendaFiltroTipo = 'todos' | SessaoTipo | 'AULA';
export type AgendaFiltroStatus = 'todos' | CalendarioStatus;
type AgendaAcao = 'realizar' | 'cancelar';

/** Página de profissionais grande o bastante para caber o quadro do estúdio. */
const TAMANHO_PAGINA_PROFISSIONAIS = 100;

/**
 * Agenda geral do estúdio (issue #125): todas as aulas e sessões do período, de
 * todos os pacientes. Até aqui as duas coleções só podiam ser consultadas
 * **por paciente**, e responder "o que acontece no estúdio esta semana?" exigia
 * varrer paciente por paciente.
 *
 * Diferente do calendário do paciente (issue #119), que carrega o prontuário
 * inteiro de uma vez e recorta no cliente, aqui a coleção é **do período**:
 * trocar de semana ou de dia busca de novo, porque o estúdio inteiro num ano
 * não caberia numa resposta só (a API limita o período a 92 dias e a resposta a
 * 5000 registros). Já os filtros são recorte no cliente, sobre o que o período
 * trouxe: não custam ida ao servidor e permitem o filtro combinado "Aula", que
 * nenhum par de parâmetros do endpoint expressa.
 */
@Component({
  selector: 'app-agenda',
  imports: [FormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaComponent implements OnInit, OnDestroy {
  visao: AgendaVisao = 'semanal';
  /**
   * Data do relógio, resolvida uma vez na inicialização. Não é lida no template
   * (que a reavaliaria a cada ciclo de detecção de mudanças) nem dentro das
   * funções de grade, que a recebem por parâmetro para o spec poder fixá-la.
   */
  readonly hoje = hojeIso();
  /** Dia âncora do período exibido; começa em hoje e é o que a navegação move. */
  referencia = this.hoje;

  /** Tudo o que o período trouxe, antes do recorte dos filtros. */
  eventos: CalendarioEvento[] = [];
  grade: CalendarioGrade = montarGrade('semanal', this.referencia, [], this.hoje);
  profissionais: ProfissionalResponseDTO[] = [];

  filtro: { profissionalId: 'todos' | number; tipo: AgendaFiltroTipo; status: AgendaFiltroStatus } = {
    profissionalId: 'todos',
    tipo: 'todos',
    status: 'todos'
  };
  filtrosAbertos = false;

  loading = false;
  /**
   * Falha da **carga** do período: esconde a grade, que não teria o que
   * mostrar. Separada de `erroAcao` de propósito — uma ação que falha não pode
   * apagar da tela a agenda que continua válida.
   */
  erro: string | null = null;
  erroAcao: string | null = null;
  sucesso: string | null = null;

  /** Evento aberto no painel de detalhe; `null` com o painel fechado. */
  eventoSelecionado: CalendarioEvento | null = null;
  /**
   * Profissional escolhido para concluir uma aula que ainda não tem um. O
   * `PATCH /aulas/{id}/realizar` exige o profissional, e a aula pode chegar sem
   * nenhum atribuído.
   */
  profissionalDaAcao: number | null = null;
  profissionalInvalido = false;
  acaoPendente: AgendaAcao | null = null;
  acaoEmAndamento = false;

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly diasSemana = DIAS_SEMANA_ABREVIADO.map((abreviado, indice) => ({
    abreviado,
    extenso: DIAS_SEMANA_EXTENSO[indice]
  }));

  readonly opcoesTipo: { valor: AgendaFiltroTipo; rotulo: string }[] = [
    { valor: 'PILATES', rotulo: SESSAO_TIPO_LABEL.PILATES },
    { valor: 'FISIOTERAPIA', rotulo: SESSAO_TIPO_LABEL.FISIOTERAPIA },
    { valor: 'AULA', rotulo: 'Aula' }
  ];

  readonly opcoesStatus: { valor: CalendarioStatus; rotulo: string }[] = [
    { valor: 'AGENDADA', rotulo: CALENDARIO_STATUS_LABEL.AGENDADA },
    { valor: 'REALIZADA', rotulo: CALENDARIO_STATUS_LABEL.REALIZADA },
    { valor: 'CANCELADA', rotulo: CALENDARIO_STATUS_LABEL.CANCELADA }
  ];

  /**
   * A forma do chip diz a origem e a cor diz a situação, como no calendário do
   * paciente. Ficam em mapas, e não concatenados no template, para que
   * `evento-SESSAO` não vire nome de classe.
   */
  private readonly classeOrigem: Record<CalendarioOrigem, string> = {
    SESSAO: 'evento-sessao',
    AULA: 'evento-aula'
  };

  private readonly classeStatus: Record<CalendarioStatus, string> = {
    AGENDADA: 'evento-agendada',
    REALIZADA: 'evento-realizada',
    CANCELADA: 'evento-cancelada'
  };

  /**
   * As cinco combinações que de fato aparecem: a aula não tem cancelamento na
   * API (só o booleano `realizada`), e anunciar uma "aula cancelada" que nunca
   * chega a existir só confundiria a leitura da grade.
   */
  readonly legenda = [
    { chave: 'sessao-agendada', origem: 'SESSAO' as const, status: 'AGENDADA' as const, rotulo: 'Sessão agendada' },
    { chave: 'sessao-realizada', origem: 'SESSAO' as const, status: 'REALIZADA' as const, rotulo: 'Sessão realizada' },
    { chave: 'sessao-cancelada', origem: 'SESSAO' as const, status: 'CANCELADA' as const, rotulo: 'Sessão cancelada' },
    { chave: 'aula-agendada', origem: 'AULA' as const, status: 'AGENDADA' as const, rotulo: 'Aula agendada' },
    { chave: 'aula-realizada', origem: 'AULA' as const, status: 'REALIZADA' as const, rotulo: 'Aula realizada' }
  ].map(item => ({
    ...item,
    classes: `evento-marca ${this.classeOrigem[item.origem]} ${this.classeStatus[item.status]}`
  }));

  /**
   * Elemento que abriu o painel, para devolver o foco ao fechar — mesmo
   * contrato do `ConfirmarDialogComponent`. Sem isso o Tab seguinte recomeça do
   * topo da página, já que fechar destrói o elemento que estava focado.
   */
  private disparadorDoPainel: HTMLElement | null = null;

  /**
   * O painel de detalhe abre longe do chip clicado (fica sob a barra de
   * período), então o foco precisa ir junto — senão o Tab seguinte continuaria
   * de onde estava e o leitor de tela não anunciaria nada. O setter dispara na
   * resolução da query, isto é, **quando o painel entra no DOM**: trocar de
   * evento com o painel já aberto não o reexecuta, e é o `aria-live` do painel
   * que anuncia o conteúdo novo nesse caso.
   */
  @ViewChild('painelDetalhe') set painelDetalhe(painel: ElementRef<HTMLElement> | undefined) {
    painel?.nativeElement.focus();
  }

  constructor(
    private sessaoService: SessaoService,
    private aulaService: AulaService,
    private profissionalService: ProfissionalService,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarProfissionais();
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
  }

  /**
   * Só alimenta o filtro por profissional e o select de conclusão da aula. Uma
   * falha aqui não impede de ler a agenda, então não acende a faixa de erro —
   * as duas listas simplesmente ficam vazias.
   */
  private carregarProfissionais(): void {
    this.profissionalService.listar(0, TAMANHO_PAGINA_PROFISSIONAIS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: page => {
        this.profissionais = page.content;
        this.cdr.markForCheck();
      },
      error: () => {
        this.profissionais = [];
        this.cdr.markForCheck();
      }
    });
  }

  carregar(): void {
    const { inicio, fim } = intervaloDoPeriodo(this.visao, this.referencia);

    this.loading = true;
    this.erro = null;
    this.erroAcao = null;
    this.fecharDetalhe();

    forkJoin({
      sessoes: this.sessaoService.listarPorPeriodo(inicio, fim),
      aulas: this.aulaService.listarPorPeriodo(inicio, fim)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessoes, aulas }: { sessoes: SessaoResponseDTO[]; aulas: AulaResponseDTO[] }) => {
          this.eventos = mapearEventosComPaciente(sessoes, aulas);
          this.atualizarGrade();
          this.loading = false;
          this.cdr.markForCheck();
        },
        // O `forkJoin` colapsa as duas falhas num ramo só, então a mensagem não
        // pode culpar nenhuma das duas listagens em particular.
        error: err => {
          this.eventos = [];
          this.atualizarGrade();
          this.erro = extrairMensagemErro(err, 'Não foi possível carregar a agenda.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Único ponto que remonta a grade: visão, navegação, filtros e carga passam
   * todos por aqui, então não há como o cabeçalho anunciar um período e as
   * células mostrarem outro. Com `OnPush` o `markForCheck` é obrigatório — os
   * cliques já marcam a view suja, mas a remontagem disparada pela carga não
   * marcaria.
   */
  private atualizarGrade(): void {
    this.grade = montarGrade(this.visao, this.referencia, this.eventosFiltrados(), this.hoje);
    this.cdr.markForCheck();
  }

  /** Recorte no cliente sobre o que o período trouxe. */
  private eventosFiltrados(): CalendarioEvento[] {
    return this.eventos.filter(evento => {
      if (this.filtro.profissionalId !== 'todos' && evento.profissionalId !== this.filtro.profissionalId) return false;
      if (this.filtro.status !== 'todos' && evento.status !== this.filtro.status) return false;
      if (this.filtro.tipo === 'todos') return true;
      // "Aula" é a própria origem; os demais valores são o tipo da sessão.
      if (this.filtro.tipo === 'AULA') return evento.origem === 'AULA';
      return evento.tipo === this.filtro.tipo;
    });
  }

  aplicarFiltros(): void {
    this.fecharDetalhe();
    this.atualizarGrade();
  }

  limparFiltros(): void {
    this.filtro = { profissionalId: 'todos', tipo: 'todos', status: 'todos' };
    this.aplicarFiltros();
  }

  get temFiltroAtivo(): boolean {
    return this.filtrosAtivos > 0;
  }

  get filtrosAtivos(): number {
    return [this.filtro.profissionalId, this.filtro.tipo, this.filtro.status]
      .filter(valor => valor !== 'todos').length;
  }

  alternarFiltros(): void {
    this.filtrosAbertos = !this.filtrosAbertos;
  }

  /**
   * Trocar de visão preserva o dia âncora — sair da semana do dia 20 abre
   * exatamente o dia 20 — e busca de novo: o período mudou de tamanho.
   */
  alterarVisao(visao: AgendaVisao): void {
    if (this.visao === visao) return;
    this.visao = visao;
    this.carregar();
  }

  navegar(direcao: -1 | 1): void {
    this.referencia = navegarPeriodo(this.visao, this.referencia, direcao);
    this.carregar();
  }

  irParaHoje(): void {
    if (this.noPeriodoAtual) return;
    this.referencia = this.hoje;
    this.carregar();
  }

  get noPeriodoAtual(): boolean {
    return this.grade.dias.some(dia => dia.hoje && dia.doPeriodo);
  }

  get rotuloAnterior(): string {
    return this.visao === 'diaria' ? 'Dia anterior' : 'Semana anterior';
  }

  get rotuloProximo(): string {
    return this.visao === 'diaria' ? 'Próximo dia' : 'Próxima semana';
  }

  /**
   * Dias do período que têm evento. É a lista da visão diária e do mobile, onde
   * a grade de 7 colunas não cabe. Sai da mesma `grade.dias` da grade, então as
   * duas leituras não podem divergir.
   */
  get diasComEventos(): CalendarioDia[] {
    return this.grade.dias.filter(dia => dia.doPeriodo && dia.eventos.length > 0);
  }

  /**
   * Texto da região viva que anuncia o período. Sem ele a navegação é silenciosa
   * para o leitor de tela: a grade inteira troca de conteúdo sem nenhum retorno.
   */
  get resumoPeriodo(): string {
    if (this.loading || this.erro) return '';
    const total = this.grade.totalEventos;
    const recorte = this.temFiltroAtivo ? ' (com filtros)' : '';
    if (total === 0) return `${this.grade.titulo}: nenhuma sessão ou aula no período${recorte}.`;
    return `${this.grade.titulo}: ${total} ${total === 1 ? 'evento' : 'eventos'} no período${recorte}.`;
  }

  /**
   * Os dois mapas são totais sobre as uniões declaradas, mas o tipo não vale
   * como garantia do que chega no JSON: o mapeamento já trata uma situação fora
   * da união e cairia aqui como `undefined`, virando a classe literal
   * `"undefined"` no DOM. A classe ausente é omitida — sem os tokens de situação
   * o chip degrada para um contorno neutro em `currentColor`, e a situação real
   * continua escrita no `aria-label` e na linha da agenda.
   */
  classesDoEvento(evento: CalendarioEvento, base: string): string {
    return [base, this.classeOrigem[evento.origem], this.classeStatus[evento.status]]
      .filter(Boolean)
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // Detalhe e ações rápidas
  // ---------------------------------------------------------------------------

  abrirDetalhe(evento: CalendarioEvento): void {
    // O clique já deixou o chip focado; é para ele que o foco volta ao fechar.
    // Foco vindo de dentro do próprio painel não serve de destino — o painel
    // some ao fechar —, então nesse caso o disparador original é preservado.
    const ativo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (ativo?.closest('.detalhe-painel') === null) this.disparadorDoPainel = ativo;
    this.eventoSelecionado = evento;
    this.profissionalDaAcao = evento.profissionalId;
    this.profissionalInvalido = false;
    this.erroAcao = null;
  }

  fecharDetalhe(): void {
    if (this.acaoEmAndamento) return;

    const disparador = this.disparadorDoPainel;
    this.disparadorDoPainel = null;
    this.eventoSelecionado = null;
    this.acaoPendente = null;
    this.profissionalDaAcao = null;
    this.profissionalInvalido = false;
    this.erroAcao = null;

    // Só devolve o foco se o chip ainda estiver na página: depois de uma ação a
    // grade é recarregada e o elemento que abriu o painel deixa o DOM.
    if (disparador?.isConnected) disparador.focus();
  }

  /** Sessão e aula compartilham a conclusão; só a sessão pode ser cancelada. */
  get podeRealizar(): boolean {
    return this.eventoSelecionado?.status === 'AGENDADA';
  }

  get podeCancelar(): boolean {
    return this.eventoSelecionado?.origem === 'SESSAO' && this.eventoSelecionado.status === 'AGENDADA';
  }

  /** A conclusão da aula exige um profissional; a da sessão, não. */
  get exigeProfissional(): boolean {
    return this.eventoSelecionado?.origem === 'AULA';
  }

  /**
   * "20 de maio de 2026 às 14:00". Formatado aqui, e não pelo `DatePipe`: o dia
   * circula como `yyyy-MM-dd` justamente para não passar por construtor de
   * `Date` a partir de string ISO, que o interpretaria como UTC e mostraria o
   * dia anterior no fuso do estúdio.
   */
  get dataDoDetalhe(): string {
    const evento = this.eventoSelecionado;
    if (evento === null) return '';
    const dia = formatarDiaExtenso(evento.dia);
    return evento.horario ? `${dia} às ${evento.horario}` : `${dia}, sem horário definido`;
  }

  aoSelecionarProfissional(): void {
    if (!this.profissionalInvalido) return;
    this.profissionalInvalido = false;
    this.erroAcao = null;
  }

  solicitarAcao(acao: AgendaAcao): void {
    if (this.eventoSelecionado === null || this.acaoEmAndamento) return;

    // `=== null` e não `!valor`: id é number, e o falsy barraria o profissional
    // de id 0 mostrando "selecione um profissional" com um nome no select.
    if (acao === 'realizar' && this.exigeProfissional && this.profissionalDaAcao === null) {
      this.profissionalInvalido = true;
      this.erroAcao = 'Selecione um profissional para marcar a aula como realizada.';
      return;
    }

    this.profissionalInvalido = false;
    this.erroAcao = null;
    this.acaoPendente = acao;
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.acaoPendente = null;
  }

  get tituloConfirmacao(): string {
    return this.acaoPendente === 'cancelar' ? 'Cancelar sessão' : 'Marcar como realizada';
  }

  get mensagemConfirmacao(): string {
    const evento = this.eventoSelecionado;
    if (evento === null || this.acaoPendente === null) return '';
    const identificacao = `${evento.rotulo} de ${evento.paciente} em ${formatarDiaExtenso(evento.dia)}`;
    return this.acaoPendente === 'cancelar'
      ? `Cancelar ${identificacao}? O cancelamento não pode ser desfeito pela agenda.`
      : `Marcar ${identificacao} como realizada?`;
  }

  confirmarAcao(): void {
    const evento = this.eventoSelecionado;
    const acao = this.acaoPendente;
    if (evento === null || acao === null || this.acaoEmAndamento) return;

    // A conclusão da aula é revalidada aqui, e não só em `solicitarAcao`: as
    // duas rodam em cliques diferentes, com o estado mutável no meio, e o que
    // sairia daqui é `?profissionalId=null`.
    const profissionalDaAula = this.profissionalDaAcao;
    if (acao === 'realizar' && evento.origem === 'AULA' && profissionalDaAula === null) return;

    // O DTO devolvido é descartado — a grade é remontada pela recarga do
    // período —, então o tipo do ramo escolhido não importa aqui.
    const requisicao$: Observable<unknown> = acao === 'cancelar'
      ? this.sessaoService.cancelar(evento.id)
      : evento.origem === 'SESSAO'
        ? this.sessaoService.realizar(evento.id)
        : this.aulaService.realizar(evento.id, profissionalDaAula as number);

    this.acaoEmAndamento = true;
    requisicao$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.acaoPendente = null;
        this.eventoSelecionado = null;
        this.disparadorDoPainel = null;
        this.exibirSucesso(acao === 'cancelar' ? 'Sessão cancelada.' : 'Evento marcado como realizado.');
        // Recarrega o período: a ação mudou o status no servidor, e a grade
        // precisa refletir isso sem que o usuário navegue.
        this.carregar();
        // Obrigatório com `OnPush`: a resposta chega fora de qualquer evento de
        // template, e sem isto o diálogo continuaria na tela, travando o scroll
        // do fundo, até a recarga do período responder.
        this.cdr.markForCheck();
      },
      error: err => {
        this.acaoEmAndamento = false;
        this.acaoPendente = null;
        this.erroAcao = extrairMensagemErro(
          err,
          acao === 'cancelar' ? 'Erro ao cancelar a sessão.' : 'Erro ao marcar o evento como realizado.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => {
      this.sucesso = null;
      this.cdr.markForCheck();
    }, 4000);
  }

  trackByDia(_indice: number, dia: CalendarioDia): string {
    return dia.dia;
  }

  trackByEvento(_indice: number, evento: CalendarioEvento): string {
    return evento.chave;
  }
}
