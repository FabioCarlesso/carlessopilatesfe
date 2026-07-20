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

export interface LandmarkDTO {
  codigo: string;
  x: number;
  y: number;
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

export interface AvaliacaoPosturalFotoResponseDTO {
  avaliacaoPosturalId: number;
  contentType: string;
  tamanhoBytes: number;
  larguraPx: number;
  alturaPx: number;
  dataCriacao: string;
}
