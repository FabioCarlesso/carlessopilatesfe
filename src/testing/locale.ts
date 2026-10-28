import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, Provider } from '@angular/core';

/**
 * Reproduz no TestBed o locale que o `main.ts` e o `appConfig` dão à aplicação.
 *
 * Os specs não passam pelo `appConfig`: sem este provider o TestBed fica em
 * `en-US` e os pipes renderizam `R$250.00` e `Tue`, um formato que o usuário
 * nunca vê. Registra os dados de `pt` (o `main.ts` não roda nos testes) e
 * devolve o `LOCALE_ID` a incluir nos `providers` do spec.
 */
export function provideLocalePtBr(): Provider {
  registerLocaleData(localePt);
  return { provide: LOCALE_ID, useValue: 'pt-BR' };
}

/**
 * Troca o espaço não separável (U+00A0) por um espaço comum.
 *
 * O `CurrencyPipe` em `pt-BR` separa o símbolo do valor com U+00A0, que o
 * `textContent` preserva: sem normalizar, `'R$ 250,00'` escrito no spec não
 * casaria com o texto renderizado, embora sejam visualmente idênticos.
 */
export function normalizarEspacos(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\u00a0/g, ' ');
}
