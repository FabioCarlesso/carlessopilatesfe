export interface RelatorioNfseResponseDTO {
  nome: string;
  cpfCnpj: string;
  valorPago: number;
  competencia: string;
  descricaoServico: string;
  notaAnteriorEmitida: boolean;
  dataPagamento: string;
  observacoes: string | null;
}

export type RelatorioNfseFormatoExportacao = 'CSV' | 'XLSX';

/**
 * Relatório financeiro consolidado do estúdio (`GET /api/relatorios/financeiro`,
 * carlessopilatesapi#108). Os totais vêm prontos da API: a tela não soma nada.
 */
export interface RelatorioFinanceiroDTO {
  periodo: { inicio: string; fim: string };
  /** Pagamentos `PAGO` com `dataPagamento` no período (regime de caixa). */
  receita: RelatorioFinanceiroReceitaDTO;
  /** Soma dos relatórios de pagamento por profissional no mesmo período. */
  repasses: RelatorioFinanceiroRepassesDTO;
  /** Em aberto (`PENDENTE`/`VENCIDO`) com vencimento no período e já vencidos. Informativa. */
  inadimplencia: RelatorioFinanceiroInadimplenciaDTO;
  /** Receita menos repasses; pode ser negativo. */
  resultadoLiquido: number;
  geradoEm: string;
}

export interface RelatorioFinanceiroReceitaDTO {
  quantidadePagamentos: number;
  total: number;
}

export interface RelatorioFinanceiroRepassesDTO {
  totalAulas: number;
  total: number;
  profissionais: RelatorioFinanceiroRepasseProfissionalDTO[];
}

export interface RelatorioFinanceiroRepasseProfissionalDTO {
  profissionalId: number;
  nome: string;
  percentualPagamentoAula: number;
  totalAulas: number;
  quantidadePagamentos: number;
  totalPagamentosBruto: number;
  totalProfissional: number;
}

export interface RelatorioFinanceiroInadimplenciaDTO {
  quantidadePagamentos: number;
  total: number;
}

/** Vira o sufixo da rota de exportação: `/api/relatorios/financeiro/{pdf|xlsx}`. */
export type RelatorioFinanceiroFormatoExportacao = 'pdf' | 'xlsx';
