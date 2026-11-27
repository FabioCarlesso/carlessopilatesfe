import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FORMA_PAGAMENTO_LABEL,
  FORMA_PAGAMENTO_OPCOES,
  FormaPagamento,
  PagamentoResponseDTO
} from '../../../core/models/plano';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { focarPrimeiroInvalido } from '../../utils/form-focus';
import { ConfirmarDialogComponent } from '../confirmar-dialog/confirmar-dialog.component';

/**
 * Diálogo de confirmação de pagamento (`PATCH /api/pagamentos/{id}/pagar`),
 * extraído da listagem de pagamentos do paciente para ser usado também pelo
 * financeiro do paciente (issue #302). Pede a data do pagamento, obrigatória,
 * e a forma, opcional como na API: sem ela, vai `formaPagamento: null`.
 *
 * Quem abre o diálogo decide o que fazer com o resultado: `pago` traz o
 * pagamento confirmado, `falhou` avisa a recusa (a tela mostra o erro e fecha o
 * diálogo, como antes da extração) e `cancelar` pede para fechar.
 */
@Component({
  selector: 'app-pagar-pagamento-dialog',
  imports: [ReactiveFormsModule, ConfirmarDialogComponent],
  templateUrl: './pagar-pagamento-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagarPagamentoDialogComponent {
  private readonly service = inject(PagamentoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly pagamentoId = input.required<number>();
  readonly pago = output<PagamentoResponseDTO>();
  readonly falhou = output<void>();
  readonly cancelar = output<void>();

  readonly processando = signal(false);
  readonly formaPagamentoLabel = FORMA_PAGAMENTO_LABEL;
  readonly formasPagamento = FORMA_PAGAMENTO_OPCOES;
  readonly form = inject(FormBuilder).group({
    dataPagamento: ['', Validators.required],
    formaPagamento: [null as FormaPagamento | null]
  });

  confirmar(): void {
    if (this.processando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }
    const { dataPagamento, formaPagamento } = this.form.getRawValue();
    this.processando.set(true);
    this.service
      .pagar(this.pagamentoId(), dataPagamento ?? '', formaPagamento ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pagamento => {
          this.processando.set(false);
          this.pago.emit(pagamento);
        },
        error: () => {
          this.processando.set(false);
          this.falhou.emit();
        }
      });
  }

  fechar(): void {
    if (this.processando()) return;
    this.cancelar.emit();
  }
}
