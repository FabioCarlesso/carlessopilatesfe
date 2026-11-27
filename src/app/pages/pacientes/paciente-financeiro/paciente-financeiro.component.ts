import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PAPEIS } from '../../../core/models/auth';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import {
  DIAS_SEMANA_LABEL,
  FORMA_PAGAMENTO_LABEL,
  FREQUENCIA_LABEL,
  PagamentoResponseDTO,
  PlanoResponseDTO,
  STATUS_PAGAMENTO_LABEL,
  StatusPagamento,
  TIPO_LABEL
} from '../../../core/models/plano';
import { AuthService } from '../../../core/services/auth.service';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { CobrancaDialogComponent } from '../../../shared/components/cobranca-dialog/cobranca-dialog.component';
import { GraficoProporcaoComponent } from '../../../shared/components/grafico-proporcao/grafico-proporcao.component';
import { PagarPagamentoDialogComponent } from '../../../shared/components/pagar-pagamento-dialog/pagar-pagamento-dialog.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { hojeIso } from '../../../shared/utils/calendario';
import { SegmentoProporcao } from '../../../shared/utils/grafico-proporcao';
import {
  SituacaoPacote,
  contagemDoPacote,
  historicoDePlanos,
  ordenarNfsesRecentesPrimeiro,
  pacoteAtual,
  resumirPagamentos,
  separarPagamentos,
  situacaoPagamento
} from '../../../shared/utils/historico-financeiro';
import { normalizarHora } from '../../../shared/utils/hora';
import { descreverAtraso, diasEmAtraso } from '../../../shared/utils/inadimplencia';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

/** Linha das tabelas de pagamentos com a situação já calculada para hoje. */
export interface PagamentoNoHistorico {
  pagamento: PagamentoResponseDTO;
  situacao: StatusPagamento;
  diasAtraso: number;
  atraso: string;
}

/** Quantas NFSEs o bloco mostra; as demais ficam na subtela de NFSEs. */
export const NFSES_NO_BLOCO = 5;

const TITULO_PACOTE: Record<SituacaoPacote, string> = {
  EM_CURSO: 'Pacote em curso',
  ENCERRADO: 'Último pacote, já encerrado',
  FUTURO: 'Próximo pacote, ainda não iniciado'
};

/**
 * Financeiro do paciente (issues #118 e #302): numa tela só, o plano ativo, o
 * pacote de aulas atual, os pagamentos em aberto e vigentes com as ações de
 * pagar e de cobrança, o histórico (pagamentos encerrados e planos inativos) e
 * as NFSEs emitidas.
 *
 * As telas de planos, pagamentos e NFSEs do paciente continuam existindo como
 * subtelas, alcançadas pelos botões de cada bloco: inativar plano, emitir
 * pagamento avulso e editar NFSE moram nelas.
 *
 * Cada bloco carrega e falha sozinho. Os papéis espelham as rotas e a API: a
 * rota é de `cobranca` (planos e pagamentos); NFSE só é pedida a `fiscal`; o
 * contato de cobrança só aparece para `ADMIN`; "Ver aulas" só para `agenda`.
 */
@Component({
  selector: 'app-paciente-financeiro',
  imports: [
    CurrencyPipe,
    RouterLink,
    BreadcrumbComponent,
    CarregandoComponent,
    CobrancaDialogComponent,
    GraficoProporcaoComponent,
    LocalDatePipe,
    PagarPagamentoDialogComponent
  ],
  templateUrl: './paciente-financeiro.component.html',
  styleUrl: './paciente-financeiro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteFinanceiroComponent implements OnInit {
  private readonly pacienteService = inject(PacienteService);
  private readonly planoService = inject(PlanoService);
  private readonly pagamentoService = inject(PagamentoService);
  private readonly nfseService = inject(NfseEmitidaService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly pacienteId = signal<number | null>(null);
  readonly paciente = signal<PacienteResponseDTO | null>(null);
  readonly carregandoPaciente = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  private sucessoTimer: ReturnType<typeof setTimeout> | null = null;

  /** NFSE é da área fiscal: a `RECEPCAO` não a vê, e a API lhe responderia `403`. */
  podeVerNfse = false;
  /** `/aulas/pagamento/:id` exige também a agenda; o `FINANCEIRO` puro não a abre. */
  podeVerAulas = false;
  /** A API só libera os contatos de cobrança a `ADMIN`, como na inadimplência. */
  podeCobrar = false;

  readonly carregandoPlanos = signal(false);
  readonly erroPlanos = signal<string | null>(null);
  readonly planoAtivo = signal<PlanoResponseDTO | null>(null);
  readonly planosEncerrados = signal<PlanoResponseDTO[]>([]);

  readonly carregandoPagamentos = signal(false);
  readonly erroPagamentos = signal<string | null>(null);
  /** Recusa de uma ação (confirmar pagamento); separada da carga para não esconder a tabela. */
  readonly erroAcao = signal<string | null>(null);
  /** `null` até a primeira carga; o "hoje" é fixado junto, para todas as contas usarem o mesmo dia. */
  private readonly pagamentos = signal<{ lista: PagamentoResponseDTO[]; hoje: string } | null>(null);

  readonly carregandoNfse = signal(false);
  readonly erroNfse = signal<string | null>(null);
  readonly nfses = signal<NotaFiscalEmitidaResponseDTO[] | null>(null);

  /** Pagamento com o diálogo de confirmação aberto. */
  readonly pagarId = signal<number | null>(null);
  /** Linha com o diálogo de cobrança aberto. */
  readonly cobranca = signal<PagamentoNoHistorico | null>(null);

  readonly resumo = computed(() => {
    const dados = this.pagamentos();
    return dados ? resumirPagamentos(dados.lista, dados.hoje) : null;
  });

  private readonly separados = computed(() => {
    const dados = this.pagamentos();
    if (!dados) return { vigentes: [], anteriores: [] };
    const { vigentes, anteriores } = separarPagamentos(dados.lista, dados.hoje);
    const linha = (pagamento: PagamentoResponseDTO): PagamentoNoHistorico => {
      const diasAtraso = diasEmAtraso(pagamento, dados.hoje);
      return { pagamento, situacao: situacaoPagamento(pagamento, dados.hoje), diasAtraso, atraso: descreverAtraso(diasAtraso) };
    };
    return { vigentes: vigentes.map(linha), anteriores: anteriores.map(linha) };
  });

  readonly pagamentosVigentes = computed(() => this.separados().vigentes);
  readonly pagamentosAnteriores = computed(() => this.separados().anteriores);

  readonly pacote = computed(() => {
    const dados = this.pagamentos();
    return dados ? pacoteAtual(dados.lista, dados.hoje) : null;
  });
  readonly contagemPacote = computed(() => {
    const pacote = this.pacote();
    return pacote ? contagemDoPacote(pacote.pagamento) : null;
  });
  readonly segmentosPacote = computed<SegmentoProporcao[]>(() => {
    const contagem = this.contagemPacote();
    if (!contagem) return [];
    return [
      { chave: 'realizadas', rotulo: 'Realizadas', valor: contagem.realizadas, variante: 'sucesso' },
      { chave: 'restantes', rotulo: 'A realizar', valor: contagem.restantes, variante: 'marca' }
    ];
  });

  readonly nfsesRecentes = computed(() => {
    const notas = this.nfses();
    return notas ? ordenarNfsesRecentesPrimeiro(notas).slice(0, NFSES_NO_BLOCO) : [];
  });

  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  readonly tipoLabel = TIPO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;
  readonly formaPagamentoLabel = FORMA_PAGAMENTO_LABEL;
  readonly tituloPacote = TITULO_PACOTE;
  readonly situacoes: readonly StatusPagamento[] = ['PAGO', 'PENDENTE', 'VENCIDO'];

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.sucessoTimer !== null) clearTimeout(this.sucessoTimer);
    });
  }

  ngOnInit(): void {
    const id = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pacienteId.set(id);
    if (id === null) {
      this.erro.set('Identificador inválido.');
      return;
    }
    this.podeVerNfse = this.authService.hasAnyRole(PAPEIS.fiscal);
    this.podeVerAulas = this.authService.hasAnyRole(PAPEIS.agenda);
    this.podeCobrar = this.authService.hasAnyRole(PAPEIS.admin);
    this.carregar(id);
  }

  quantidadeVencidos(): number {
    return this.resumo()?.porSituacao.VENCIDO.quantidade ?? 0;
  }

  /** Classe do badge global (`badge-pago`, `badge-pendente`, `badge-vencido`). */
  classeBadge(situacao: StatusPagamento): string {
    return `badge badge-${situacao.toLowerCase()}`;
  }

  diasDoPlano(plano: PlanoResponseDTO): string {
    return plano.diasSemana.map(dia => DIAS_SEMANA_LABEL[dia]).join(', ');
  }

  /** `HH:mm` em que o plano gera as aulas, ou `null` em plano sem horário (issue #266). */
  horarioDoPlano(plano: PlanoResponseDTO): string | null {
    return normalizarHora(plano.horario);
  }

  abrirPagar(linha: PagamentoNoHistorico): void {
    this.erroAcao.set(null);
    this.pagarId.set(linha.pagamento.id);
  }

  fecharPagar(): void {
    this.pagarId.set(null);
  }

  aoConfirmarPagamento(): void {
    this.pagarId.set(null);
    this.exibirSucesso('Pagamento confirmado com sucesso.');
    this.recarregarPagamentos();
  }

  aoFalharPagamento(): void {
    this.pagarId.set(null);
    this.erroAcao.set('Erro ao confirmar pagamento.');
  }

  abrirCobranca(linha: PagamentoNoHistorico): void {
    this.cobranca.set(linha);
  }

  fecharCobranca(): void {
    this.cobranca.set(null);
  }

  /** O diálogo de cobrança soube pela API que o pagamento foi quitado ou removido. */
  recarregarPagamentos(): void {
    const id = this.pacienteId();
    if (id !== null) this.carregarPagamentos(id);
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso.set(mensagem);
    if (this.sucessoTimer !== null) clearTimeout(this.sucessoTimer);
    this.sucessoTimer = setTimeout(() => {
      this.sucesso.set(null);
      this.sucessoTimer = null;
    }, 4000);
  }

  private carregar(id: number): void {
    this.carregandoPaciente.set(true);
    this.pacienteService.buscar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: paciente => {
        this.paciente.set(paciente);
        this.carregandoPaciente.set(false);
        this.carregarPlanos(id);
        this.carregarPagamentos(id);
        if (this.podeVerNfse) this.carregarNfse(id);
      },
      error: () => {
        this.erro.set('Paciente não encontrado.');
        this.carregandoPaciente.set(false);
      }
    });
  }

  private carregarPlanos(id: number): void {
    this.carregandoPlanos.set(true);
    forkJoin({ ativo: this.planoService.buscarAtivo(id), todos: this.planoService.listar(id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ ativo, todos }) => {
          this.planoAtivo.set(ativo);
          this.planosEncerrados.set(historicoDePlanos(todos, ativo));
          this.carregandoPlanos.set(false);
        },
        error: () => {
          this.erroPlanos.set('Erro ao carregar os planos.');
          this.carregandoPlanos.set(false);
        }
      });
  }

  private carregarPagamentos(id: number): void {
    this.carregandoPagamentos.set(true);
    this.erroPagamentos.set(null);
    this.pagamentoService.listar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.pagamentos.set({ lista, hoje: hojeIso() });
        this.carregandoPagamentos.set(false);
      },
      error: () => {
        this.erroPagamentos.set('Erro ao carregar os pagamentos.');
        this.carregandoPagamentos.set(false);
      }
    });
  }

  private carregarNfse(id: number): void {
    this.carregandoNfse.set(true);
    this.nfseService.listarPorPaciente(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: notas => {
        this.nfses.set(notas);
        this.carregandoNfse.set(false);
      },
      error: () => {
        this.erroNfse.set('Erro ao carregar as NFSEs.');
        this.carregandoNfse.set(false);
      }
    });
  }
}
