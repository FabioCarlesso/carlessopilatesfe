import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PAPEIS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import {
  FORMA_PAGAMENTO_LABEL,
  PagamentoResponseDTO,
  STATUS_PAGAMENTO_LABEL
} from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { PagarPagamentoDialogComponent } from '../../../shared/components/pagar-pagamento-dialog/pagar-pagamento-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pagamento-list',
  imports: [NgClass, CurrencyPipe, DatePipe, RouterLink, PagarPagamentoDialogComponent, BreadcrumbComponent, CarregandoComponent, EmptyStateComponent],
  templateUrl: './pagamento-list.component.html',
  styleUrl: './pagamento-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagamentoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  pacienteNome: string | null = null;
  pagamentos: PagamentoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  /** Pagamento com o diálogo de confirmação aberto; `null` com ele fechado. */
  pagarId: number | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  readonly formaPagamentoLabel = FORMA_PAGAMENTO_LABEL;
  readonly papeis = PAPEIS;

  constructor(
    private service: PagamentoService,
    public authService: AuthService,
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
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    this.service.listar(this.pacienteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: pagamentos => {
        this.pagamentos = pagamentos;
        // Nome do paciente vem do próprio DTO (issue #143); lista vazia mantém o título genérico.
        this.pacienteNome = pagamentos[0]?.pacienteNome ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar pagamentos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByPagamento(_: number, pagamento: PagamentoResponseDTO): number {
    return pagamento.id;
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => {
      this.sucesso = null;
      this.cdr.markForCheck();
    }, 4000);
  }

  abrirPagar(id: number): void {
    this.pagarId = id;
  }

  cancelarPagar(): void {
    this.pagarId = null;
  }

  /** O formulário e a chamada à API moram no `app-pagar-pagamento-dialog` (issue #302). */
  aoConfirmarPagamento(): void {
    this.pagarId = null;
    this.exibirSucesso('Pagamento confirmado com sucesso.');
    this.carregar();
  }

  aoFalharPagamento(): void {
    this.erro = 'Erro ao confirmar pagamento.';
    this.pagarId = null;
    this.cdr.markForCheck();
  }
}
