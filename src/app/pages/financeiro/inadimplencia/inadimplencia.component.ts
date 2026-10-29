import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { PageMetadata } from '../../../core/models/common';
import {
  COBRANCA_OBSERVACAO_MAX,
  ContatoCobrancaDTO,
  PagamentoFiltro,
  STATUS_INADIMPLENCIA_PADRAO,
  STATUS_PAGAMENTO_OPCOES
} from '../../../core/models/inadimplencia';
import { Ordenacao, proximaOrdenacao } from '../../../core/models/ordenacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PagamentoResponseDTO, STATUS_PAGAMENTO_LABEL, StatusPagamento } from '../../../core/models/plano';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { PaginationSummaryComponent } from '../../../shared/components/pagination-summary/pagination-summary.component';
import { SortableHeaderComponent } from '../../../shared/components/sortable-header/sortable-header.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { hojeIso } from '../../../shared/utils/calendario';
import {
  CAMPO_DIAS_ATRASO,
  descreverAtraso,
  diasEmAtraso,
  formatarDataHora,
  sortDaInadimplencia,
  validarFaixaVencimento
} from '../../../shared/utils/inadimplencia';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

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

/** A API recusa com `400` um contato com data futura. */
function naoFutura(hoje: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;
    return valor && valor > hoje() ? { dataFutura: true } : null;
  };
}

/** `Validators.required` aceita "   "; a API, não. */
function naoEmBranco(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0 ? { emBranco: true } : null;
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
 * enquanto não estiver `PAGO`, o registro de um novo contato.
 */
@Component({
  selector: 'app-inadimplencia',
  imports: [
    CurrencyPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ConfirmarDialogComponent,
    PaginationSummaryComponent,
    SortableHeaderComponent,
    LocalDatePipe,
    CarregandoComponent
  ],
  templateUrl: './inadimplencia.component.html',
  styleUrl: './inadimplencia.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class InadimplenciaComponent implements OnInit {
  private readonly service = inject(PagamentoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly fb = inject(FormBuilder);
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
  /**
   * Filtro que de fato produziu a lista. Separado de `filtro`, que o
   * `[(ngModel)]` move a cada clique: paginar ou reordenar não pode aplicar
   * um filtro que o usuário ainda não confirmou com **Buscar**.
   */
  private filtroAplicado: PagamentoFiltro = { status: [...STATUS_INADIMPLENCIA_PADRAO] };

  readonly busca = new FormControl('', { nonNullable: true });
  sugestoes: PacienteResponseDTO[] = [];
  pacienteSelecionado: PacienteResponseDTO | null = null;
  buscando = false;
  buscaFalhou = false;
  readonly listaSugestoesId = 'inadimplencia-sugestoes-paciente';

  /** Pagamento com o diálogo de cobrança aberto; `null` com ele fechado. */
  cobranca: PagamentoResponseDTO | null = null;
  cobrancaDiasAtraso = 0;
  contatos: ContatoCobrancaDTO[] = [];
  carregandoContatos = false;
  erroContatos: string | null = null;
  registrando = false;
  erroCobranca: string | null = null;
  sucessoCobranca: string | null = null;
  readonly observacaoMax = COBRANCA_OBSERVACAO_MAX;
  /** Teto do campo de data; recalculado a cada abertura do diálogo. */
  hoje = hojeIso();
  readonly cobrancaForm: FormGroup = this.fb.group({
    dataContato: ['', [Validators.required, naoFutura(() => this.hoje)]],
    observacao: ['', [Validators.required, naoEmBranco, Validators.maxLength(COBRANCA_OBSERVACAO_MAX)]]
  });

  private listaSub: Subscription | null = null;
  private contatosSub: Subscription | null = null;

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
    this.currentPage = 0;
    this.carregar();
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

  formatarDataHora(valor: string): string {
    return formatarDataHora(valor);
  }

  // ----- Diálogo de cobrança -----

  abrirCobranca(linha: LinhaInadimplencia): void {
    this.cobranca = linha.pagamento;
    this.cobrancaDiasAtraso = linha.diasAtraso;
    this.erroCobranca = null;
    this.sucessoCobranca = null;
    this.hoje = hojeIso();
    // O contato costuma ser registrado logo depois de acontecer.
    this.cobrancaForm.reset({ dataContato: this.hoje, observacao: '' });
    this.carregarContatos();
  }

  fecharCobranca(): void {
    if (this.registrando) return;
    // Resposta atrasada do histórico não pode cair no diálogo do próximo pagamento.
    this.contatosSub?.unsubscribe();
    this.contatosSub = null;
    this.cobranca = null;
    this.contatos = [];
    this.carregandoContatos = false;
    this.erroContatos = null;
  }

  get podeRegistrarContato(): boolean {
    return this.cobranca !== null && this.cobranca.status !== 'PAGO';
  }

  campoCobranca(nome: 'dataContato' | 'observacao'): AbstractControl {
    return this.cobrancaForm.get(nome) as AbstractControl;
  }

  get tamanhoObservacao(): number {
    return ((this.campoCobranca('observacao').value as string | null) ?? '').length;
  }

  private carregarContatos(): void {
    const pagamento = this.cobranca;
    if (pagamento === null) return;

    this.contatosSub?.unsubscribe();
    this.carregandoContatos = true;
    this.erroContatos = null;
    this.contatosSub = this.service
      .listarCobrancas(pagamento.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: contatos => {
          this.contatos = contatos;
          this.carregandoContatos = false;
        },
        error: err => {
          this.contatos = [];
          this.erroContatos = extrairMensagemErro(err, 'Não foi possível carregar os contatos de cobrança.');
          this.carregandoContatos = false;
        }
      });
  }

  registrarContato(): void {
    const pagamento = this.cobranca;
    if (pagamento === null || this.registrando || !this.podeRegistrarContato) return;

    this.sucessoCobranca = null;
    if (this.cobrancaForm.invalid) {
      this.cobrancaForm.markAllAsTouched();
      return;
    }

    const { dataContato, observacao } = this.cobrancaForm.getRawValue() as { dataContato: string; observacao: string };
    this.registrando = true;
    this.erroCobranca = null;
    this.service
      .registrarCobranca(pagamento.id, { dataContato, observacao: observacao.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.registrando = false;
          this.sucessoCobranca = 'Contato de cobrança registrado.';
          this.cobrancaForm.reset({ dataContato: this.hoje, observacao: '' });
          // Recarrega em vez de inserir no topo: a ordem é do servidor, e um
          // contato com data retroativa não necessariamente é o primeiro.
          this.carregarContatos();
        },
        error: (err: HttpErrorResponse) => {
          this.registrando = false;
          if (err.status === 422) {
            // O pagamento foi quitado depois que a lista foi carregada: o
            // diálogo passa a refletir isso e a lista é atualizada.
            this.cobranca = { ...pagamento, status: 'PAGO' };
            this.erroCobranca = extrairMensagemErro(
              err,
              'Este pagamento já foi quitado e não aceita novos contatos de cobrança.'
            );
            this.carregar();
            return;
          }
          if (err.status === 404) {
            this.erroCobranca = extrairMensagemErro(err, 'Pagamento não encontrado.');
            this.carregar();
            return;
          }
          this.erroCobranca = extrairMensagemErro(err, 'Erro ao registrar contato de cobrança.');
        }
      });
  }
}
