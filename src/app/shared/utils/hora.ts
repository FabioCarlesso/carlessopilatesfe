/**
 * Leitura das horas do contrato da API (`LocalTime`), compartilhada por quem
 * precisa comparar ou exibir horário: bloqueios de agenda (issue #135) e lista
 * de espera (issue #137).
 *
 * Fica aqui, e não dentro do utilitário de um dos dois, porque o problema é do
 * contrato e não do recurso: os dois endpoints devolvem `HH:mm:ss` e os dois
 * formulários trabalham com `<input type="time">`, que só aceita `HH:mm`.
 */

/**
 * `HH:mm` a partir do que a API mandar.
 *
 * A API devolve `LocalTime` **sempre** com segundos — mandar `"08:00"` no
 * `POST` traz `"08:00:00"` de volta (verificado contra o backend) —, enquanto o
 * `<input type="time">` produz e consome `HH:mm`. Sem normalizar, as duas
 * formas do mesmo horário divergiriam em qualquer comparação de string e o
 * campo de edição receberia um valor que não é o dele.
 */
export function normalizarHora(hora: string | null | undefined): string | null {
  if (!hora) return null;
  const match = /^(\d{2}):(\d{2})/.exec(hora);
  return match ? `${match[1]}:${match[2]}` : null;
}

/** Minutos desde a meia-noite, ou `null` quando a hora não é reconhecida. */
export function minutosDoDia(hora: string | null | undefined): number | null {
  const normalizada = normalizarHora(hora);
  if (normalizada === null) return null;
  const [h, m] = normalizada.split(':').map(Number);
  return h * 60 + m;
}

/** `HH:mm` a partir dos minutos desde a meia-noite, saturando em 23:59. */
export function horaDeMinutos(minutos: number): string {
  const limitado = Math.max(0, Math.min(Math.round(minutos), 23 * 60 + 59));
  const doisDigitos = (valor: number) => `${valor}`.padStart(2, '0');
  return `${doisDigitos(Math.floor(limitado / 60))}:${doisDigitos(limitado % 60)}`;
}
