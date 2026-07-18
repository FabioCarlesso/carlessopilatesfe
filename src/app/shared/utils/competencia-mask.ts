/**
 * Formata a entrada de uma competência no padrão `MM/AAAA` enquanto o usuário
 * digita, inserindo a barra automaticamente. Mantém apenas dígitos (no máximo
 * seis: MM + AAAA), de modo que o teclado numérico do celular — que não oferece
 * a tecla `/` — ainda consiga preencher o campo. Não valida o intervalo do mês;
 * a validação do formulário (`Validators.pattern`) continua responsável por isso.
 */
export function formatCompetencia(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
