import { diasEntre, diasNoMes, hojeIso, MESES_LABEL } from './calendario';

/**
 * Regras puras da tela de indicadores (issue #130): rótulos de mês, taxa de
 * ocupação, período do ranking e a geometria dos gráficos de barras. A tela só
 * desenha o que sai daqui.
 */

/** Janelas oferecidas no seletor. A API aceita de 1 a 24 meses. */
export const MESES_OPCOES = [6, 12, 24] as const;
export const MESES_PADRAO = 12;

/** Mesmo teto do `PeriodoGuard` da API para o ranking por profissional. */
export const LIMITE_DIAS_RANKING = 366;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numeroCompacto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/**
 * Valor curto para o eixo Y: o rótulo mora em unidades do `viewBox` e encolhe
 * junto com o desenho no celular, então "R$ 2.000,00" não caberia na margem.
 */
export function formatarValorCompacto(valor: number): string {
  if (Math.abs(valor) >= 1000) return `${numeroCompacto.format(valor / 1000)} mil`;
  return numeroCompacto.format(valor);
}

function partesMes(mes: string): { ano: number; indice: number } {
  const [ano, numero] = mes.split('-').map(Number);
  return { ano, indice: numero - 1 };
}

/** `2026-01` → `jan/26`, para o eixo X. */
export function rotuloMesCurto(mes: string): string {
  const { ano, indice } = partesMes(mes);
  return `${MESES_LABEL[indice].slice(0, 3)}/${String(ano).slice(-2)}`;
}

/** `2026-01` → `janeiro de 2026`, para tabelas e rótulos acessíveis. */
export function rotuloMesExtenso(mes: string): string {
  const { ano, indice } = partesMes(mes);
  return `${MESES_LABEL[indice]} de ${ano}`;
}

/**
 * Fração das aulas do mês que foram realizadas. `null` quando o mês não teve
 * aula nenhuma: 0% diria que todas falharam, o que não é verdade.
 */
export function taxaOcupacao(realizadas: number, agendadas: number): number | null {
  const total = realizadas + agendadas;
  return total === 0 ? null : realizadas / total;
}

export function formatarPercentual(taxa: number | null): string {
  return taxa === null ? '—' : `${Math.round(taxa * 100)}%`;
}

/** Primeiro e último dia do mês de `hoje`, padrão do ranking (o mesmo da API). */
export function periodoDoMesAtual(hoje: string = hojeIso()): { inicio: string; fim: string } {
  const [ano, mes] = hoje.split('-').map(Number);
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
  return { inicio: `${prefixo}-01`, fim: `${prefixo}-${diasNoMes(ano, mes)}` };
}

/**
 * Mensagem de erro do período do ranking, ou `null` se ele é aceito. Repete a
 * validação da API para o usuário não esperar uma ida ao servidor pelo `400`.
 */
export function validarPeriodoRanking(inicio: string, fim: string): string | null {
  if (!inicio || !fim) return 'Informe a data inicial e a final.';
  if (inicio > fim) return 'A data inicial deve ser menor ou igual à data final.';
  if (diasEntre(inicio, fim) + 1 > LIMITE_DIAS_RANKING) {
    return `O período pode ter no máximo ${LIMITE_DIAS_RANKING} dias.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Gráfico de barras
// ---------------------------------------------------------------------------

export interface SerieBarras {
  /** Vira a classe `grafico-serie-<chave>`, que dá a cor. */
  chave: string;
  rotulo: string;
  /** Um valor por mês, na mesma ordem de `meses`. */
  valores: number[];
}

export interface GraficoBarra {
  chave: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface GraficoGrupo {
  mes: string;
  barras: GraficoBarra[];
}

export interface GraficoMarcaY {
  y: number;
  rotulo: string;
}

export interface GraficoMarcaX {
  x: number;
  rotulo: string;
}

export interface GraficoArea {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

export interface GraficoBarras {
  viewBox: string;
  area: GraficoArea;
  grupos: GraficoGrupo[];
  marcasY: GraficoMarcaY[];
  marcasX: GraficoMarcaX[];
  series: Pick<SerieBarras, 'chave' | 'rotulo'>[];
  ariaLabel: string;
}

export interface OpcoesGraficoBarras {
  titulo: string;
  /** Rótulo das marcas do eixo Y. */
  formatarEixo: (valor: number) => string;
  /** Contagens não têm marca fracionária: "2,5 aulas" não existe. */
  inteiro?: boolean;
}

export const GRAFICO_LARGURA = 640;
const GRAFICO_ALTURA = 240;
const GRAFICO_MARGEM = { topo: 12, direita: 8, base: 30, esquerda: 52 };
/** Com 24 meses, um rótulo por barra se sobreporia. */
const GRAFICO_MAX_MARCAS_X = 6;
/** Fração da largura de cada mês que fica de respiro entre os grupos. */
const GRAFICO_FOLGA_GRUPO = 0.25;
/** Quantas faixas o eixo Y tenta ter; o passo arredondado decide o número final. */
const GRAFICO_FAIXAS_Y = 4;

/**
 * Passo "redondo" (1, 2 ou 5 × 10ⁿ) mais próximo acima de `bruto`. É o que
 * transforma um máximo de 1.630 em marcas de 500 em 500, e não de 407,5.
 */
function passoRedondo(bruto: number, inteiro: boolean): number {
  if (bruto <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map(fator => fator * magnitude).find(candidato => candidato >= bruto) ?? 10 * magnitude;
  return inteiro ? Math.max(1, Math.round(passo)) : passo;
}

function indicesMarcasX(total: number): number[] {
  if (total <= GRAFICO_MAX_MARCAS_X) return Array.from({ length: total }, (_valor, i) => i);
  const passo = Math.ceil(total / GRAFICO_MAX_MARCAS_X);
  const indices: number[] = [];
  // A partir do fim: o mês atual, o mais consultado, sempre ganha rótulo.
  for (let i = total - 1; i >= 0; i -= passo) indices.unshift(i);
  return indices;
}

/**
 * Geometria de um gráfico de barras agrupadas por mês, em unidades do
 * `viewBox`. Cada mês ocupa uma fatia igual da área; dentro dela, uma barra por
 * série, lado a lado.
 *
 * Os valores em si não são desenhados como texto: ficam na tabela da tela, que
 * é o que um leitor de tela percorre. O `ariaLabel` descreve o gráfico e aponta
 * para ela.
 */
export function montarGraficoBarras(
  meses: string[],
  series: SerieBarras[],
  opcoes: OpcoesGraficoBarras
): GraficoBarras {
  const area: GraficoArea = {
    esquerda: GRAFICO_MARGEM.esquerda,
    direita: GRAFICO_LARGURA - GRAFICO_MARGEM.direita,
    topo: GRAFICO_MARGEM.topo,
    base: GRAFICO_ALTURA - GRAFICO_MARGEM.base
  };
  const inteiro = opcoes.inteiro ?? false;
  const maximo = Math.max(0, ...series.flatMap(serie => serie.valores));
  const passo = passoRedondo(maximo / GRAFICO_FAIXAS_Y, inteiro);
  const teto = Math.max(passo, Math.ceil(maximo / passo) * passo);
  const alturaUtil = area.base - area.topo;
  const yDe = (valor: number) => area.base - (valor / teto) * alturaUtil;

  const marcasY: GraficoMarcaY[] = [];
  // Por índice, e não somando o passo: 0,1 + 0,2 acumularia erro de ponto flutuante.
  const faixas = Math.round(teto / passo);
  for (let i = 0; i <= faixas; i++) {
    const valor = i * passo;
    marcasY.push({ y: yDe(valor), rotulo: opcoes.formatarEixo(valor) });
  }

  const larguraMes = meses.length === 0 ? 0 : (area.direita - area.esquerda) / meses.length;
  const folga = larguraMes * GRAFICO_FOLGA_GRUPO;
  const larguraBarra = series.length === 0 ? 0 : (larguraMes - folga) / series.length;

  const grupos: GraficoGrupo[] = meses.map((mes, indice) => {
    const inicioGrupo = area.esquerda + indice * larguraMes + folga / 2;
    return {
      mes,
      barras: series.map((serie, posicao) => {
        const valor = Math.max(0, serie.valores[indice] ?? 0);
        const y = yDe(valor);
        return { chave: serie.chave, x: inicioGrupo + posicao * larguraBarra, y, largura: larguraBarra, altura: area.base - y };
      })
    };
  });

  const marcasX = indicesMarcasX(meses.length).map(indice => ({
    x: area.esquerda + (indice + 0.5) * larguraMes,
    rotulo: rotuloMesCurto(meses[indice])
  }));

  const periodo = meses.length === 0
    ? 'sem meses'
    : `de ${rotuloMesExtenso(meses[0])} a ${rotuloMesExtenso(meses[meses.length - 1])}`;
  const nomesSeries = series.map(serie => serie.rotulo.toLowerCase()).join(' e ');

  return {
    viewBox: `0 0 ${GRAFICO_LARGURA} ${GRAFICO_ALTURA}`,
    area,
    grupos,
    marcasY,
    marcasX,
    series: series.map(({ chave, rotulo }) => ({ chave, rotulo })),
    ariaLabel: `${opcoes.titulo}: barras mensais de ${nomesSeries}, ${periodo}. Os valores estão na tabela a seguir.`
  };
}
