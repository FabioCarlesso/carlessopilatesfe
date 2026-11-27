/**
 * Mapa corporal de dor (issue #307, API carlessopilatesapi#249).
 *
 * Cada ponto guarda a vista, a posição normalizada (0 a 1) em relação ao
 * `viewBox` 240×520 dos desenhos e a `desenhoVersao` em que foi marcado: um
 * registro antigo abre sempre sobre o desenho da versão dele.
 */
export type VistaCorporal = 'FRENTE' | 'COSTAS' | 'LATERAL_DIREITA' | 'LATERAL_ESQUERDA';

export const VISTAS_CORPORAIS: readonly VistaCorporal[] = ['FRENTE', 'COSTAS', 'LATERAL_DIREITA', 'LATERAL_ESQUERDA'];

export const VISTA_CORPORAL_LABEL: Record<VistaCorporal, string> = {
  FRENTE: 'Frente',
  COSTAS: 'Costas',
  LATERAL_DIREITA: 'Lateral direita',
  LATERAL_ESQUERDA: 'Lateral esquerda'
};

/** Nome do arquivo de cada vista em `public/mapa-corporal/v{versao}/`. */
export const VISTA_CORPORAL_ARQUIVO: Record<VistaCorporal, string> = {
  FRENTE: 'frente',
  COSTAS: 'costas',
  LATERAL_DIREITA: 'lateral-direita',
  LATERAL_ESQUERDA: 'lateral-esquerda'
};

/**
 * Versão do desenho usada pelos pontos novos. Trocar o desenho é criar a pasta
 * `public/mapa-corporal/v2/` e mudar só esta constante — ver
 * `scripts/mapa-corporal/README.md`.
 */
export const DESENHO_VERSAO_ATUAL = 1;

/** Limite de pontos por registro, igual ao da API (51 → `400`). */
export const MAX_PONTOS_DOR = 50;

/** Tamanho máximo da observação do ponto, igual ao da API. */
export const MAX_OBSERVACAO_PONTO_DOR = 200;

/** `viewBox` comum a todas as vistas e versões do desenho. */
export const LARGURA_DESENHO = 240;
export const ALTURA_DESENHO = 520;

export interface PontoDor {
  vista: VistaCorporal;
  x: number;
  y: number;
  desenhoVersao: number;
  intensidade: number | null;
  observacao: string | null;
}

export interface PontoDorDTO extends PontoDor {
  id: number;
}

export interface PontosDorRequestDTO {
  pontos: PontoDor[];
}

/** Registro do paciente de onde vêm os pontos: avaliação fisioterapêutica ou reavaliação. */
export type OrigemPontosDor = 'AVALIACAO' | 'REAVALIACAO';

/** Item de `GET /pacientes/{id}/pontos-dor`: só registros com pontos, do mais antigo ao mais recente. */
export interface PontosDorRegistroDTO {
  origem: OrigemPontosDor;
  registroId: number;
  data: string;
  pontos: PontoDorDTO[];
}
