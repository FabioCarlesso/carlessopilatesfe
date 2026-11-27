import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { COBRANCA_OBSERVACAO_MAX, ContatoCobrancaDTO } from '../../../core/models/inadimplencia';
import { PagamentoResponseDTO, STATUS_PAGAMENTO_LABEL, StatusPagamento } from '../../../core/models/plano';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { LocalDatePipe } from '../../pipes/local-date.pipe';
import { extrairMensagemErro } from '../../utils/api-error';
import { hojeIso } from '../../utils/calendario';
import { descreverAtraso, formatarDataHora } from '../../utils/inadimplencia';
import { ConfirmarDialogComponent } from '../confirmar-dialog/confirmar-dialog.component';

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
 * Diálogo de cobrança de um pagamento (issue #127): resumo, histórico de
 * contatos (`GET /api/pagamentos/{id}/cobrancas`) e, enquanto o pagamento não
 * está `PAGO`, o registro de um novo contato (`POST`). Nasceu na gestão de
 * inadimplência e foi extraído para o financeiro do paciente (issue #302) usar
 * o mesmo fluxo. A API só o libera para `ADMIN`: quem abre o diálogo confere o
 * papel.
 *
 * Cada abertura cria uma instância nova — o `@if` de quem o usa —, então uma
 * resposta atrasada do histórico morre com o diálogo fechado. Quando a API diz
 * que o pagamento foi quitado (`422`) ou não existe mais (`404`), o diálogo
 * emite `listaDesatualizada` para a tela recarregar o que mostra.
 */
@Component({
  selector: 'app-cobranca-dialog',
  imports: [CurrencyPipe, ReactiveFormsModule, LocalDatePipe, ConfirmarDialogComponent],
  templateUrl: './cobranca-dialog.component.html',
  styleUrl: './cobranca-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CobrancaDialogComponent implements OnInit {
  private readonly service = inject(PagamentoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pagamento = input.required<PagamentoResponseDTO>();
  /** Dias em atraso calculados por quem abre, no mesmo "hoje" da lista dele. */
  readonly diasAtraso = input(0);
  readonly fechar = output<void>();
  readonly listaDesatualizada = output<void>();

  /** O `422` do registro: o pagamento foi quitado depois que a lista carregou. */
  private readonly quitado = signal(false);
  readonly status = computed<StatusPagamento>(() => (this.quitado() ? 'PAGO' : this.pagamento().status));
  readonly podeRegistrarContato = computed(() => this.status() !== 'PAGO');

  readonly contatos = signal<ContatoCobrancaDTO[]>([]);
  readonly carregandoContatos = signal(false);
  readonly erroContatos = signal<string | null>(null);
  readonly registrando = signal(false);
  readonly erroCobranca = signal<string | null>(null);
  readonly sucessoCobranca = signal<string | null>(null);
  readonly tamanhoObservacao = signal(0);

  readonly statusLabel = STATUS_PAGAMENTO_LABEL;
  readonly observacaoMax = COBRANCA_OBSERVACAO_MAX;
  /** Teto do campo de data; fixado na abertura do diálogo. */
  readonly hoje = hojeIso();
  readonly cobrancaForm = inject(FormBuilder).nonNullable.group({
    // O contato costuma ser registrado logo depois de acontecer.
    dataContato: [this.hoje, [Validators.required, naoFutura(() => this.hoje)]],
    observacao: ['', [Validators.required, naoEmBranco, Validators.maxLength(COBRANCA_OBSERVACAO_MAX)]]
  });

  ngOnInit(): void {
    this.cobrancaForm.controls.observacao.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(valor => this.tamanhoObservacao.set((valor ?? '').length));
    this.carregarContatos();
  }

  campoCobranca(nome: 'dataContato' | 'observacao'): AbstractControl {
    return this.cobrancaForm.controls[nome];
  }

  descreverAtraso(dias: number): string {
    return descreverAtraso(dias);
  }

  formatarDataHora(valor: string): string {
    return formatarDataHora(valor);
  }

  fecharDialogo(): void {
    if (this.registrando()) return;
    this.fechar.emit();
  }

  private carregarContatos(): void {
    this.carregandoContatos.set(true);
    this.erroContatos.set(null);
    this.service
      .listarCobrancas(this.pagamento().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: contatos => {
          this.contatos.set(contatos);
          this.carregandoContatos.set(false);
        },
        error: err => {
          this.contatos.set([]);
          this.erroContatos.set(extrairMensagemErro(err, 'Não foi possível carregar os contatos de cobrança.'));
          this.carregandoContatos.set(false);
        }
      });
  }

  registrarContato(): void {
    if (this.registrando() || !this.podeRegistrarContato()) return;

    this.sucessoCobranca.set(null);
    if (this.cobrancaForm.invalid) {
      this.cobrancaForm.markAllAsTouched();
      return;
    }

    const { dataContato, observacao } = this.cobrancaForm.getRawValue();
    this.registrando.set(true);
    this.erroCobranca.set(null);
    this.service
      .registrarCobranca(this.pagamento().id, { dataContato, observacao: observacao.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.registrando.set(false);
          this.sucessoCobranca.set('Contato de cobrança registrado.');
          this.cobrancaForm.reset({ dataContato: this.hoje, observacao: '' });
          // Recarrega em vez de inserir no topo: a ordem é do servidor, e um
          // contato com data retroativa não necessariamente é o primeiro.
          this.carregarContatos();
        },
        error: (err: HttpErrorResponse) => {
          this.registrando.set(false);
          if (err.status === 422) {
            // O pagamento foi quitado depois que a lista foi carregada: o
            // diálogo passa a refletir isso e a lista é atualizada.
            this.quitado.set(true);
            this.erroCobranca.set(extrairMensagemErro(
              err,
              'Este pagamento já foi quitado e não aceita novos contatos de cobrança.'
            ));
            this.listaDesatualizada.emit();
            return;
          }
          if (err.status === 404) {
            this.erroCobranca.set(extrairMensagemErro(err, 'Pagamento não encontrado.'));
            this.listaDesatualizada.emit();
            return;
          }
          this.erroCobranca.set(extrairMensagemErro(err, 'Erro ao registrar contato de cobrança.'));
        }
      });
  }
}
