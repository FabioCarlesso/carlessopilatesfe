import { Page } from './paciente';

export type TipoContrato = 'CLT' | 'PJ' | 'AUTONOMO';

export interface ProfissionalResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  /** Registro no conselho profissional (ex.: `350544-F`). Texto livre: o formato varia por conselho. */
  numeroRegistro: string | null;
  tipoContrato: TipoContrato;
  percentualPagamentoAula: number;
  dataInicio: string;
  ativo: boolean;
}

export interface ProfissionalRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  numeroRegistro?: string;
  tipoContrato: TipoContrato;
  percentualPagamentoAula: number;
  dataInicio: string;
}

export interface ProfissionalUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  numeroRegistro?: string;
  tipoContrato?: TipoContrato;
  percentualPagamentoAula?: number;
  dataInicio?: string;
}

export interface ProfissionalPagamentoAulaDTO {
  aulaId: number;
  data: string;
  pacienteId: number;
  pacienteNome: string;
  pagamentoId: number;
  valorPagamento: number;
  quantidadeAulasPagamento: number;
  valorBaseAula: number;
  percentualPagamentoAula: number;
  valorProfissional: number;
}

export interface ProfissionalResumoDTO {
  id: number;
  nome: string;
  cpf: string;
  numeroRegistro: string | null;
  tipoContrato: TipoContrato;
  percentualPagamentoAula: number;
}

export interface ProfissionalPagamentoPeriodoDTO {
  inicio: string;
  fim: string;
}

export interface ProfissionalPagamentoResumoFinanceiroDTO {
  totalAulas: number;
  quantidadePagamentos: number;
  totalPagamentosBruto: number;
  totalProfissional: number;
}

export interface ProfissionalPagamentoResumoDTO {
  pagamentoId: number;
  valorPagamento: number;
  quantidadeAulasPagamento: number;
  quantidadeAulasNoPeriodo: number;
  valorBaseAula: number;
  totalProfissional: number;
}

export interface ProfissionalPagamentoRelatorioDTO {
  profissional: ProfissionalResumoDTO;
  periodo: ProfissionalPagamentoPeriodoDTO;
  resumo: ProfissionalPagamentoResumoFinanceiroDTO;
  pagamentos: ProfissionalPagamentoResumoDTO[];
  aulas: ProfissionalPagamentoAulaDTO[];
  geradoEm: string;
}

export type ProfissionalPage = Page<ProfissionalResponseDTO>;

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  AUTONOMO: 'Autônomo'
};
