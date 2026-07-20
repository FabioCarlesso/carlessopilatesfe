import {
  CodigoLandmark,
  LandmarkDTO,
  MetricasPosturaisDTO,
  VistaPostural,
  vistaEhLateral
} from '../../core/models/avaliacao-postural';

/**
 * Limiar único a partir do qual um desnível é destacado como assimetria. Está
 * na lista de validação pendente da especificação (a fisioterapeuta ainda vai
 * confirmar o valor clínico), por isso vive aqui como constante isolada em vez
 * de espalhado pelos templates.
 */
export const LIMIAR_ASSIMETRIA_GRAUS = 2;

/**
 * Equivalente relativo do limiar para o desvio de prumo, que não é um ângulo:
 * 2% da largura da foto em coordenadas normalizadas. Acompanha
 * `LIMIAR_ASSIMETRIA_GRAUS` quando o valor clínico for revisado.
 */
export const LIMIAR_DESVIO_PRUMO_NORMALIZADO = 0.02;

/** Casas decimais dos ângulos, iguais às do backend (`ESCALA_GRAUS`). */
const CASAS_GRAUS = 2;

/** Casas decimais do desvio de prumo normalizado (`ESCALA_NORMALIZADA` no backend). */
const CASAS_NORMALIZADA = 4;

const CASAS_CM = 2;

/** Par de pontos cujo desnível é medido e cuja linha de referência é desenhada sobre a foto. */
export interface ParReferencia {
  esquerdo: CodigoLandmark;
  direito: CodigoLandmark;
}

/**
 * Pares das vistas frontais. Tornozelos entram apenas como linha de referência:
 * o backend não publica métrica para eles.
 */
export const PARES_REFERENCIA: readonly ParReferencia[] = [
  { esquerdo: 'OLHO_ESQ', direito: 'OLHO_DIR' },
  { esquerdo: 'OMBRO_ESQ', direito: 'OMBRO_DIR' },
  { esquerdo: 'QUADRIL_ESQ', direito: 'QUADRIL_DIR' },
  { esquerdo: 'JOELHO_ESQ', direito: 'JOELHO_DIR' },
  { esquerdo: 'TORNOZELO_ESQ', direito: 'TORNOZELO_DIR' }
];

/**
 * Arredondamento meio-para-cima, como o `RoundingMode.HALF_UP` do backend —
 * `Math.round` difere dele em valores negativos exatamente no meio.
 */
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  const escalado = valor * fator;
  const arredondado = escalado < 0 ? -Math.round(Math.abs(escalado)) : Math.round(escalado);
  return arredondado / fator;
}

function indexarPorCodigo(landmarks: readonly LandmarkDTO[]): Map<CodigoLandmark, LandmarkDTO> {
  return new Map(landmarks.map(l => [l.codigo, l]));
}

/**
 * Ângulo, em graus, da reta que liga os dois pontos em relação à horizontal.
 *
 * Espelha `MetricasPosturaisCalculator.angulo` do backend: as coordenadas são
 * normalizadas, então os eixos só têm a mesma escala em fotos quadradas — o
 * deslocamento horizontal é reescalado pela proporção (largura/altura) antes do
 * `atan2`, senão os graus saem distorcidos. Sem proporção, assume foto quadrada.
 *
 * O resultado é normalizado para (-90, 90]: a reta é a mesma independentemente
 * de qual ponto foi marcado primeiro.
 */
export function anguloEntre(
  a: LandmarkDTO | undefined,
  b: LandmarkDTO | undefined,
  proporcaoImagem: number | null
): number | null {
  if (!a || !b) return null;

  const proporcao = proporcaoImagem ?? 1;
  const dx = (b.x - a.x) * proporcao;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;

  let graus = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (graus > 90) {
    graus -= 180;
  } else if (graus <= -90) {
    graus += 180;
  }
  return arredondar(graus, CASAS_GRAUS);
}

/**
 * Desvio horizontal do tronco em relação à linha de prumo, em unidades
 * normalizadas: nas vistas frontais usa o ponto médio entre os acrômios; nas
 * laterais, o próprio acrômio. Espelha `MetricasPosturaisCalculator.desvioPrumo`.
 */
export function desvioPrumo(
  vista: VistaPostural,
  landmarks: readonly LandmarkDTO[],
  linhaPrumoX: number | null
): number | null {
  if (linhaPrumoX === null) return null;

  const porCodigo = indexarPorCodigo(landmarks);
  let referenciaX: number;

  if (vistaEhLateral(vista)) {
    const ombro = porCodigo.get('OMBRO');
    if (!ombro) return null;
    referenciaX = ombro.x;
  } else {
    const esquerdo = porCodigo.get('OMBRO_ESQ');
    const direito = porCodigo.get('OMBRO_DIR');
    if (!esquerdo || !direito) return null;
    referenciaX = (esquerdo.x + direito.x) / 2;
  }

  return arredondar(Math.abs(referenciaX - linhaPrumoX), CASAS_NORMALIZADA);
}

/**
 * Prévia local das métricas, calculada com a mesma trigonometria do backend
 * para dar retorno imediato durante a marcação. O valor oficial continua sendo
 * o que a API devolve ao salvar — divergências resolvem-se a favor dela.
 */
export function calcularMetricas(
  vista: VistaPostural,
  landmarks: readonly LandmarkDTO[],
  linhaPrumoX: number | null,
  proporcaoImagem: number | null,
  calibracaoCmPorUnidade: number | null = null
): MetricasPosturaisDTO {
  const porCodigo = indexarPorCodigo(landmarks);
  const angulo = (par: ParReferencia): number | null =>
    anguloEntre(porCodigo.get(par.esquerdo), porCodigo.get(par.direito), proporcaoImagem);

  const desvio = desvioPrumo(vista, landmarks, linhaPrumoX);

  return {
    inclinacaoCabecaGraus: angulo(PARES_REFERENCIA[0]),
    desnivelOmbrosGraus: angulo(PARES_REFERENCIA[1]),
    desnivelQuadrilGraus: angulo(PARES_REFERENCIA[2]),
    desnivelJoelhosGraus: angulo(PARES_REFERENCIA[3]),
    desvioPrumoNormalizado: desvio,
    desvioPrumoCm:
      desvio !== null && calibracaoCmPorUnidade !== null
        ? arredondar(desvio * calibracaoCmPorUnidade, CASAS_CM)
        : null
  };
}

/** Lado que está mais baixo na foto, para compor a leitura "dir. baixo" do painel. */
export type LadoMaisBaixo = 'DIREITA' | 'ESQUERDA';

/**
 * Determina o lado mais baixo comparando o `y` dos dois pontos — e não o sinal
 * do ângulo. O sinal depende de qual ponto ficou à esquerda na imagem, o que se
 * inverte entre as vistas de frente e de costas; o `y` maior é sempre o ponto
 * mais baixo na foto.
 */
export function ladoMaisBaixo(
  landmarks: readonly LandmarkDTO[],
  par: ParReferencia
): LadoMaisBaixo | null {
  const porCodigo = indexarPorCodigo(landmarks);
  const esquerdo = porCodigo.get(par.esquerdo);
  const direito = porCodigo.get(par.direito);
  if (!esquerdo || !direito || esquerdo.y === direito.y) return null;

  return direito.y > esquerdo.y ? 'DIREITA' : 'ESQUERDA';
}

/** Uma linha do painel "Medidas". */
export interface MedidaPostural {
  label: string;
  /** Valor formatado em pt-BR já com unidade, ou `null` quando ainda pendente. */
  texto: string | null;
  /** Complemento de direção ("dir. baixo"), quando a medida tem lado. */
  direcao: string | null;
  /** `true` quando o valor ultrapassa o limiar e deve ser destacado. */
  assimetrica: boolean;
}

const LADO_LABEL: Record<LadoMaisBaixo, string> = {
  DIREITA: 'dir. baixo',
  ESQUERDA: 'esq. baixo'
};

function formatarGraus(valor: number): string {
  return `${Math.abs(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}°`;
}

function medidaAngular(
  label: string,
  graus: number | null,
  landmarks: readonly LandmarkDTO[],
  par: ParReferencia
): MedidaPostural {
  if (graus === null) {
    return { label, texto: null, direcao: null, assimetrica: false };
  }

  const lado = ladoMaisBaixo(landmarks, par);
  return {
    label,
    texto: formatarGraus(graus),
    direcao: lado ? LADO_LABEL[lado] : null,
    assimetrica: Math.abs(graus) >= LIMIAR_ASSIMETRIA_GRAUS
  };
}

/**
 * Monta as linhas do painel de medidas a partir das métricas (locais ou da API)
 * e dos pontos marcados, de onde sai a direção do desnível.
 *
 * O desvio de prumo só aparece em centímetros quando a análise tem calibração;
 * sem ela, exibe apenas o valor relativo, que não depende de referência de
 * tamanho na foto.
 */
export function montarMedidas(
  metricas: MetricasPosturaisDTO | null,
  landmarks: readonly LandmarkDTO[]
): MedidaPostural[] {
  const m = metricas;

  const medidas: MedidaPostural[] = [
    medidaAngular('Cabeça', m?.inclinacaoCabecaGraus ?? null, landmarks, PARES_REFERENCIA[0]),
    medidaAngular('Ombros', m?.desnivelOmbrosGraus ?? null, landmarks, PARES_REFERENCIA[1]),
    medidaAngular('Quadril', m?.desnivelQuadrilGraus ?? null, landmarks, PARES_REFERENCIA[2]),
    medidaAngular('Joelhos', m?.desnivelJoelhosGraus ?? null, landmarks, PARES_REFERENCIA[3])
  ];

  const desvio = m?.desvioPrumoNormalizado ?? null;
  const desvioCm = m?.desvioPrumoCm ?? null;

  medidas.push({
    label: 'Desvio do prumo',
    texto:
      desvio === null
        ? null
        : desvioCm !== null
          ? `${desvioCm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`
          // Até 4 casas: a mesma escala que a API usa para o valor normalizado,
          // para o painel não arredondar o número oficial.
          : desvio.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 }),
    direcao: null,
    assimetrica: desvio !== null && desvio >= LIMIAR_DESVIO_PRUMO_NORMALIZADO
  });

  return medidas;
}
