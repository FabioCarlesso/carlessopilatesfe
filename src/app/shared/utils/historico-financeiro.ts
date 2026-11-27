import { NotaFiscalEmitidaResponseDTO } from '../../core/models/nfse-emitida';
import {
  PagamentoResponseDTO,
  PlanoResponseDTO,
  StatusPagamento
} from '../../core/models/plano';
import { hojeIso } from './calendario';

/**
 * Regras puras do financeiro do paciente (issues #118 e #302): situação de
 * cada pagamento, totais por situação, soma paga no ano, separação entre
 * vigentes e histórico, pacote atual e última NFSE. A tela só exibe o que sai
 * daqui.
 */

/**
 * Situação do pagamento **na data de hoje**, que pode diferir do `status`
 * gravado: o scheduler da API que marca `PENDENTE` vencido como `VENCIDO` só
 * roda às 06:00 e com a aplicação acordada. Um `PENDENTE` com vencimento já
 * passado é tratado como vencido — a mesma regra da inadimplência da API.
 * O que vence hoje ainda está no prazo.
 */
export function situacaoPagamento(
  pagamento: Pick<PagamentoResponseDTO, 'status' | 'dataVencimento'>,
  hoje: string = hojeIso()
): StatusPagamento {
  if (pagamento.status === 'PENDENTE' && pagamento.dataVencimento && pagamento.dataVencimento < hoje) {
    return 'VENCIDO';
  }
  return pagamento.status;
}

export interface TotalSituacao {
  quantidade: number;
  valor: number;
}

export interface ResumoPagamentos {
  porSituacao: Record<StatusPagamento, TotalSituacao>;
  /** Ano de referência da soma paga. */
  ano: number;
  /** Soma dos pagamentos `PAGO` cuja `dataPagamento` cai no ano de referência. */
  pagoNoAno: number;
}

/** Soma em centavos para `0.1 + 0.2` não virar `R$ 0,30000000000000004`. */
function somar(a: number, b: number): number {
  return Math.round((a + (Number.isFinite(b) ? b : 0)) * 100) / 100;
}

/**
 * Totais por situação (ver {@link situacaoPagamento}) e soma paga no ano de
 * `hoje`. A soma do ano usa a **data do pagamento**, e não o vencimento: é
 * dinheiro que entrou no ano. Pagamento `PAGO` sem `dataPagamento` fica fora
 * da soma do ano, mas conta no total pago.
 */
export function resumirPagamentos(
  pagamentos: readonly PagamentoResponseDTO[],
  hoje: string = hojeIso()
): ResumoPagamentos {
  const ano = Number(hoje.slice(0, 4));
  const porSituacao: Record<StatusPagamento, TotalSituacao> = {
    PAGO: { quantidade: 0, valor: 0 },
    PENDENTE: { quantidade: 0, valor: 0 },
    VENCIDO: { quantidade: 0, valor: 0 }
  };
  let pagoNoAno = 0;

  for (const pagamento of pagamentos) {
    const total = porSituacao[situacaoPagamento(pagamento, hoje)];
    total.quantidade += 1;
    total.valor = somar(total.valor, pagamento.valor);
    if (pagamento.status === 'PAGO' && pagamento.dataPagamento?.startsWith(`${ano}-`)) {
      pagoNoAno = somar(pagoNoAno, pagamento.valor);
    }
  }

  return { porSituacao, ano, pagoNoAno };
}

/** Do vencimento mais recente para o mais antigo; o `id` desempata. Não altera a entrada. */
export function ordenarPagamentosRecentesPrimeiro(
  pagamentos: readonly PagamentoResponseDTO[]
): PagamentoResponseDTO[] {
  return [...pagamentos].sort(
    (a, b) => b.dataVencimento.localeCompare(a.dataVencimento) || b.id - a.id
  );
}

/**
 * Planos que não são o ativo, do início mais recente para o mais antigo. O
 * ativo vem à parte, de `GET /planos/paciente/{id}/ativo`.
 */
export function historicoDePlanos(
  planos: readonly PlanoResponseDTO[],
  ativo: PlanoResponseDTO | null
): PlanoResponseDTO[] {
  return planos
    .filter(plano => plano.id !== ativo?.id)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio) || b.id - a.id);
}

/**
 * Pagamento que vai para o **histórico** (issue #302): já `PAGO` e com o
 * período encerrado antes de hoje. Pagamento em aberto (pendente ou vencido)
 * nunca vai para o histórico, por mais antigo que seja, porque ainda pede ação.
 */
export function pagamentoEncerrado(
  pagamento: Pick<PagamentoResponseDTO, 'status' | 'periodoFim'>,
  hoje: string = hojeIso()
): boolean {
  return pagamento.status === 'PAGO' && !!pagamento.periodoFim && pagamento.periodoFim < hoje;
}

export interface PagamentosSeparados {
  /** Em aberto, ou pagos com o período em curso ou futuro. */
  vigentes: PagamentoResponseDTO[];
  /** Pagos com o período já encerrado ({@link pagamentoEncerrado}). */
  anteriores: PagamentoResponseDTO[];
}

/**
 * Separa os pagamentos da tela de financeiro em vigentes e anteriores, os dois
 * do vencimento mais recente para o mais antigo. Não altera a entrada.
 */
export function separarPagamentos(
  pagamentos: readonly PagamentoResponseDTO[],
  hoje: string = hojeIso()
): PagamentosSeparados {
  const ordenados = ordenarPagamentosRecentesPrimeiro(pagamentos);
  return {
    vigentes: ordenados.filter(pagamento => !pagamentoEncerrado(pagamento, hoje)),
    anteriores: ordenados.filter(pagamento => pagamentoEncerrado(pagamento, hoje))
  };
}

/**
 * Onde o pacote escolhido por {@link pacoteAtual} está em relação a hoje:
 * cobre hoje, já terminou ou ainda vai começar.
 */
export type SituacaoPacote = 'EM_CURSO' | 'ENCERRADO' | 'FUTURO';

export interface PacoteAtual {
  pagamento: PagamentoResponseDTO;
  situacao: SituacaoPacote;
}

/** Início mais recente primeiro; o `id` desempata. */
function maisRecentePrimeiro(a: PagamentoResponseDTO, b: PagamentoResponseDTO): number {
  return b.periodoInicio.localeCompare(a.periodoInicio) || b.id - a.id;
}

/**
 * Pacote de aulas "atual" do paciente (issue #302). Cada pagamento cobre um
 * pacote, de `periodoInicio` até `periodoFim` — a data da última aula
 * (carlessopilatesapi#243). A escolha, nesta ordem:
 *
 * 1. o pagamento cujo período **cobre hoje** (`periodoInicio <= hoje <= periodoFim`);
 *    se houver mais de um, o de início mais recente;
 * 2. sem nenhum cobrindo hoje, o **mais recente já iniciado** — o último pacote,
 *    já encerrado (paciente sem renovação, por exemplo);
 * 3. sem nenhum iniciado, o **próximo a começar** (o primeiro pagamento do
 *    paciente, com início no futuro).
 *
 * Considera pagamentos de qualquer status e de qualquer plano: o pacote existe
 * mesmo com o pagamento em aberto, e as aulas só nascem quando ele é pago.
 */
export function pacoteAtual(
  pagamentos: readonly PagamentoResponseDTO[],
  hoje: string = hojeIso()
): PacoteAtual | null {
  const comPeriodo = pagamentos.filter(pagamento => !!pagamento.periodoInicio && !!pagamento.periodoFim);
  const emCurso = comPeriodo
    .filter(pagamento => pagamento.periodoInicio <= hoje && hoje <= pagamento.periodoFim)
    .sort(maisRecentePrimeiro);
  if (emCurso.length > 0) return { pagamento: emCurso[0], situacao: 'EM_CURSO' };

  const iniciados = comPeriodo.filter(pagamento => pagamento.periodoInicio <= hoje).sort(maisRecentePrimeiro);
  if (iniciados.length > 0) return { pagamento: iniciados[0], situacao: 'ENCERRADO' };

  const futuros = comPeriodo.sort((a, b) => a.periodoInicio.localeCompare(b.periodoInicio) || a.id - b.id);
  return futuros.length > 0 ? { pagamento: futuros[0], situacao: 'FUTURO' } : null;
}

export interface ContagemPacote {
  realizadas: number;
  total: number;
  /** Aulas do pacote ainda por realizar; nunca negativo. */
  restantes: number;
}

/**
 * "X de N aulas realizadas no pacote" com os números da API (`aulasRealizadas`
 * e `aulasPacote`, carlessopilatesapi#243). `null` quando a API anterior não
 * manda os campos ou o pacote vem sem tamanho: a tela não inventa a contagem.
 */
export function contagemDoPacote(
  pagamento: Pick<PagamentoResponseDTO, 'aulasPacote' | 'aulasRealizadas'>
): ContagemPacote | null {
  const { aulasPacote: total, aulasRealizadas: realizadas } = pagamento;
  if (typeof total !== 'number' || typeof realizadas !== 'number') return null;
  if (!Number.isFinite(total) || !Number.isFinite(realizadas) || total <= 0) return null;
  return { realizadas, total, restantes: Math.max(0, total - realizadas) };
}

/** Notas da emissão mais recente para a mais antiga; o `id` desempata. Não altera a entrada. */
export function ordenarNfsesRecentesPrimeiro(
  notas: readonly NotaFiscalEmitidaResponseDTO[]
): NotaFiscalEmitidaResponseDTO[] {
  return [...notas].sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao) || b.id - a.id);
}
