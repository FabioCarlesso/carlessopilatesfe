import { Ordenacao, proximaOrdenacao, toSortParam } from './ordenacao';

describe('ordenacao helpers (issue #151)', () => {
  const padrao: Ordenacao = { campo: 'nome', direcao: 'asc' };

  describe('toSortParam', () => {
    it('should format the Spring Pageable sort param', () => {
      expect(toSortParam({ campo: 'email', direcao: 'asc' })).toBe('email,asc');
      expect(toSortParam({ campo: 'percentualPagamentoAula', direcao: 'desc' })).toBe('percentualPagamentoAula,desc');
    });
  });

  describe('proximaOrdenacao', () => {
    it('should sort ascending when a different column is chosen', () => {
      expect(proximaOrdenacao({ campo: 'nome', direcao: 'asc' }, 'email', padrao))
        .toEqual({ campo: 'email', direcao: 'asc' });
    });

    it('should switch from asc to desc on the same column', () => {
      expect(proximaOrdenacao({ campo: 'email', direcao: 'asc' }, 'email', padrao))
        .toEqual({ campo: 'email', direcao: 'desc' });
    });

    it('should return to the default order after desc on the same column', () => {
      expect(proximaOrdenacao({ campo: 'email', direcao: 'desc' }, 'email', padrao))
        .toEqual({ campo: 'nome', direcao: 'asc' });
    });

    it('should cycle the default column asc → desc → asc', () => {
      const aposPrimeiro = proximaOrdenacao(padrao, 'nome', padrao);
      expect(aposPrimeiro).toEqual({ campo: 'nome', direcao: 'desc' });
      expect(proximaOrdenacao(aposPrimeiro, 'nome', padrao)).toEqual({ campo: 'nome', direcao: 'asc' });
    });

    it('should not mutate its arguments', () => {
      const atual: Ordenacao = { campo: 'email', direcao: 'desc' };
      proximaOrdenacao(atual, 'email', padrao);
      expect(atual).toEqual({ campo: 'email', direcao: 'desc' });
      expect(padrao).toEqual({ campo: 'nome', direcao: 'asc' });
    });
  });
});
