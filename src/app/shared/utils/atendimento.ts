import { AulaResponseDTO } from '../../core/models/plano';

/**
 * Situação do atendimento de uma aula (issue #303), lida dos campos `sessaoId`
 * e `temEvolucao` que a API devolve em toda aula (carlessopilatesapi#246):
 *
 * - `SEM_ATENDIMENTO`: a aula ainda não foi realizada nem atendida;
 * - `SEM_EVOLUCAO`: a aula foi realizada (com ou sem sessão vinculada), mas o
 *   prontuário ainda não tem a evolução dela;
 * - `EVOLUIDA`: a sessão do atendimento já tem evolução.
 */
export type SituacaoAtendimento = 'SEM_ATENDIMENTO' | 'SEM_EVOLUCAO' | 'EVOLUIDA';

/** Texto curto da badge. */
export const SITUACAO_ATENDIMENTO_LABEL: Record<SituacaoAtendimento, string> = {
  SEM_ATENDIMENTO: 'Sem atendimento',
  SEM_EVOLUCAO: 'Sem evolução',
  EVOLUIDA: 'Evoluída'
};

/** Frase completa, para o nome acessível e o `title` da badge. */
export const SITUACAO_ATENDIMENTO_DESCRICAO: Record<SituacaoAtendimento, string> = {
  SEM_ATENDIMENTO: 'Atendimento ainda não registrado',
  SEM_EVOLUCAO: 'Aula realizada sem evolução registrada',
  EVOLUIDA: 'Atendimento com evolução registrada'
};

/** Variante global da badge: neutra, âmbar (pendência do prontuário) e verde. */
export const SITUACAO_ATENDIMENTO_CLASSE: Record<SituacaoAtendimento, string> = {
  SEM_ATENDIMENTO: 'badge badge-atendimento',
  SEM_EVOLUCAO: 'badge badge--warning badge-atendimento',
  EVOLUIDA: 'badge badge--success badge-atendimento'
};

type AulaDoAtendimento = Pick<AulaResponseDTO, 'realizada' | 'feriado' | 'sessaoId' | 'temEvolucao'>;

/**
 * `null` quando não há o que indicar: na aula de feriado, que não tem
 * atendimento, e com a API anterior à #246, que não envia nenhum dos dois
 * campos — ali "sem atendimento" seria afirmar o que a tela não sabe.
 */
export function situacaoAtendimento(aula: AulaDoAtendimento): SituacaoAtendimento | null {
  if (aula.feriado === true) return null;
  if (aula.sessaoId === undefined && aula.temEvolucao === undefined) return null;
  if (aula.temEvolucao === true) return 'EVOLUIDA';
  if (aula.realizada || (aula.sessaoId ?? null) !== null) return 'SEM_EVOLUCAO';
  return 'SEM_ATENDIMENTO';
}

/** A aula de feriado conta como realizada, mas ninguém compareceu: a API recusa o atendimento (`422`). */
export function aceitaAtendimento(aula: Pick<AulaResponseDTO, 'feriado'>): boolean {
  return aula.feriado !== true;
}

/** Rótulo da ação que leva à tela de atendimento, de acordo com o que falta registrar. */
export function rotuloAcaoAtendimento(aula: AulaDoAtendimento): string {
  return rotuloAcaoPorSituacao(situacaoAtendimento(aula));
}

/** O mesmo rótulo a partir da situação já calculada (a agenda a guarda no evento). */
export function rotuloAcaoPorSituacao(situacao: SituacaoAtendimento | null | undefined): string {
  switch (situacao) {
    case 'SEM_ATENDIMENTO':
      return 'Atender';
    case 'SEM_EVOLUCAO':
      return 'Evoluir';
    case 'EVOLUIDA':
      return 'Ver atendimento';
    default:
      return 'Atender / Evoluir';
  }
}

/** Marca curta do chip da agenda, só para a aula já realizada; o texto completo vai no nome acessível. */
export const SITUACAO_ATENDIMENTO_MARCA: Partial<Record<SituacaoAtendimento, string>> = {
  SEM_EVOLUCAO: '!',
  EVOLUIDA: '✓'
};
