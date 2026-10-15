import { HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { Page } from './common';

/**
 * Teto de `size` da API (`spring.data.web.pageable.max-page-size`). O histórico de
 * um paciente cabe numa página dessas por anos; as seguintes só são pedidas se
 * `totalPages` disser que existem.
 */
export const TAMANHO_PAGINA_HISTORICO = 2000;

/**
 * `page` e `size` da página `pagina` do histórico. Sem `sort` vale a ordenação
 * padrão da rota — do mais recente para o mais antigo.
 */
export function paramsPaginaHistorico(pagina: number, sort?: string): HttpParams {
  const params = new HttpParams().set('page', pagina).set('size', TAMANHO_PAGINA_HISTORICO);
  return sort ? params.set('sort', sort) : params;
}

/**
 * Junta todas as páginas de uma listagem paginada da API num único array.
 *
 * As listagens por paciente (pagamentos, aulas, sessões, avaliações, reavaliações,
 * planos de tratamento e NFS-e) passaram a responder `Page` (API #100), mas as
 * telas que as consomem precisam do histórico inteiro — o calendário cruza aulas
 * e sessões, a tela de evoluções casa cada sessão com a sua evolução. As páginas
 * são pedidas em sequência, na ordem da API.
 */
export function buscarTodasAsPaginas<T>(buscarPagina: (pagina: number) => Observable<Page<T>>): Observable<T[]> {
  return buscarPagina(0).pipe(
    expand(atual => {
      const proxima = atual.page.number + 1;
      return proxima < atual.page.totalPages ? buscarPagina(proxima) : EMPTY;
    }),
    reduce((itens, atual) => itens.concat(atual.content), [] as T[])
  );
}
