import { NotaFiscalEmitidaResponseDTO } from '../../core/models/nfse-emitida';
import {
  AulaResponseDTO,
  PagamentoResponseDTO,
  PlanoResponseDTO,
  StatusPagamento
} from '../../core/models/plano';
import { hojeIso } from './calendario';

/**
 * Regras puras do histórico financeiro consolidado do paciente (issue #118):
 * situação de cada pagamento, totais por situação, soma paga no ano, contagem
 * de aulas e última NFSE. A tela só exibe o que sai daqui.
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

export interface ContagemAulas {
  realizadas: number;
  pendentes: number;
  total: number;
}

/** Aulas realizadas × pendentes (não realizadas, passadas ou futuras). */
export function contarAulas(aulas: readonly Pick<AulaResponseDTO, 'realizada'>[]): ContagemAulas {
  const realizadas = aulas.filter(aula => aula.realizada).length;
  return { realizadas, pendentes: aulas.length - realizadas, total: aulas.length };
}

/**
 * NFSE de emissão mais recente; o `id` desempata notas do mesmo dia. Não
 * depende da ordem em que a API devolve a lista.
 */
export function ultimaNfseEmitida(
  notas: readonly NotaFiscalEmitidaResponseDTO[]
): NotaFiscalEmitidaResponseDTO | null {
  let ultima: NotaFiscalEmitidaResponseDTO | null = null;
  for (const nota of notas) {
    if (
      !ultima ||
      nota.dataEmissao > ultima.dataEmissao ||
      (nota.dataEmissao === ultima.dataEmissao && nota.id > ultima.id)
    ) {
      ultima = nota;
    }
  }
  return ultima;
}
