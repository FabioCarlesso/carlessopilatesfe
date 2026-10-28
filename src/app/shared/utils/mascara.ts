/**
 * Máscaras de entrada de CPF, telefone e CEP.
 *
 * A pontuação é só de exibição: o valor que vai para o formulário (e daí para a
 * API) é sempre **apenas dígitos**. É o formato em que a importação do seufisio
 * grava CPF e CEP, e o único que torna a checagem de duplicidade da API
 * (`existsByCpf`, comparação exata de texto) e o filtro `LIKE %termo%`
 * previsíveis. O porquê está em `docs/context.md`.
 */
export type TipoMascara = 'cpf' | 'telefone' | 'cep';

/** Quantidade máxima de dígitos aceita por máscara. */
export const MAX_DIGITOS: Readonly<Record<TipoMascara, number>> = {
  cpf: 11,
  telefone: 11,
  cep: 8
};

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** `000.000.000-00`, montado aos poucos enquanto o usuário digita. */
export function formatarCpf(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, MAX_DIGITOS.cpf);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * `(00) 0000-0000` para fixo (10 dígitos) e `(00) 00000-0000` para celular
 * (11 dígitos). Até o décimo dígito o hífen fica depois do quarto número local;
 * o décimo primeiro o empurra uma casa, virando o formato de celular.
 */
export function formatarTelefone(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, MAX_DIGITOS.telefone);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const local = d.slice(2);
  if (local.length <= 4) return `(${ddd}) ${local}`;
  const corte = local.length === 9 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, corte)}-${local.slice(corte)}`;
}

/** `00000-000`. */
export function formatarCep(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, MAX_DIGITOS.cep);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const FORMATADORES: Readonly<Record<TipoMascara, (valor: string | null | undefined) => string>> = {
  cpf: formatarCpf,
  telefone: formatarTelefone,
  cep: formatarCep
};

export function formatar(tipo: TipoMascara, valor: string | null | undefined): string {
  return FORMATADORES[tipo](valor);
}

/**
 * Texto a mostrar para um valor que veio do servidor. Registros antigos foram
 * gravados como digitados, então podem ter outra pontuação (formatada normalmente)
 * ou conteúdo que a máscara destruiria — letras, observações, dois números no
 * mesmo campo. Esses aparecem como estão, para ninguém perder informação só por
 * abrir a tela; a máscara volta a valer quando o usuário editar o campo.
 */
export function exibirValorGravado(tipo: TipoMascara, valor: string | null | undefined): string {
  const texto = valor ?? '';
  const soPontuacao = /^[\d\s().\-/]*$/.test(texto);
  if (!soPontuacao || somenteDigitos(texto).length > MAX_DIGITOS[tipo]) return texto;
  return formatar(tipo, texto);
}
