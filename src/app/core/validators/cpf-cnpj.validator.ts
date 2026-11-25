import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { cpfValido } from './cpf.validator';

/**
 * Valida um CPF ou CNPJ com ou sem pontuação: só dígitos e a pontuação usual, com
 * 11 dígitos (CPF) ou 14 (CNPJ), sem sequência repetida e com os dígitos
 * verificadores corretos. Erro: `{ cpfCnpj: true }`.
 *
 * Valor vazio passa: o campo é opcional (tomador alternativo da nota fiscal).
 */
export const cpfCnpjValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  return cpfCnpjValido(String(valor)) ? null : { cpfCnpj: true };
};

export function cpfCnpjValido(valor: string): boolean {
  if (!/^[\d.\-/\s]+$/.test(valor)) return false;
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 11) return cpfValido(digitos);
  if (digitos.length === 14) return cnpjValido(digitos);
  return false;
}

function cnpjValido(digitos: string): boolean {
  if (/^(\d)\1{13}$/.test(digitos)) return false;
  return digitoCnpj(digitos.slice(0, 12)) === Number(digitos[12])
    && digitoCnpj(digitos.slice(0, 13)) === Number(digitos[13]);
}

/** Módulo 11 com os pesos do CNPJ (2 a 9, da direita para a esquerda). */
function digitoCnpj(base: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}
