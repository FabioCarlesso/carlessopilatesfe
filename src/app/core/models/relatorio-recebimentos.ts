import { FrequenciaSemanal } from './plano';

/**
 * Relatório de recebimentos do período (carlessopilatesapi#231): pagamentos
 * confirmados por **data de pagamento**, com totais por forma de pagamento.
 * `NAO_INFORMADA` agrupa os pagamentos sem forma registrada (os confirmados na
 * migração do seufisio).
 */
export type FormaRecebimento =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'TRANSFERENCIA'
  | 'NAO_INFORMADA';

/** Mesma ordem e rótulos que a API usa no resumo e nas exportações. */
export const FORMA_RECEBIMENTO_OPCOES: readonly FormaRecebimento[] = [
  'PIX',
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'TRANSFERENCIA',
  'NAO_INFORMADA'
];

export const FORMA_RECEBIMENTO_LABEL: Record<FormaRecebimento, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  TRANSFERENCIA: 'Transferência',
  NAO_INFORMADA: 'Não informada'
};

export interface RelatorioRecebimentosFiltros {
  formaPagamento?: FormaRecebimento | null;
  pacienteId?: number | null;
}

export interface RelatorioRecebimentosTotalFormaDTO {
  formaPagamento: FormaRecebimento;
  descricao: string;
  quantidade: number;
  total: number;
}

export interface RelatorioRecebimentoDTO {
  pagamentoId: number;
  pacienteId: number;
  pacienteNome: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: FormaRecebimento;
  dataVencimento: string;
  periodoInicio: string;
  periodoFim: string;
  planoId: number;
  frequenciaSemanal: FrequenciaSemanal;
}

export interface RelatorioRecebimentosDTO {
  periodo: { inicio: string; fim: string };
  filtros: { formaPagamento: FormaRecebimento | null; pacienteId: number | null };
  resumo: {
    quantidadePagamentos: number;
    total: number;
    /** Sempre as seis formas, na ordem de `FORMA_RECEBIMENTO_OPCOES`, mesmo zeradas. */
    porFormaPagamento: RelatorioRecebimentosTotalFormaDTO[];
  };
  recebimentos: RelatorioRecebimentoDTO[];
  geradoEm: string;
}

/** Vira o sufixo da rota de exportação: `/api/relatorios/recebimentos/{pdf|xlsx}`. */
export type RelatorioRecebimentosFormatoExportacao = 'pdf' | 'xlsx';
