import { AvaliacaoFisioterapeuticaResponseDTO } from '../../core/models/avaliacao-fisioterapeutica';
import { PlanoTratamentoResponseDTO } from '../../core/models/plano-tratamento';
import { ReavaliacaoResponseDTO } from '../../core/models/reavaliacao';

/**
 * Regras puras do fluxo único de avaliação do paciente (issue #305): as etapas de
 * cada fluxo, qual está pendente a partir do que já existe na API e a linha do
 * tempo das avaliações. O componente só exibe e navega pelo que sai daqui.
 */

/** `inicial` vai da anamnese ao plano; `reavaliacao` parte da última avaliação. */
export type FluxoAvaliacao = 'inicial' | 'reavaliacao';

export type EtapaAvaliacao = 'anamnese' | 'avaliacao' | 'postural' | 'plano' | 'reavaliacao';

export interface DefinicaoEtapa {
  chave: EtapaAvaliacao;
  rotulo: string;
  /** Etapa que pode ser pulada: nunca é a pendente. */
  opcional: boolean;
}

export const ETAPAS_FLUXO: Record<FluxoAvaliacao, readonly DefinicaoEtapa[]> = {
  inicial: [
    { chave: 'anamnese', rotulo: 'Anamnese', opcional: false },
    { chave: 'avaliacao', rotulo: 'Avaliação fisioterapêutica', opcional: false },
    { chave: 'postural', rotulo: 'Análise postural', opcional: true },
    { chave: 'plano', rotulo: 'Plano de tratamento', opcional: false }
  ],
  // Na reavaliação o plano já existe (ou não é obrigatório): a etapa é para ajustá-lo.
  reavaliacao: [
    { chave: 'reavaliacao', rotulo: 'Reavaliação', opcional: false },
    { chave: 'postural', rotulo: 'Análise postural', opcional: true },
    { chave: 'plano', rotulo: 'Plano de tratamento', opcional: true }
  ]
};

export type SituacaoEtapa = 'concluida' | 'pendente' | 'opcional';

export const SITUACAO_ETAPA_LABEL: Record<SituacaoEtapa, string> = {
  concluida: 'Concluída',
  pendente: 'Pendente',
  opcional: 'Opcional'
};

export const SITUACAO_ETAPA_CLASSE: Record<SituacaoEtapa, string> = {
  concluida: 'badge--success',
  pendente: 'badge--warning',
  opcional: ''
};

/** O que já está gravado na API; é daí que sai a situação de cada etapa. */
export interface RegistrosAvaliacao {
  anamnese: boolean;
  avaliacao: boolean;
  plano: boolean;
  /** Fluxo de reavaliação: a reavaliação em andamento já foi gravada. */
  reavaliacao: boolean;
}

export function lerFluxo(valor: string | null): FluxoAvaliacao {
  return valor === 'reavaliacao' ? 'reavaliacao' : 'inicial';
}

/** Etapa do `?etapa=`; valor ausente ou que não é do fluxo vira `null` (a tela deriva a pendente). */
export function lerEtapa(valor: string | null, fluxo: FluxoAvaliacao): EtapaAvaliacao | null {
  return ETAPAS_FLUXO[fluxo].find(etapa => etapa.chave === valor)?.chave ?? null;
}

function definicao(fluxo: FluxoAvaliacao, etapa: EtapaAvaliacao): DefinicaoEtapa | undefined {
  return ETAPAS_FLUXO[fluxo].find(def => def.chave === etapa);
}

function gravada(etapa: EtapaAvaliacao, registros: RegistrosAvaliacao): boolean {
  switch (etapa) {
    case 'anamnese': return registros.anamnese;
    case 'avaliacao': return registros.avaliacao;
    case 'plano': return registros.plano;
    case 'reavaliacao': return registros.reavaliacao;
    // A análise postural tem telas próprias (issue #304) e não entra na derivação.
    default: return false;
  }
}

export function situacaoEtapa(
  fluxo: FluxoAvaliacao,
  etapa: EtapaAvaliacao,
  registros: RegistrosAvaliacao
): SituacaoEtapa {
  // No fluxo de reavaliação o plano é sempre do paciente, não da reavaliação:
  // tê-lo gravado não diz que ele foi revisto agora.
  if (fluxo === 'inicial' && gravada(etapa, registros)) return 'concluida';
  if (fluxo === 'reavaliacao' && etapa === 'reavaliacao' && registros.reavaliacao) return 'concluida';
  return definicao(fluxo, etapa)?.opcional ? 'opcional' : 'pendente';
}

/** Primeira etapa obrigatória ainda sem registro, na ordem do fluxo; `null` quando todas existem. */
export function etapaPendente(fluxo: FluxoAvaliacao, registros: RegistrosAvaliacao): EtapaAvaliacao | null {
  return ETAPAS_FLUXO[fluxo].find(def => situacaoEtapa(fluxo, def.chave, registros) === 'pendente')?.chave ?? null;
}

export function proximaEtapa(fluxo: FluxoAvaliacao, etapa: EtapaAvaliacao): EtapaAvaliacao | null {
  const etapas = ETAPAS_FLUXO[fluxo];
  const indice = etapas.findIndex(def => def.chave === etapa);
  return indice >= 0 ? etapas[indice + 1]?.chave ?? null : null;
}

export function etapaAnterior(fluxo: FluxoAvaliacao, etapa: EtapaAvaliacao): EtapaAvaliacao | null {
  const etapas = ETAPAS_FLUXO[fluxo];
  const indice = etapas.findIndex(def => def.chave === etapa);
  return indice > 0 ? etapas[indice - 1].chave : null;
}

/** Plano que a etapa edita: o de início mais recente (desempate pelo `id`), sem confiar na ordem da API. */
export function planoMaisRecente(planos: readonly PlanoTratamentoResponseDTO[]): PlanoTratamentoResponseDTO | null {
  let atual: PlanoTratamentoResponseDTO | null = null;
  for (const plano of planos) {
    if (!atual || plano.dataInicio > atual.dataInicio || (plano.dataInicio === atual.dataInicio && plano.id > atual.id)) {
      atual = plano;
    }
  }
  return atual;
}

export interface DestaqueAvaliacao {
  rotulo: string;
  valor: string;
}

export interface ItemLinhaDoTempo {
  tipo: 'avaliacao' | 'reavaliacao';
  id: number;
  /** `yyyy-MM-dd`. */
  data: string;
  titulo: string;
  destaques: DestaqueAvaliacao[];
}

function destaques(pares: [string, string | number | null | undefined][]): DestaqueAvaliacao[] {
  return pares
    .filter(([, valor]) => valor !== null && valor !== undefined && String(valor).trim() !== '')
    .map(([rotulo, valor]) => ({ rotulo, valor: String(valor) }));
}

/**
 * Avaliações fisioterapêuticas e reavaliações em ordem cronológica (a mais antiga
 * primeiro). A primeira avaliação é a **inicial**; no mesmo dia a avaliação vem
 * antes da reavaliação, e o `id` desempata registros do mesmo tipo.
 */
export function montarLinhaDoTempo(
  avaliacoes: readonly AvaliacaoFisioterapeuticaResponseDTO[],
  reavaliacoes: readonly ReavaliacaoResponseDTO[]
): ItemLinhaDoTempo[] {
  const ordemTipo = { avaliacao: 0, reavaliacao: 1 };
  const itens: ItemLinhaDoTempo[] = [
    ...avaliacoes.map(a => ({
      tipo: 'avaliacao' as const,
      id: a.id,
      data: a.dataAvaliacao,
      titulo: 'Avaliação fisioterapêutica',
      destaques: destaques([
        ['Queixa funcional', a.queixaFuncional],
        ['Escala de dor', a.escalaDor === null || a.escalaDor === undefined ? null : `${a.escalaDor}/10`],
        ['Diagnóstico fisioterapêutico', a.diagnosticoFisioterapeutico]
      ])
    })),
    ...reavaliacoes.map(r => ({
      tipo: 'reavaliacao' as const,
      id: r.id,
      data: r.dataReavaliacao,
      titulo: 'Reavaliação',
      destaques: destaques([
        ['Evolução da dor', r.evolucaoDor],
        ['Objetivos alcançados', r.objetivosAlcancados],
        ['Pontos de atenção', r.pontosAtencao],
        ['Ajustes recomendados', r.ajustesRecomendados]
      ])
    }))
  ];

  itens.sort((a, b) =>
    a.data.localeCompare(b.data) || ordemTipo[a.tipo] - ordemTipo[b.tipo] || a.id - b.id
  );

  const inicial = itens.find(item => item.tipo === 'avaliacao');
  if (inicial) inicial.titulo = 'Avaliação inicial';
  return itens;
}

/**
 * Ponto de partida da reavaliação: o registro anterior a ela na linha do tempo —
 * o último de todos, para uma reavaliação nova.
 */
export function avaliacaoDeReferencia(
  linha: readonly ItemLinhaDoTempo[],
  reavaliacaoId: number | null
): ItemLinhaDoTempo | null {
  const indice = reavaliacaoId === null
    ? -1
    : linha.findIndex(item => item.tipo === 'reavaliacao' && item.id === reavaliacaoId);
  const anteriores = indice >= 0 ? linha.slice(0, indice) : linha;
  return anteriores[anteriores.length - 1] ?? null;
}
