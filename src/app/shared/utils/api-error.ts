import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai uma mensagem amigável a partir de um erro HTTP, respeitando o contrato
 * de erro do backend (corpo `{ [campo]: string }` ou `{ message: string }`).
 *
 * - `401`/`403`: mensagem de autorização/sessão.
 * - `429`: mensagem de excesso de requisições.
 * - Demais status: usa `message`/`error`/`detail` do corpo, ou junta as
 *   mensagens de erro por campo; cai no `fallback` quando nada é aproveitável.
 */
export function extrairMensagemErro(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
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
    const explicita = registro['message'] ?? registro['error'] ?? registro['detail'];
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
