import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai uma mensagem amigável a partir de um erro HTTP, respeitando o contrato
 * de erro do backend (corpo `{ [campo]: string }` ou `{ message: string }`).
 *
 * - `401`/`403`: mensagem de autorização/sessão.
 * - `429`: mensagem de excesso de requisições.
 * - Demais status: usa `message`/`error`/`detail`/`erro` do corpo, ou junta as
 *   mensagens de erro por campo; cai no `fallback` quando nada é aproveitável.
 *
 * `erro` é a chave que este backend de fato usa (`{"erro": "Aula já realizada…"}`).
 * Ela chegava ao usuário pelo ramo final, que junta os valores string do objeto —
 * o que só funciona enquanto o corpo tem um campo string só: em
 * `{"erro": "Dados inválidos", "campos": {...}}` a junção já devolve apenas
 * "Dados inválidos", e dois campos string virariam uma frase costurada.
 */
export function extrairMensagemErro(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (ehConflitoConcorrencia(err)) {
    return MENSAGEM_CONFLITO_CONCORRENCIA;
  }

  if (err.status === 401 || err.status === 403) {
    return 'Sua sessão expirou ou você não tem permissão para esta ação. Faça login novamente e tente de novo.';
  }

  if (err.status === 429) {
    return 'Muitas requisições em sequência. Aguarde alguns instantes e tente novamente.';
  }

  const corpo = err.error;

  if (typeof corpo === 'string' && corpo.trim()) {
    return corpo.trim();
  }

  if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
    const registro = corpo as Record<string, unknown>;
    const explicita = registro['message'] ?? registro['error'] ?? registro['detail'] ?? registro['erro'];
    if (typeof explicita === 'string' && explicita.trim()) {
      return explicita.trim();
    }

    const mensagensCampo = Object.values(registro).filter(
      (valor): valor is string => typeof valor === 'string' && valor.trim().length > 0
    );
    if (mensagensCampo.length > 0) {
      return mensagensCampo.join(' ');
    }
  }

  return fallback;
}

/** Mensagem do `409 concurrent-modification`: a edição partiu de uma versão que outra pessoa já alterou. */
export const MENSAGEM_CONFLITO_CONCORRENCIA =
  'Este registro foi alterado por outra pessoa enquanto você editava. Recarregue a página para ver a versão atual e refaça sua alteração.';

/**
 * Identifica o locking otimista da API (`409` com `type` terminado em `/concurrent-modification`).
 *
 * O `409` sozinho não basta: a API também o devolve para e-mail/CPF duplicado e outras regras (`type` `conflict`),
 * e só o `type` é contrato estável — o texto de `detail` pode mudar.
 */
export function ehConflitoConcorrencia(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
    return false;
  }
  const tipo = (err.error as { type?: unknown } | null)?.type;
  return typeof tipo === 'string' && tipo.endsWith('/concurrent-modification');
}
