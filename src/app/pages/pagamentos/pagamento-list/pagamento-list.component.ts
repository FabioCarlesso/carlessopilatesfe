import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO, StatusPagamento } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-pagamento-list',
  imports: [NgIf, NgFor, NgClass, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './pagamento-list.component.html',
  styleUrl: './pagamento-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagamentoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  pagamentos: PagamentoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  pagarId: number | null = null;
  pagarForm!: FormGroup;
  acaoEmAndamento = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel: Record<StatusPagamento, string> = {
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
    VENCIDO: 'Vencido'
  };

  constructor(
    private service: PagamentoService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pagarForm = this.fb.group({ dataPagamento: ['', Validators.required] });
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
    this.pagarForm.reset();
  }

  cancelarPagar(): void {
    if (this.acaoEmAndamento) return;
    this.pagarId = null;
  }

  confirmarPagar(): void {
    if (this.pagarForm.invalid || this.pagarId === null || this.acaoEmAndamento) return;
    const { dataPagamento } = this.pagarForm.value;
    this.acaoEmAndamento = true;
    this.service.pagar(this.pagarId, dataPagamento).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.pagarId = null;
        this.exibirSucesso('Pagamento confirmado com sucesso.');
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao confirmar pagamento.';
        this.acaoEmAndamento = false;
        this.pagarId = null;
        this.cdr.markForCheck();
      }
    });
  }
}
