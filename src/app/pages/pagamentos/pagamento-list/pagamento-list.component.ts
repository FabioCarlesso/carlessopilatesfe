import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PAPEIS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO, STATUS_PAGAMENTO_LABEL } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-pagamento-list',
  imports: [NgClass, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, ConfirmarDialogComponent, BreadcrumbComponent, CarregandoComponent],
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
  pagarId: number | null = null;
  pagarForm!: FormGroup;
  acaoEmAndamento = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  readonly papeis = PAPEIS;

  constructor(
    private service: PagamentoService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
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
    this.pagarForm.reset();
  }

  cancelarPagar(): void {
    if (this.acaoEmAndamento) return;
    this.pagarId = null;
  }

  confirmarPagar(): void {
    if (this.pagarId === null || this.acaoEmAndamento) return;
    if (this.pagarForm.invalid) {
      this.pagarForm.markAllAsTouched();
      focarPrimeiroInvalido(this.pagarForm, this.host);
      return;
    }
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
