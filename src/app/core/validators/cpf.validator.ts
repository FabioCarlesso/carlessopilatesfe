import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida um CPF com ou sem pontuação (`000.000.000-00` ou 11 dígitos): exige 11
 * dígitos, recusa sequências repetidas (`111.111.111-11`) e confere os dois dígitos
 * verificadores. Erro: `{ cpf: true }`.
 *
 * Valor vazio passa: quem acusa a ausência é o `Validators.required`, sem duplicar
 * o erro. A API não valida o CPF, então esta é a única barreira antes de gravar.
 */
export const cpfValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  return cpfValido(String(valor)) ? null : { cpf: true };
};

export function cpfValido(valor: string): boolean {
  if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(valor.trim())) return false;
  const digitos = valor.replace(/\D/g, '');
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  return digitoVerificador(digitos.slice(0, 9)) === Number(digitos[9])
    && digitoVerificador(digitos.slice(0, 10)) === Number(digitos[10]);
}

/** Módulo 11 com pesos decrescentes a partir de `base.length + 1`. */
function digitoVerificador(base: string): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (base.length + 1 - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}
