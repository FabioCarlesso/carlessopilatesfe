/**
 * Opções pré-definidas da anamnese, da avaliação fisioterapêutica e da reavaliação
 * (issue #306, carlessopilatesapi#248). As listas vêm do catálogo
 * `GET /api/avaliacoes/opcoes`; o FE não repete nenhuma delas.
 */

export type SelecaoOpcao = 'UNICA' | 'MULTIPLA';

export type ResultadoTesteFuncional = 'POSITIVO' | 'NEGATIVO';

export interface OpcaoAvaliacao {
  /** Valor gravado e enviado à API (`CERVICAL`, `OMBRO_DIREITO`...). */
  valor: string;
  rotulo: string;
  /** `false` = opção aposentada: aparece nos registros que a têm, mas não é oferecida em seleção nova. */
  ativa: boolean;
}

export interface CampoOpcoesAvaliacao {
  /** Nome da propriedade nos DTOs (já com o sufixo `Opcao`/`Opcoes` quando colide com um texto livre). */
  campo: string;
  rotulo: string;
  selecao: SelecaoOpcao;
  /** `true` só em `testesFuncionais`: cada item leva resultado. */
  comResultado: boolean;
  opcoes: OpcaoAvaliacao[];
  /** Nome da propriedade do texto livre que acompanha o campo. */
  campoComplemento?: string;
}

export interface CatalogoOpcoesAvaliacao {
  campos: CampoOpcoesAvaliacao[];
}

export interface TesteFuncionalRealizado {
  teste: string;
  resultado: ResultadoTesteFuncional;
}

/**
 * Como o formulário guarda o campo: lista de valores, valor único ou lista de
 * testes com resultado. Fica no FE porque o controle precisa existir antes de o
 * catálogo chegar; o catálogo é que decide rótulos e opções.
 */
export type TipoCampoOpcoes = 'multipla' | 'unica' | 'testes';

export interface DefinicaoCampoOpcoes {
  campo: string;
  complemento: string;
  tipo: TipoCampoOpcoes;
}

const REGIOES_DOR: DefinicaoCampoOpcoes = { campo: 'regioesDor', complemento: 'regioesDorComplemento', tipo: 'multipla' };

export const CAMPOS_OPCOES_ANAMNESE: readonly DefinicaoCampoOpcoes[] = [
  REGIOES_DOR,
  { campo: 'condicoesSaude', complemento: 'condicoesSaudeComplemento', tipo: 'multipla' },
  { campo: 'nivelAtividadeFisicaOpcao', complemento: 'nivelAtividadeFisicaComplemento', tipo: 'unica' },
  { campo: 'objetivosOpcoes', complemento: 'objetivosComplemento', tipo: 'multipla' }
];

/** Exame físico: os mesmos nomes na avaliação e na reavaliação, para as duas serem comparáveis. */
export const CAMPOS_OPCOES_EXAME_FISICO: readonly DefinicaoCampoOpcoes[] = [
  { campo: 'achadosPosturais', complemento: 'achadosPosturaisComplemento', tipo: 'multipla' },
  { campo: 'padraoRespiratorioOpcao', complemento: 'padraoRespiratorioComplemento', tipo: 'unica' },
  { campo: 'equilibrioOpcao', complemento: 'equilibrioComplemento', tipo: 'unica' },
  { campo: 'coordenacaoMotoraOpcao', complemento: 'coordenacaoMotoraComplemento', tipo: 'unica' },
  { campo: 'testesFuncionais', complemento: 'testesFuncionaisComplemento', tipo: 'testes' }
];

/** A reavaliação também registra as regiões de dor, para comparar a dor com a anamnese. */
export const CAMPOS_OPCOES_REAVALIACAO: readonly DefinicaoCampoOpcoes[] = [REGIOES_DOR, ...CAMPOS_OPCOES_EXAME_FISICO];

/** Campos estruturados da anamnese; opcionais porque a API anterior à #248 não os manda. */
export interface CamposOpcoesAnamnese {
  regioesDor?: string[];
  regioesDorComplemento?: string | null;
  condicoesSaude?: string[];
  condicoesSaudeComplemento?: string | null;
  nivelAtividadeFisicaOpcao?: string | null;
  nivelAtividadeFisicaComplemento?: string | null;
  objetivosOpcoes?: string[];
  objetivosComplemento?: string | null;
}

/** Campos estruturados do exame físico (avaliação e reavaliação). */
export interface CamposOpcoesExameFisico {
  achadosPosturais?: string[];
  achadosPosturaisComplemento?: string | null;
  padraoRespiratorioOpcao?: string | null;
  padraoRespiratorioComplemento?: string | null;
  equilibrioOpcao?: string | null;
  equilibrioComplemento?: string | null;
  coordenacaoMotoraOpcao?: string | null;
  coordenacaoMotoraComplemento?: string | null;
  testesFuncionais?: TesteFuncionalRealizado[];
  testesFuncionaisComplemento?: string | null;
}

export interface CamposOpcoesReavaliacao extends CamposOpcoesExameFisico {
  regioesDor?: string[];
  regioesDorComplemento?: string | null;
}
