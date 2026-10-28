import { calcularProporcao, SegmentoProporcao } from './grafico-proporcao';

function segmento(chave: string, valor: number): SegmentoProporcao {
  return { chave, rotulo: chave, valor, variante: 'marca' };
}

describe('calcularProporcao', () => {
  it('soma o total e calcula a fração e o início de cada parte', () => {
    const { total, segmentos } = calcularProporcao([segmento('a', 30), segmento('b', 10)]);

    expect(total).toBe(40);
    expect(segmentos.map(s => s.fracao)).toEqual([0.75, 0.25]);
    expect(segmentos.map(s => s.inicio)).toEqual([0, 0.75]);
    expect(segmentos.map(s => s.percentual)).toEqual([75, 25]);
  });

  it('distribui o arredondamento para os percentuais somarem 100, desempatando pela ordem', () => {
    const { segmentos } = calcularProporcao([segmento('a', 1), segmento('b', 1), segmento('c', 1)]);

    expect(segmentos.map(s => s.percentual)).toEqual([34, 33, 33]);
  });

  it('dá o ponto que sobra à parte de maior resto, e não à primeira', () => {
    // 2/9 = 22,2%, 3/9 = 33,3%, 4/9 = 44,4% → os pisos somam 99.
    const { segmentos } = calcularProporcao([segmento('a', 2), segmento('b', 3), segmento('c', 4)]);

    expect(segmentos.map(s => s.percentual)).toEqual([22, 33, 45]);
  });

  it('zera frações e percentuais quando o total é zero, sem dividir por zero', () => {
    const { total, segmentos } = calcularProporcao([segmento('a', 0), segmento('b', 0)]);

    expect(total).toBe(0);
    expect(segmentos.map(s => s.fracao)).toEqual([0, 0]);
    expect(segmentos.map(s => s.percentual)).toEqual([0, 0]);
  });

  it('mantém a parte zerada na lista, com 0%', () => {
    const { segmentos } = calcularProporcao([segmento('a', 12), segmento('b', 0)]);

    expect(segmentos.length).toBe(2);
    expect(segmentos[1].percentual).toBe(0);
    expect(segmentos[0].percentual).toBe(100);
  });

  it('trata valor negativo ou não numérico como zero', () => {
    const { total, segmentos } = calcularProporcao([
      segmento('a', -3),
      segmento('b', Number.NaN),
      segmento('c', 4)
    ]);

    expect(total).toBe(4);
    expect(segmentos.map(s => s.valor)).toEqual([0, 0, 4]);
    expect(segmentos[2].percentual).toBe(100);
  });
});
