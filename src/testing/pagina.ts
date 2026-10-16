import { Page } from '../app/core/models/common';
import { TAMANHO_PAGINA_HISTORICO } from '../app/core/models/paginacao';

/** Corpo de uma rota paginada da API (`{content, page:{...}}`) para `req.flush`. */
export function pagina<T>(content: T[], number = 0, totalPages = 1): Page<T> {
  return {
    content,
    page: { size: TAMANHO_PAGINA_HISTORICO, number, totalElements: content.length, totalPages }
  };
}
