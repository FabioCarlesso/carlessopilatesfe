import { Page } from './paciente';

export type TipoContrato = 'CLT' | 'PJ' | 'AUTONOMO';

export interface ProfissionalResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
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
  tipoContrato: TipoContrato;
  percentualPagamentoAula: number;
  dataInicio: string;
}

export interface ProfissionalUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  tipoContrato?: TipoContrato;
  percentualPagamentoAula?: number;
  dataInicio?: string;
}

export type ProfissionalPage = Page<ProfissionalResponseDTO>;

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  AUTONOMO: 'Autônomo'
};
