import { Observable, of } from 'rxjs';
import { Page } from './common';
import { TAMANHO_PAGINA_HISTORICO, buscarTodasAsPaginas, paramsPaginaHistorico } from './paginacao';

function pagina<T>(content: T[], number: number, totalPages: number): Page<T> {
  return { content, page: { number, totalPages, size: TAMANHO_PAGINA_HISTORICO, totalElements: 0 } };
}

describe('paginacao', () => {
  describe('buscarTodasAsPaginas', () => {
    it('junta as páginas na ordem e para em totalPages', () => {
      const paginas = [pagina([1, 2], 0, 3), pagina([3, 4], 1, 3), pagina([5], 2, 3)];
      const pedidas: number[] = [];
      let resultado: number[] | undefined;

      buscarTodasAsPaginas((n): Observable<Page<number>> => {
        pedidas.push(n);
        return of(paginas[n]);
      }).subscribe(itens => (resultado = itens));

      expect(pedidas).toEqual([0, 1, 2]);
      expect(resultado).toEqual([1, 2, 3, 4, 5]);
    });

    it('com uma página só, faz uma única chamada', () => {
      const pedidas: number[] = [];
      let resultado: string[] | undefined;

      buscarTodasAsPaginas(n => {
        pedidas.push(n);
        return of(pagina(['a'], 0, 1));
      }).subscribe(itens => (resultado = itens));

      expect(pedidas).toEqual([0]);
      expect(resultado).toEqual(['a']);
    });

    it('sem registros (totalPages 0), devolve array vazio', () => {
      let resultado: string[] | undefined;

      buscarTodasAsPaginas(() => of(pagina<string>([], 0, 0))).subscribe(itens => (resultado = itens));

      expect(resultado).toEqual([]);
    });
  });

  it('paramsPaginaHistorico pede a página com o tamanho máximo, sem sort', () => {
    const params = paramsPaginaHistorico(3);

    expect(params.get('page')).toBe('3');
    expect(params.get('size')).toBe(String(TAMANHO_PAGINA_HISTORICO));
    expect(params.has('sort')).toBeFalse();
  });
});
