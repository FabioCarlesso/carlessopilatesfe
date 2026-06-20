import { Type } from '@angular/core';

/**
 * Lê o metadado interno `ɵcmp.onPush` do componente compilado pelo Angular.
 *
 * O acesso à API privada `ɵcmp` fica isolado neste único ponto para reduzir a
 * superfície frágil: caso o Angular altere esse campo interno entre versões,
 * só este helper precisa ser ajustado, e não cada spec.
 */
export function isOnPush(componentType: Type<unknown>): boolean {
  return (componentType as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush === true;
}
