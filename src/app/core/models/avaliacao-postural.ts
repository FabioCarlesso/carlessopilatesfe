export type VistaPostural = 'FRENTE' | 'COSTAS' | 'LADO_DIREITO' | 'LADO_ESQUERDO';

export const VISTA_POSTURAL_LABEL: Record<VistaPostural, string> = {
  FRENTE: 'Frente',
  COSTAS: 'Costas',
  LADO_DIREITO: 'Lado direito',
  LADO_ESQUERDO: 'Lado esquerdo'
};

export const VISTA_POSTURAL_OPTIONS: { valor: VistaPostural; label: string }[] = (
  Object.keys(VISTA_POSTURAL_LABEL) as VistaPostural[]
).map(valor => ({ valor, label: VISTA_POSTURAL_LABEL[valor] }));

export type StatusAvaliacaoPostural = 'RASCUNHO' | 'CONCLUIDA';

export const STATUS_AVALIACAO_POSTURAL_LABEL: Record<StatusAvaliacaoPostural, string> = {
  RASCUNHO: 'Rascunho',
  CONCLUIDA: 'Concluída'
};

/** Códigos aceitos pela API (`CodigoLandmark`): pares esq./dir. nas vistas frontais, pontos únicos nas laterais. */
export type CodigoLandmark =
  | 'OLHO_ESQ'
  | 'OLHO_DIR'
  | 'OMBRO_ESQ'
  | 'OMBRO_DIR'
  | 'QUADRIL_ESQ'
  | 'QUADRIL_DIR'
  | 'JOELHO_ESQ'
  | 'JOELHO_DIR'
  | 'TORNOZELO_ESQ'
  | 'TORNOZELO_DIR'
  | 'ORELHA'
  | 'OMBRO'
  | 'QUADRIL'
  | 'JOELHO'
  | 'TORNOZELO';

export interface LandmarkDTO {
  codigo: CodigoLandmark;
  x: number;
  y: number;
}

/**
 * Definição de um ponto anatômico marcável. `alvo` já vem com a preposição para
 * compor a instrução da marcação guiada ("Toque no ombro direito na foto").
 */
export interface DefinicaoLandmark {
  codigo: CodigoLandmark;
  label: string;
  alvo: string;
}

/** Ordem da marcação guiada nas vistas frontais: da cabeça aos pés, esquerda antes da direita. */
export const LANDMARKS_FRONTAIS: readonly DefinicaoLandmark[] = [
  { codigo: 'OLHO_ESQ', label: 'Olho esquerdo', alvo: 'no olho esquerdo' },
  { codigo: 'OLHO_DIR', label: 'Olho direito', alvo: 'no olho direito' },
  { codigo: 'OMBRO_ESQ', label: 'Ombro esquerdo (acrômio)', alvo: 'no ombro esquerdo (acrômio)' },
  { codigo: 'OMBRO_DIR', label: 'Ombro direito (acrômio)', alvo: 'no ombro direito (acrômio)' },
  { codigo: 'QUADRIL_ESQ', label: 'Quadril esquerdo (EIAS)', alvo: 'no quadril esquerdo (EIAS)' },
  { codigo: 'QUADRIL_DIR', label: 'Quadril direito (EIAS)', alvo: 'no quadril direito (EIAS)' },
  { codigo: 'JOELHO_ESQ', label: 'Joelho esquerdo', alvo: 'no joelho esquerdo' },
  { codigo: 'JOELHO_DIR', label: 'Joelho direito', alvo: 'no joelho direito' },
  { codigo: 'TORNOZELO_ESQ', label: 'Tornozelo esquerdo (maléolo)', alvo: 'no tornozelo esquerdo (maléolo)' },
  { codigo: 'TORNOZELO_DIR', label: 'Tornozelo direito (maléolo)', alvo: 'no tornozelo direito (maléolo)' }
];

/** Ordem da marcação guiada nas vistas laterais. */
export const LANDMARKS_LATERAIS: readonly DefinicaoLandmark[] = [
  { codigo: 'ORELHA', label: 'Orelha (trago)', alvo: 'na orelha (trago)' },
  { codigo: 'OMBRO', label: 'Ombro', alvo: 'no ombro' },
  { codigo: 'QUADRIL', label: 'Quadril (trocânter)', alvo: 'no quadril (trocânter)' },
  { codigo: 'JOELHO', label: 'Joelho', alvo: 'no joelho' },
  { codigo: 'TORNOZELO', label: 'Tornozelo', alvo: 'no tornozelo' }
];

export function vistaEhLateral(vista: VistaPostural): boolean {
  return vista === 'LADO_DIREITO' || vista === 'LADO_ESQUERDO';
}

/** Pontos da vista — todos obrigatórios para a API aceitar a conclusão da análise. */
export function landmarksDaVista(vista: VistaPostural): readonly DefinicaoLandmark[] {
  return vistaEhLateral(vista) ? LANDMARKS_LATERAIS : LANDMARKS_FRONTAIS;
}

export interface MetricasPosturaisDTO {
  inclinacaoCabecaGraus: number | null;
  desnivelOmbrosGraus: number | null;
  desnivelQuadrilGraus: number | null;
  desnivelJoelhosGraus: number | null;
  desvioPrumoNormalizado: number | null;
  desvioPrumoCm: number | null;
}

export interface AvaliacaoPosturalRequestDTO {
  avaliacaoFisioterapeuticaId: number;
  vista: VistaPostural;
}

export interface AvaliacaoPosturalResponseDTO {
  id: number;
  avaliacaoFisioterapeuticaId: number;
  vista: VistaPostural;
  status: StatusAvaliacaoPostural;
  linhaPrumoX: number | null;
  calibracaoCmPorUnidade: number | null;
  proporcaoImagem: number | null;
  observacoes: string | null;
  temFoto: boolean;
  landmarks: LandmarkDTO[];
  metricas: MetricasPosturaisDTO | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}

/**
 * Atualização da marcação (apenas em RASCUNHO). As métricas nunca são enviadas:
 * a API as recalcula a cada salvamento. `landmarks` substitui integralmente os
 * pontos anteriores quando enviado.
 */
export interface AvaliacaoPosturalUpdateDTO {
  linhaPrumoX?: number | null;
  calibracaoCmPorUnidade?: number | null;
  proporcaoImagem?: number | null;
  observacoes?: string | null;
  landmarks?: LandmarkDTO[];
}

export interface AvaliacaoPosturalFotoResponseDTO {
  avaliacaoPosturalId: number;
  contentType: string;
  tamanhoBytes: number;
  larguraPx: number;
  alturaPx: number;
  dataCriacao: string;
}
