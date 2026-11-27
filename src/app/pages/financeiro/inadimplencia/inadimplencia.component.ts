import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { PageMetadata } from '../../../core/models/common';
import {
  PagamentoFiltro,
  STATUS_INADIMPLENCIA_PADRAO,
  STATUS_PAGAMENTO_OPCOES
} from '../../../core/models/inadimplencia';
import { Ordenacao, proximaOrdenacao } from '../../../core/models/ordenacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PagamentoResponseDTO, STATUS_PAGAMENTO_LABEL, StatusPagamento } from '../../../core/models/plano';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { CobrancaDialogComponent } from '../../../shared/components/cobranca-dialog/cobranca-dialog.component';
import { PaginationSummaryComponent } from '../../../shared/components/pagination-summary/pagination-summary.component';
import { SortableHeaderComponent } from '../../../shared/components/sortable-header/sortable-header.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { extrairMensagemErro, extrairMensagemErroBlob } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { hojeIso } from '../../../shared/utils/calendario';
import {
  AtalhoInadimplencia,
  CAMPO_DIAS_ATRASO,
  atalhoDoFiltro,
  descreverAtraso,
  diasEmAtraso,
  filtroDoAtalho,
  sortDaInadimplencia,
  validarFaixaVencimento
} from '../../../shared/utils/inadimplencia';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/** Mesmos números da busca de paciente da lista de espera e da busca global. */
const TAMANHO_MINIMO_TERMO = 2;
const DEBOUNCE_MS = 300;
const TAMANHO_SUGESTOES = 8;

interface LinhaInadimplencia {
  pagamento: PagamentoResponseDTO;
  diasAtraso: number;
}

interface FiltroUI {
  status: Record<StatusPagamento, boolean>;
  vencimentoDe: string;
  vencimentoAte: string;
}

function filtroPadrao(): FiltroUI {
  return {
    status: Object.fromEntries(
      STATUS_PAGAMENTO_OPCOES.map(status => [status, STATUS_INADIMPLENCIA_PADRAO.includes(status)])
    ) as Record<StatusPagamento, boolean>,
    vencimentoDe: '',
    vencimentoAte: ''
  };
}

/**
 * Gestão de inadimplência (issue #127, só `ADMIN`).
 *
 * Lista global e paginada de pagamentos, aberta no que ainda está em aberto
 * (pendentes e vencidos, do vencimento mais antigo para o mais recente — ou
 * seja, do maior atraso para o menor). Filtros, paginação e ordenação são todos
 * do **servidor**: os dias em atraso são calculados aqui a partir de
 * `dataVencimento`, mas ordenar por eles vira `sort` por status e vencimento
 * (ver `sortDaInadimplencia`), para valer na base inteira e não só na página
 * exibida.
 *
 * Cada pagamento abre um diálogo de cobrança com o histórico de contatos e,
 * enquanto não estiver `PAGO`, o registro de um novo contato — o
 * `app-cobranca-dialog`, compartilhado com o financeiro do paciente (#302).
 *
 * A issue #290 acrescentou os atalhos de filtro (vencidas, vencem em 7 dias e
 * todas em aberto) e a exportação em Excel do último filtro aplicado.
 */
@Component({
  selector: 'app-inadimplencia',
  imports: [
    CurrencyPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CobrancaDialogComponent,
    PaginationSummaryComponent,
    SortableHeaderComponent,
    LocalDatePipe,
    CarregandoComponent, EmptyStateComponent
  ],
  templateUrl: './inadimplencia.component.html',
  styleUrl: './inadimplencia.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class InadimplenciaComponent implements OnInit {
  private readonly service = inject(PagamentoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly destroyRef = inject(DestroyRef);

  linhas: LinhaInadimplencia[] = [];
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly maxVisiblePages = 5;
  loading = false;
  erro: string | null = null;

  readonly ordenacaoPadrao: Ordenacao = { campo: 'dataVencimento', direcao: 'asc' };
  ordenacao: Ordenacao = { ...this.ordenacaoPadrao };
  readonly campoDiasAtraso = CAMPO_DIAS_ATRASO;

  readonly statusOpcoes = STATUS_PAGAMENTO_OPCOES;
  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  filtro: FiltroUI = filtroPadrao();
  /** Erro de validação dos filtros, mostrado no próprio painel. */
  erroFiltro: string | null = null;

  readonly atalhos: readonly { id: AtalhoInadimplencia; rotulo: string }[] = [
    { id: 'vencidas', rotulo: 'Vencidas' },
    { id: 'vencem7dias', rotulo: 'Vencem em 7 dias' },
    { id: 'emAberto', rotulo: 'Todas em aberto' }
  ];
  /** Atalho que descreve o filtro aplicado, para o `aria-pressed`. */
  atalhoAtivo: AtalhoInadimplencia | null = 'emAberto';

  exportando = false;
  /** Falha da exportação; separada de `erro` para não esconder a lista na tela. */
  erroExportacao: string | null = null;
  /**
   * Filtro que de fato produziu a lista. Separado de `filtro`, que o
   * `[(ngModel)]` move a cada clique: paginar ou reordenar não pode aplicar
   * um filtro que o usuário ainda não confirmou com **Buscar**.
   */
  private filtroAplicado: PagamentoFiltro = { status: [...STATUS_INADIMPLENCIA_PADRAO] };

  /**
   * Se o filtro aplicado difere do padrão (pendentes e vencidos, sem faixa nem
   * paciente). Só nesse caso o estado vazio oferece **Limpar filtros**: no
   * padrão, lista vazia quer dizer que não há inadimplência (issue #146).
   */
  get buscaPersonalizada(): boolean {
    const { status = [], vencimentoDe, vencimentoAte, pacienteId } = this.filtroAplicado;
    const statusPadrao = status.length === STATUS_INADIMPLENCIA_PADRAO.length
      && STATUS_INADIMPLENCIA_PADRAO.every(s => status.includes(s));
    return !statusPadrao || !!vencimentoDe || !!vencimentoAte || pacienteId != null;
  }

  readonly busca = new FormControl('', { nonNullable: true });
  sugestoes: PacienteResponseDTO[] = [];
  pacienteSelecionado: PacienteResponseDTO | null = null;
  buscando = false;
  buscaFalhou = false;
  readonly listaSugestoesId = 'inadimplencia-sugestoes-paciente';

  /** Pagamento com o diálogo de cobrança aberto; `null` com ele fechado. */
  cobranca: PagamentoResponseDTO | null = null;
  cobrancaDiasAtraso = 0;

  private listaSub: Subscription | null = null;

  ngOnInit(): void {
    this.observarBusca();
    this.carregar();
  }

  carregar(retryCount = 0): void {
    this.listaSub?.unsubscribe();
    this.loading = true;
    this.erro = null;
    this.listaSub = this.service
      .listarTodos(this.filtroAplicado, this.currentPage, this.pageSize, sortDaInadimplencia(this.ordenacao))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          const meta = page.page ?? ({} as Partial<PageMetadata>);
          const totalPages = meta.totalPages ?? this.totalPages;
          // Página que deixou de existir (ex.: o último vencido da página foi
          // pago em outra aba): volta para a última válida.
          if (totalPages > 0 && this.currentPage >= totalPages && retryCount < 3) {
            this.currentPage = totalPages - 1;
            this.carregar(retryCount + 1);
            return;
          }

          // Um único "hoje" por carga: a virada da meia-noite no meio do
          // `map` não pode deixar duas linhas com referências diferentes.
          const hoje = hojeIso();
          this.linhas = page.content.map(pagamento => ({ pagamento, diasAtraso: diasEmAtraso(pagamento, hoje) }));
          this.totalElements = meta.totalElements ?? this.totalElements;
          this.totalPages = totalPages;
          this.currentPage = typeof meta.number === 'number' && meta.number >= 0 ? meta.number : this.currentPage;
          this.pageSize = this.pageSizeOptions.includes(meta.size as number) ? (meta.size as number) : this.pageSize;
          this.loading = false;
        },
        error: err => {
          this.linhas = [];
          this.erro = extrairMensagemErro(err, 'Erro ao carregar pagamentos.');
          this.loading = false;
        }
      });
  }

  /**
   * Valida e aplica os filtros. A faixa invertida e a ausência de status são
   * recusadas aqui, com a mensagem na hora, em vez de custar o `400` da API —
   * e sem descartar a lista que já está na tela, que continua descrevendo o
   * último filtro aplicado.
   */
  buscar(): void {
    const status = this.statusSelecionados();
    if (status.length === 0) {
      this.erroFiltro = 'Selecione ao menos um status.';
      return;
    }
    const faixaInvalida = validarFaixaVencimento(this.filtro.vencimentoDe, this.filtro.vencimentoAte);
    if (faixaInvalida !== null) {
      this.erroFiltro = faixaInvalida;
      return;
    }

    this.erroFiltro = null;
    this.filtroAplicado = {
      status,
      vencimentoDe: this.filtro.vencimentoDe || undefined,
      vencimentoAte: this.filtro.vencimentoAte || undefined,
      pacienteId: this.pacienteSelecionado?.id
    };
    this.atalhoAtivo = atalhoDoFiltro(this.filtroAplicado);
    this.currentPage = 0;
    this.carregar();
  }

  /**
   * Preenche status e faixa de vencimento do atalho, a partir do dia local, e
   * já busca. O paciente escolhido continua: "vencidas da Ana" é uma consulta
   * legítima.
   */
  aplicarAtalho(atalho: AtalhoInadimplencia): void {
    const { status, vencimentoDe, vencimentoAte } = filtroDoAtalho(atalho, hojeIso());
    this.filtro = {
      status: Object.fromEntries(STATUS_PAGAMENTO_OPCOES.map(s => [s, status.includes(s)])) as Record<
        StatusPagamento,
        boolean
      >,
      vencimentoDe: vencimentoDe ?? '',
      vencimentoAte: vencimentoAte ?? ''
    };
    this.buscar();
  }

  /**
   * Exporta em Excel o **último filtro aplicado** e a ordenação da tabela, sem
   * paginação: a planilha traz as mesmas linhas da lista somando todas as
   * páginas, e não o que ainda está sendo editado no painel. O `400` de teto
   * (mais de 5000 pagamentos) chega com o corpo em `Blob`, lido por
   * `extrairMensagemErroBlob` para mostrar o `detail` da API.
   */
  exportar(): void {
    if (this.exportando) return;
    this.exportando = true;
    this.erroExportacao = null;
    this.service
      .exportar(this.filtroAplicado, sortDaInadimplencia(this.ordenacao))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          try {
            baixarBlob(response, `cobrancas-${hojeIso()}.xlsx`);
          } catch {
            this.erroExportacao = 'Erro ao exportar as cobranças em Excel.';
          } finally {
            this.exportando = false;
          }
        },
        error: (err: unknown) => {
          void extrairMensagemErroBlob(err, 'Erro ao exportar as cobranças em Excel.').then(mensagem => {
            this.erroExportacao = mensagem;
            this.exportando = false;
          });
        }
      });
  }

  limparFiltros(): void {
    this.filtro = filtroPadrao();
    this.limparPaciente();
    this.ordenacao = { ...this.ordenacaoPadrao };
    this.buscar();
  }

  private statusSelecionados(): StatusPagamento[] {
    return this.statusOpcoes.filter(status => this.filtro.status[status]);
  }

  /**
   * Busca de paciente com debounce, como na lista de espera — inclusive
   * inativos, porque deixar o estúdio não quita o que ficou em aberto. A falha
   * vira `buscaFalhou`, e não faixa de erro: a listagem continua válida.
   */
  private observarBusca(): void {
    this.busca.valueChanges
      .pipe(
        map(termo => termo.trim()),
        // Antes do debounce pelo mesmo motivo da lista de espera: depois dele,
        // a limpeza emitida ao selecionar seria engolida e redigitar o mesmo
        // nome não buscaria nada.
        distinctUntilChanged(),
        debounceTime(DEBOUNCE_MS),
        switchMap(termo => {
          if (termo.length < TAMANHO_MINIMO_TERMO) {
            this.buscando = false;
            this.buscaFalhou = false;
            return of<PacienteResponseDTO[] | null>([]);
          }
          this.buscando = true;
          this.buscaFalhou = false;
          return this.pacienteService.listar(0, TAMANHO_SUGESTOES, { nome: termo }, 'nome').pipe(
            map(pagina => pagina.content),
            catchError(() => of(null))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(pacientes => {
        this.buscando = false;
        this.buscaFalhou = pacientes === null;
        this.sugestoes = pacientes ?? [];
      });
  }

  selecionarPaciente(paciente: PacienteResponseDTO): void {
    this.pacienteSelecionado = paciente;
    this.sugestoes = [];
    this.busca.setValue('');
  }

  limparPaciente(): void {
    this.pacienteSelecionado = null;
    this.sugestoes = [];
    this.busca.setValue('');
  }

  ordenar(campo: string): void {
    this.ordenacao = proximaOrdenacao(this.ordenacao, campo, this.ordenacaoPadrao);
    this.currentPage = 0;
    this.carregar();
  }

  pagina(p: number): void {
    if (p < 0 || p >= this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.carregar();
  }

  alterarTamanhoPagina(size: number): void {
    if (!this.pageSizeOptions.includes(size) || size === this.pageSize) return;
    this.pageSize = size;
    this.currentPage = 0;
    this.carregar();
  }

  pages(): number[] {
    if (this.totalPages <= this.maxVisiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i);
    }
    const start = Math.max(0, Math.min(this.currentPage - 2, this.totalPages - this.maxVisiblePages));
    return Array.from({ length: this.maxVisiblePages }, (_, i) => start + i);
  }

  descreverAtraso(dias: number): string {
    return descreverAtraso(dias);
  }

  // ----- Diálogo de cobrança -----

  abrirCobranca(linha: LinhaInadimplencia): void {
    this.cobranca = linha.pagamento;
    this.cobrancaDiasAtraso = linha.diasAtraso;
  }

  /** O diálogo só pede para fechar quando não há registro em andamento. */
  fecharCobranca(): void {
    this.cobranca = null;
  }
}
