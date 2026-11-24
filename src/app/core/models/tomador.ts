import { Page } from './common';

/** Quem recebe a nota fiscal quando não é o próprio paciente (carlessopilatesapi#229). */
export interface TomadorResponseDTO {
  id: number;
  nome: string;
  /** Só dígitos: 11 (CPF) ou 14 (CNPJ). */
  cpfCnpj: string;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  /** Pacientes vinculados: um tomador atende vários. */
  quantidadePacientes: number;
  version: number;
}

export interface TomadorRequestDTO {
  nome: string;
  /** Com ou sem máscara; a API grava só os dígitos. */
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
}

/** Atualização parcial: ausente mantém; em e-mail, telefone e observações, `''` apaga. */
export interface TomadorUpdateDTO {
  nome?: string;
  cpfCnpj?: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
  version?: number | null;
}

export interface TomadorPacienteDTO {
  id: number;
  nome: string;
  ativo: boolean;
  cpfNaNota: boolean;
}

export interface TomadorFiltro {
  nome?: string;
  cpfCnpj?: string;
  ativo?: boolean;
}

export type TomadorPage = Page<TomadorResponseDTO>;
