import { Directive, ElementRef, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { exibirValorGravado, formatar, somenteDigitos, TipoMascara } from '../utils/mascara';

/**
 * Máscara de entrada para CPF, telefone e CEP: `<input appMascara="cpf" formControlName="cpf">`.
 *
 * É um `ControlValueAccessor`, então funciona igual com Reactive Forms e com
 * `ngModel`, e substitui o accessor padrão do `<input>`. O campo **mostra** o valor
 * pontuado, mas o modelo recebe **só os dígitos** — é esse o formato enviado à API.
 * Digitar, colar com ou sem pontuação e o preenchimento automático do navegador
 * chegam todos pelo evento `input` e terminam no mesmo valor.
 *
 * Ao reformatar, o cursor fica depois do mesmo número de dígitos em que estava,
 * para que editar no meio do campo ou apagar uma pontuação não o jogue para o fim.
 */
@Directive({
  selector: 'input[appMascara]',
  host: {
    '(input)': 'aoDigitar()',
    '(blur)': 'aoSair()'
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MascaraDirective), multi: true }]
})
export class MascaraDirective implements ControlValueAccessor {
  @Input({ alias: 'appMascara', required: true }) tipo!: TipoMascara;

  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly host: ElementRef<HTMLInputElement>) {}

  writeValue(valor: string | null | undefined): void {
    this.host.nativeElement.value = exibirValorGravado(this.tipo, valor);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.host.nativeElement.disabled = disabled;
  }

  aoDigitar(): void {
    const input = this.host.nativeElement;
    const bruto = input.value;
    const cursor = input.selectionStart ?? bruto.length;
    const digitosAntesDoCursor = somenteDigitos(bruto.slice(0, cursor)).length;

    const formatado = formatar(this.tipo, bruto);
    input.value = formatado;
    if (document.activeElement === input) {
      const posicao = posicaoAposDigitos(formatado, digitosAntesDoCursor);
      input.setSelectionRange(posicao, posicao);
    }
    this.onChange(somenteDigitos(formatado));
  }

  aoSair(): void {
    this.onTouched();
  }
}

/** Índice logo depois do n-ésimo dígito de `texto` (0 quando n é 0). */
function posicaoAposDigitos(texto: string, n: number): number {
  if (n <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto[i]) && ++vistos === n) return i + 1;
  }
  return texto.length;
}
