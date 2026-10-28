/**
 * Regras puras dos gráficos de proporção do dashboard (issue #120): quanto
 * cada parte representa do todo e onde cada fatia começa na rosca. O
 * componente `app-grafico-proporcao` só desenha o que sai daqui.
 */

/**
 * Papel da cor de cada parte. A variante é semântica, e não um nome de cor,
 * para o SCSS do componente escolher o token com versão nos dois temas.
 */
export type VarianteSegmento = 'marca' | 'sucesso' | 'alerta' | 'perigo' | 'neutro';

export interface SegmentoProporcao {
  chave: string;
  rotulo: string;
  valor: number;
  variante: VarianteSegmento;
}

export interface SegmentoCalculado extends SegmentoProporcao {
  /** Fração do total, de 0 a 1 — usada na geometria. */
  fracao: number;
  /** Fração acumulada das partes anteriores: onde a fatia começa na rosca. */
  inicio: number;
  /** Percentual inteiro exibido na legenda. A soma das partes é sempre 100. */
  percentual: number;
}

export interface Proporcao {
  total: number;
  segmentos: SegmentoCalculado[];
}

/** Contagem só pode ser inteiro não negativo; o resto vira zero em vez de quebrar o desenho. */
function valorSeguro(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/**
 * Percentuais inteiros pelo método do maior resto: arredondar cada parte por
 * conta própria pode somar 99% ou 101% (ex.: três partes iguais dariam 33%
 * cada), e a legenda contradiria o "de 100%" que o desenho sugere. O resto é
 * calculado em inteiros (`valor * 100 mod total`), e não como a parte
 * fracionária de uma divisão: restos iguais em ponto flutuante podem diferir
 * no último bit e premiar uma parte qualquer em vez da primeira.
 */
function percentuaisInteiros(valores: number[], total: number): number[] {
  if (total === 0) return valores.map(() => 0);
  const inteiros = valores.map(valor => Math.floor((valor * 100) / total));
  let faltam = 100 - inteiros.reduce((soma, valor) => soma + valor, 0);
  const porResto = valores
    .map((valor, indice) => ({ indice, resto: valor * 100 - inteiros[indice] * total }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
  for (const { indice } of porResto) {
    if (faltam <= 0) break;
    inteiros[indice] += 1;
    faltam -= 1;
  }
  return inteiros;
}

export function calcularProporcao(segmentos: readonly SegmentoProporcao[]): Proporcao {
  const valores = segmentos.map(segmento => valorSeguro(segmento.valor));
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  const percentuais = percentuaisInteiros(valores, total);

  let acumulado = 0;
  const calculados = segmentos.map((segmento, indice) => {
    const fracao = total === 0 ? 0 : valores[indice] / total;
    const calculado: SegmentoCalculado = {
      ...segmento,
      valor: valores[indice],
      fracao,
      inicio: acumulado,
      percentual: percentuais[indice]
    };
    acumulado += fracao;
    return calculado;
  });

  return { total, segmentos: calculados };
}
