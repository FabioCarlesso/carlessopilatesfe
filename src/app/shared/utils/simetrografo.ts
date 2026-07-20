import {
  AvaliacaoPosturalUpdateDTO,
  CodigoLandmark,
  DefinicaoLandmark,
  LandmarkDTO
} from '../../core/models/avaliacao-postural';

/** Ponto em coordenadas normalizadas (0 a 1) relativas à imagem natural. */
export interface PontoNormalizado {
  x: number;
  y: number;
}

/** Ponto em pixels de tela (coordenadas de cliente do ponteiro). */
export interface PontoTela {
  x: number;
  y: number;
}

/**
 * Retângulo ocupado pela imagem renderizada na tela. Como o zoom e o pan são
 * aplicados por transform CSS no elemento, o `getBoundingClientRect()` da
 * imagem já reflete ambos — por isso a conversão abaixo continua correta em
 * qualquer nível de zoom/pan sem precisar conhecê-los.
 */
export interface RetanguloImagem {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 6;
export const PASSO_ZOOM = 0.5;

/**
 * Posição inicial da linha de prumo quando a análise ainda não tem uma salva.
 * Compartilhada entre o editor (que a exibe) e a página (que a persiste), para
 * que o valor mostrado e o salvo nunca divirjam.
 */
export const PRUMO_PADRAO = 0.5;

/** Casas decimais das coordenadas enviadas à API — evita ruído de ponto flutuante no payload. */
const CASAS_DECIMAIS = 4;

export function limitarZoom(zoom: number): number {
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
}

function limitar01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

function arredondar(valor: number): number {
  const fator = 10 ** CASAS_DECIMAIS;
  return Math.round(valor * fator) / fator;
}

/**
 * Converte um ponto de tela em coordenadas normalizadas relativas à imagem,
 * limitando a [0,1] — a API rejeita coordenadas fora desse intervalo.
 */
export function paraNormalizado(ponto: PontoTela, rect: RetanguloImagem): PontoNormalizado {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: arredondar(limitar01((ponto.x - rect.left) / rect.width)),
    y: arredondar(limitar01((ponto.y - rect.top) / rect.height))
  };
}

/** Converte coordenadas normalizadas de volta para pixels de tela. */
export function paraTela(ponto: PontoNormalizado, rect: RetanguloImagem): PontoTela {
  return {
    x: rect.left + ponto.x * rect.width,
    y: rect.top + ponto.y * rect.height
  };
}

export function distancia(a: PontoTela, b: PontoTela): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Dimensões de uma área na tela, em pixels. */
export interface Dimensoes {
  width: number;
  height: number;
}

/**
 * Limita o deslocamento para que a foto não seja arrastada inteiramente para
 * fora da área visível: quando ampliada, suas bordas param no limite do
 * viewport; quando cabe inteira, ela permanece dentro dele.
 *
 * Considera o palco com `transform-origin` no canto superior esquerdo, então
 * `conteudo` são as dimensões já multiplicadas pelo zoom.
 */
export function limitarPan(pan: PontoTela, viewport: Dimensoes, conteudo: Dimensoes): PontoTela {
  const limitarEixo = (valor: number, disponivel: number, ocupado: number): number => {
    const folga = disponivel - ocupado;
    return Math.min(Math.max(valor, Math.min(0, folga)), Math.max(0, folga));
  };

  return {
    x: limitarEixo(pan.x, viewport.width, conteudo.width),
    y: limitarEixo(pan.y, viewport.height, conteudo.height)
  };
}

/**
 * Próximo ponto da sequência guiada ainda não marcado, ou `null` quando a vista
 * está completa.
 */
export function proximoPendente(
  sequencia: readonly DefinicaoLandmark[],
  landmarks: readonly LandmarkDTO[]
): DefinicaoLandmark | null {
  const marcados = new Set(landmarks.map(l => l.codigo));
  return sequencia.find(def => !marcados.has(def.codigo)) ?? null;
}

/**
 * Landmark marcado mais próximo do ponteiro dentro da tolerância, para permitir
 * a correção por arraste.
 */
export function landmarkMaisProximo(
  landmarks: readonly LandmarkDTO[],
  ponteiro: PontoTela,
  rect: RetanguloImagem,
  toleranciaPx: number
): LandmarkDTO | null {
  let maisProximo: LandmarkDTO | null = null;
  let menorDistancia = toleranciaPx;

  for (const landmark of landmarks) {
    const d = distancia(ponteiro, paraTela(landmark, rect));
    if (d <= menorDistancia) {
      menorDistancia = d;
      maisProximo = landmark;
    }
  }

  return maisProximo;
}

/** Insere ou reposiciona um ponto, preservando a ordem de marcação dos demais. */
export function definirLandmark(
  landmarks: readonly LandmarkDTO[],
  codigo: CodigoLandmark,
  ponto: PontoNormalizado
): LandmarkDTO[] {
  const atualizado: LandmarkDTO = { codigo, x: ponto.x, y: ponto.y };
  const indice = landmarks.findIndex(l => l.codigo === codigo);
  if (indice === -1) {
    return [...landmarks, atualizado];
  }
  const copia = [...landmarks];
  copia[indice] = atualizado;
  return copia;
}

/** Estado de edição versionado pelo histórico de desfazer. */
export interface EstadoMarcacao {
  landmarks: LandmarkDTO[];
  linhaPrumoX: number | null;
}

/**
 * Pilha de desfazer baseada em snapshots do estado. Cada ação (marcação,
 * arraste ou ajuste do prumo) empilha o estado anterior; desfazer devolve o
 * topo da pilha.
 */
export class HistoricoEdicao {
  private readonly pilha: EstadoMarcacao[] = [];

  constructor(private readonly limite = 50) {}

  get podeDesfazer(): boolean {
    return this.pilha.length > 0;
  }

  get tamanho(): number {
    return this.pilha.length;
  }

  empilhar(estado: EstadoMarcacao): void {
    this.pilha.push({ landmarks: [...estado.landmarks], linhaPrumoX: estado.linhaPrumoX });
    if (this.pilha.length > this.limite) {
      this.pilha.shift();
    }
  }

  desfazer(): EstadoMarcacao | null {
    return this.pilha.pop() ?? null;
  }

  limpar(): void {
    this.pilha.length = 0;
  }
}

/**
 * Monta o corpo do `PUT /api/avaliacoes-posturais/{id}`. A proporção da imagem
 * (largura/altura natural) acompanha o salvamento porque a API depende dela
 * para calcular os ângulos corretamente.
 */
export function montarPayloadRascunho(
  estado: EstadoMarcacao,
  proporcaoImagem: number | null
): AvaliacaoPosturalUpdateDTO {
  const payload: AvaliacaoPosturalUpdateDTO = {
    landmarks: estado.landmarks.map(l => ({ codigo: l.codigo, x: l.x, y: l.y })),
    linhaPrumoX: estado.linhaPrumoX
  };

  if (proporcaoImagem !== null && proporcaoImagem > 0) {
    payload.proporcaoImagem = arredondar(proporcaoImagem);
  }

  return payload;
}
