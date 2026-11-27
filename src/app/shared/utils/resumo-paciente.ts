import { AvaliacaoFisioterapeuticaResponseDTO } from '../../core/models/avaliacao-fisioterapeutica';
import { EvolucaoSessaoResponseDTO } from '../../core/models/evolucao-sessao';
import { AulaResponseDTO, PagamentoResponseDTO, PlanoResponseDTO } from '../../core/models/plano';
import { hojeIso, somarDias } from './calendario';
import { TotalSituacao, resumirPagamentos, situacaoPagamento } from './historico-financeiro';
import { SituacaoPlano, calcularSituacaoPlano } from './renovacao-plano';

/**
 * Regras puras das áreas do detalhe do paciente (issue #301): qual área abrir a
 * partir do `?aba=` e o resumo de cada uma. O componente só exibe o que sai daqui.
 */

export type AreaPaciente = 'clinico' | 'agenda' | 'financeiro';

/** Ordem das abas na tela; a primeira que o papel alcança é o padrão. */
export const AREAS_PACIENTE: readonly AreaPaciente[] = ['clinico', 'agenda', 'financeiro'];

export const AREA_PACIENTE_LABEL: Record<AreaPaciente, string> = {
  clinico: 'Clínico',
  agenda: 'Agenda',
  financeiro: 'Financeiro'
};

/**
 * Área a exibir para o valor de `?aba=`. Valor ausente, desconhecido ou de uma
 * área que o papel não alcança cai na primeira disponível; sem nenhuma, `null`.
 */
export function lerAreaPaciente(
  valor: string | null,
  disponiveis: readonly AreaPaciente[]
): AreaPaciente | null {
  const encontrada = disponiveis.find(area => area === valor);
  return encontrada ?? disponiveis[0] ?? null;
}

export interface ResumoClinico {
  /** `dataAvaliacao` (`yyyy-MM-dd`) da avaliação fisioterapêutica mais recente. */
  ultimaAvaliacao: string | null;
  /** `dataHoraRegistro` da evolução mais recente. */
  ultimaEvolucao: string | null;
}

/** Maior valor de uma lista de datas ISO, que comparam como texto. */
function maisRecente(datas: readonly (string | null | undefined)[]): string | null {
  let maior: string | null = null;
  for (const data of datas) {
    if (data && (!maior || data > maior)) maior = data;
  }
  return maior;
}

/**
 * Data da última avaliação e da última evolução. Não confia na ordem da API: a
 * listagem de evoluções não é paginada nem tem ordenação documentada.
 */
export function resumirClinico(
  avaliacoes: readonly Pick<AvaliacaoFisioterapeuticaResponseDTO, 'dataAvaliacao'>[],
  evolucoes: readonly Pick<EvolucaoSessaoResponseDTO, 'dataHoraRegistro'>[]
): ResumoClinico {
  return {
    ultimaAvaliacao: maisRecente(avaliacoes.map(a => a.dataAvaliacao)),
    ultimaEvolucao: maisRecente(evolucoes.map(e => e.dataHoraRegistro))
  };
}

/** Janela das "faltas recentes" do resumo da agenda, em dias corridos antes de hoje. */
export const DIAS_FALTAS_RECENTES = 30;

/**
 * Falta é a aula de data anterior a hoje que não foi realizada. A aula de
 * feriado (issue #299) não é falta: o estúdio não abriu — a API já a devolve
 * `realizada`, mas a regra não depende disso. A aula de hoje ainda pode
 * acontecer e não conta.
 */
export function ehFalta(aula: Pick<AulaResponseDTO, 'data' | 'realizada' | 'feriado'>, hoje: string = hojeIso()): boolean {
  return !aula.realizada && !aula.feriado && aula.data < hoje;
}

export interface ResumoAgenda {
  /** Primeira aula não realizada de hoje em diante, ou `null`. */
  proximaAula: AulaResponseDTO | null;
  /** Faltas dos últimos {@link DIAS_FALTAS_RECENTES} dias, da mais recente para a mais antiga. */
  faltasRecentes: AulaResponseDTO[];
}

/** `data` e depois `horario`; aula sem horário vem antes das do mesmo dia com horário. */
function compararAulas(a: AulaResponseDTO, b: AulaResponseDTO): number {
  const chaveA = `${a.data} ${a.horario ?? ''}`;
  const chaveB = `${b.data} ${b.horario ?? ''}`;
  return chaveA < chaveB ? -1 : chaveA > chaveB ? 1 : 0;
}

export function resumirAgenda(
  aulas: readonly AulaResponseDTO[],
  hoje: string = hojeIso(),
  dias: number = DIAS_FALTAS_RECENTES
): ResumoAgenda {
  const inicioJanela = somarDias(hoje, -dias);
  const futuras = aulas.filter(aula => !aula.realizada && !aula.feriado && aula.data >= hoje).sort(compararAulas);
  const faltasRecentes = aulas
    .filter(aula => ehFalta(aula, hoje) && aula.data >= inicioJanela)
    .sort((a, b) => compararAulas(b, a));
  return { proximaAula: futuras[0] ?? null, faltasRecentes };
}

export interface ResumoFinanceiro {
  plano: PlanoResponseDTO | null;
  /** Cobrança ainda no prazo de vencimento mais próximo, ou `null`. */
  proximoVencimento: PagamentoResponseDTO | null;
  /** Cobranças em aberto no prazo (ver `situacaoPagamento`). */
  pendentes: TotalSituacao;
  /** Cobranças vencidas, inclusive `PENDENTE` com vencimento passado. */
  vencidos: TotalSituacao;
  /** Situação do bloco de renovação (issue #133), sobre os pagamentos do plano ativo. */
  situacao: SituacaoPlano;
}

/**
 * Plano ativo, próximo vencimento e pendências. As pendências contam todos os
 * pagamentos do paciente, inclusive de planos anteriores: uma dívida antiga
 * continua sendo dívida.
 */
export function resumirFinanceiro(
  plano: PlanoResponseDTO | null,
  pagamentos: readonly PagamentoResponseDTO[],
  hoje: string = hojeIso()
): ResumoFinanceiro {
  const { porSituacao } = resumirPagamentos(pagamentos, hoje);
  let proximoVencimento: PagamentoResponseDTO | null = null;
  for (const pagamento of pagamentos) {
    if (situacaoPagamento(pagamento, hoje) !== 'PENDENTE') continue;
    if (!proximoVencimento || pagamento.dataVencimento < proximoVencimento.dataVencimento) {
      proximoVencimento = pagamento;
    }
  }
  return {
    plano,
    proximoVencimento,
    pendentes: porSituacao.PENDENTE,
    vencidos: porSituacao.VENCIDO,
    situacao: calcularSituacaoPlano(plano, pagamentos, hoje)
  };
}
