import { ElementRef } from '@angular/core';
import { FormGroup } from '@angular/forms';

type HostRef = ElementRef<HTMLElement> | HTMLElement | null | undefined;

// Campos inválidos ganham a classe `ng-invalid` do Angular independentemente de
// `touched`. Restringimos aos controles focáveis (input/select/textarea) e
// ignoramos os desabilitados, que não recebem foco e são tratados como válidos.
const SELETOR_INVALIDO =
  'input.ng-invalid:not([disabled]), select.ng-invalid:not([disabled]), textarea.ng-invalid:not([disabled])';

const SELETOR_PRIMEIRO_CAMPO =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

function resolverHost(host: HostRef): HTMLElement | null {
  if (!host) return null;
  return host instanceof ElementRef ? host.nativeElement : host;
}

function focar(elemento: HTMLElement): void {
  elemento.focus({ preventScroll: true });
  if (typeof elemento.scrollIntoView === 'function') {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Foca e rola até o primeiro campo inválido do formulário. Deve ser chamado
 * depois de `markAllAsTouched()` no submit inválido, garantindo que o erro fique
 * visível mesmo em formulários longos. Retorna `true` quando um campo é focado.
 */
export function focarPrimeiroInvalido(form: FormGroup, host: HostRef): boolean {
  if (!form || form.valid) return false;
  const nativo = resolverHost(host);
  if (!nativo) return false;

  const alvo = nativo.querySelector<HTMLElement>(SELETOR_INVALIDO);
  if (!alvo) return false;

  focar(alvo);
  return true;
}

/**
 * Foca o primeiro campo focável do formulário ao abrir telas de criação,
 * deixando o cursor pronto para digitação. Retorna `true` quando um campo é
 * focado.
 */
export function focarPrimeiroCampo(host: HostRef): boolean {
  const nativo = resolverHost(host);
  if (!nativo) return false;

  const alvo = nativo.querySelector<HTMLElement>(SELETOR_PRIMEIRO_CAMPO);
  if (!alvo) return false;

  focar(alvo);
  return true;
}
