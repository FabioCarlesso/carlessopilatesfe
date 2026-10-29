import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PAPEIS } from '../../../core/models/auth';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import {
  FREQUENCIA_LABEL,
  PagamentoResponseDTO,
  PlanoResponseDTO,
  STATUS_PAGAMENTO_LABEL,
  StatusPagamento,
  TIPO_LABEL
} from '../../../core/models/plano';
import { AulaService } from '../../../core/services/aula.service';
import { AuthService } from '../../../core/services/auth.service';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { GraficoProporcaoComponent } from '../../../shared/components/grafico-proporcao/grafico-proporcao.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { hojeIso } from '../../../shared/utils/calendario';
import { SegmentoProporcao } from '../../../shared/utils/grafico-proporcao';
import {
  ContagemAulas,
  ResumoPagamentos,
  contarAulas,
  historicoDePlanos,
  ordenarPagamentosRecentesPrimeiro,
  resumirPagamentos,
  situacaoPagamento,
  ultimaNfseEmitida
} from '../../../shared/utils/historico-financeiro';
import { descreverAtraso, diasEmAtraso } from '../../../shared/utils/inadimplencia';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

/** Linha da tabela de pagamentos com a situação já calculada para hoje. */
export interface PagamentoNoHistorico {
  pagamento: PagamentoResponseDTO;
  situacao: StatusPagamento;
  atraso: string;
}

/**
 * Histórico financeiro consolidado do paciente (issue #118): plano ativo e
 * planos anteriores, pagamentos com totais por situação, aulas realizadas ×
 * pendentes e a última NFSE, numa única tela.
 *
 * Cada bloco carrega e falha sozinho — um erro nas aulas não esconde os
 * pagamentos. Aulas e NFSE só são pedidas a quem tem acesso a elas na API
 * (`agenda` e `fiscal`); a rota em si é de `cobranca`, dona de planos e
 * pagamentos.
 */
@Component({
  selector: 'app-paciente-financeiro',
  imports: [CurrencyPipe, RouterLink, BreadcrumbComponent, GraficoProporcaoComponent, LocalDatePipe],
  templateUrl: './paciente-financeiro.component.html',
  styleUrl: './paciente-financeiro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteFinanceiroComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  carregandoPaciente = false;
  erro: string | null = null;

  podeVerAulas = false;
  podeVerNfse = false;

  carregandoPlanos = false;
  erroPlanos: string | null = null;
  planoAtivo: PlanoResponseDTO | null = null;
  planosAnteriores: PlanoResponseDTO[] = [];

  carregandoPagamentos = false;
  erroPagamentos: string | null = null;
  pagamentos: PagamentoNoHistorico[] = [];
  resumo: ResumoPagamentos | null = null;

  carregandoAulas = false;
  erroAulas: string | null = null;
  aulas: ContagemAulas | null = null;
  segmentosAulas: SegmentoProporcao[] = [];

  carregandoNfse = false;
  erroNfse: string | null = null;
  nfsesCarregadas = false;
  ultimaNfse: NotaFiscalEmitidaResponseDTO | null = null;

  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  readonly tipoLabel = TIPO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;
  readonly situacoes: readonly StatusPagamento[] = ['PAGO', 'PENDENTE', 'VENCIDO'];

  constructor(
    private pacienteService: PacienteService,
    private planoService: PlanoService,
    private pagamentoService: PagamentoService,
    private aulaService: AulaService,
    private nfseService: NfseEmitidaService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.podeVerAulas = this.authService.hasAnyRole(PAPEIS.agenda);
    this.podeVerNfse = this.authService.hasAnyRole(PAPEIS.fiscal);
    this.carregar(this.pacienteId);
  }

  get temVencidos(): boolean {
    return (this.resumo?.porSituacao.VENCIDO.quantidade ?? 0) > 0;
  }

  /** Classe do badge global (`badge-pago`, `badge-pendente`, `badge-vencido`). */
  classeBadge(situacao: StatusPagamento): string {
    return `badge badge-${situacao.toLowerCase()}`;
  }

  private carregar(id: number): void {
    this.carregandoPaciente = true;
    this.pacienteService.buscar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: paciente => {
        this.paciente = paciente;
        this.carregandoPaciente = false;
        this.carregarPlanos(id);
        this.carregarPagamentos(id);
        if (this.podeVerAulas) this.carregarAulas(id);
        if (this.podeVerNfse) this.carregarNfse(id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Paciente não encontrado.';
        this.carregandoPaciente = false;
        this.cdr.markForCheck();
      }
    });
  }

  private carregarPlanos(id: number): void {
    this.carregandoPlanos = true;
    forkJoin({ ativo: this.planoService.buscarAtivo(id), todos: this.planoService.listar(id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ ativo, todos }) => {
          this.planoAtivo = ativo;
          this.planosAnteriores = historicoDePlanos(todos, ativo);
          this.carregandoPlanos = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.erroPlanos = 'Erro ao carregar os planos.';
          this.carregandoPlanos = false;
          this.cdr.markForCheck();
        }
      });
  }

  private carregarPagamentos(id: number): void {
    this.carregandoPagamentos = true;
    this.pagamentoService.listar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: pagamentos => {
        const hoje = hojeIso();
        this.resumo = resumirPagamentos(pagamentos, hoje);
        this.pagamentos = ordenarPagamentosRecentesPrimeiro(pagamentos).map(pagamento => ({
          pagamento,
          situacao: situacaoPagamento(pagamento, hoje),
          atraso: descreverAtraso(diasEmAtraso(pagamento, hoje))
        }));
        this.carregandoPagamentos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erroPagamentos = 'Erro ao carregar os pagamentos.';
        this.carregandoPagamentos = false;
        this.cdr.markForCheck();
      }
    });
  }

  private carregarAulas(id: number): void {
    this.carregandoAulas = true;
    this.aulaService.listarPorPaciente(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: aulas => {
        this.aulas = contarAulas(aulas);
        this.segmentosAulas = [
          { chave: 'realizadas', rotulo: 'Realizadas', valor: this.aulas.realizadas, variante: 'sucesso' },
          { chave: 'pendentes', rotulo: 'Pendentes', valor: this.aulas.pendentes, variante: 'marca' }
        ];
        this.carregandoAulas = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erroAulas = 'Erro ao carregar as aulas.';
        this.carregandoAulas = false;
        this.cdr.markForCheck();
      }
    });
  }

  private carregarNfse(id: number): void {
    this.carregandoNfse = true;
    this.nfseService.listarPorPaciente(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: notas => {
        this.ultimaNfse = ultimaNfseEmitida(notas);
        this.nfsesCarregadas = true;
        this.carregandoNfse = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erroNfse = 'Erro ao carregar as NFSEs.';
        this.carregandoNfse = false;
        this.cdr.markForCheck();
      }
    });
  }
}
