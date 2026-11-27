import { AvaliacaoFisioterapeuticaResponseDTO } from '../../core/models/avaliacao-fisioterapeutica';
import { AvaliacaoPosturalResponseDTO, AvaliacaoPosturalVinculoDTO } from '../../core/models/avaliacao-postural';
import { ReavaliacaoResponseDTO } from '../../core/models/reavaliacao';

/**
 * Vínculo da análise postural (carlessopilatesapi#247): a análise pertence ao paciente
 * e pode estar ligada a uma avaliação fisioterapêutica, a uma reavaliação ou a nada
 * ("solta"). Nos seletores o vínculo vira uma chave string — `avaliacao:5`,
 * `reavaliacao:3` ou `''` para a solta —, porque o `<select>` trabalha com um valor só.
 */
export const CHAVE_SEM_VINCULO = '';

export const ROTULO_SEM_VINCULO = 'Solta';

export type TipoVinculoPostural = 'avaliacao' | 'reavaliacao';

export interface OpcaoVinculoPostural {
  chave: string;
  tipo: TipoVinculoPostural;
  id: number;
  data: string;
  label: string;
}

type ComVinculo = Pick<AvaliacaoPosturalResponseDTO, 'avaliacaoFisioterapeuticaId' | 'reavaliacaoId'>;

/** `yyyy-MM-dd` (ou data-hora ISO) → `dd/MM/yyyy`, sem passar por `Date` para não deslocar o dia pelo fuso. */
export function formatarDataVinculo(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

export function chaveDoVinculo(tipo: TipoVinculoPostural, id: number): string {
  return `${tipo}:${id}`;
}

export function chaveDaAnalise(analise: ComVinculo): string {
  if (analise.avaliacaoFisioterapeuticaId != null) {
    return chaveDoVinculo('avaliacao', analise.avaliacaoFisioterapeuticaId);
  }
  if (analise.reavaliacaoId != null) {
    return chaveDoVinculo('reavaliacao', analise.reavaliacaoId);
  }
  return CHAVE_SEM_VINCULO;
}

/** Corpo do `PATCH .../vinculo` (e os campos do `POST`) a partir da chave escolhida no seletor. */
export function vinculoDaChave(chave: string): AvaliacaoPosturalVinculoDTO {
  const [tipo, valor] = chave.split(':');
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { avaliacaoFisioterapeuticaId: null, reavaliacaoId: null };
  }
  return {
    avaliacaoFisioterapeuticaId: tipo === 'avaliacao' ? id : null,
    reavaliacaoId: tipo === 'reavaliacao' ? id : null
  };
}

/** Avaliações e reavaliações do paciente num seletor só, da data mais recente para a mais antiga. */
export function montarOpcoesVinculo(
  avaliacoes: readonly AvaliacaoFisioterapeuticaResponseDTO[],
  reavaliacoes: readonly ReavaliacaoResponseDTO[]
): OpcaoVinculoPostural[] {
  const opcoes: OpcaoVinculoPostural[] = [
    ...avaliacoes.map(a => ({
      chave: chaveDoVinculo('avaliacao', a.id),
      tipo: 'avaliacao' as const,
      id: a.id,
      data: a.dataAvaliacao,
      label: `Avaliação de ${formatarDataVinculo(a.dataAvaliacao)}`
    })),
    ...reavaliacoes.map(r => ({
      chave: chaveDoVinculo('reavaliacao', r.id),
      tipo: 'reavaliacao' as const,
      id: r.id,
      data: r.dataReavaliacao,
      label: `Reavaliação de ${formatarDataVinculo(r.dataReavaliacao)}`
    }))
  ];
  return opcoes.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
}

/**
 * Texto do vínculo na listagem. Se a avaliação/reavaliação não está entre as opções
 * carregadas (a consulta falhou, por exemplo), mostra só o tipo, sem a data.
 */
export function rotuloDoVinculo(analise: ComVinculo, opcoes: readonly OpcaoVinculoPostural[]): string {
  const chave = chaveDaAnalise(analise);
  if (chave === CHAVE_SEM_VINCULO) return ROTULO_SEM_VINCULO;
  const opcao = opcoes.find(o => o.chave === chave);
  if (opcao) return opcao.label;
  return analise.avaliacaoFisioterapeuticaId != null ? 'Avaliação fisioterapêutica' : 'Reavaliação';
}
