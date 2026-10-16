export interface EnderecoDTO {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface PacienteResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  endereco: EnderecoDTO | null;
  ativo: boolean;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}

export interface PacienteRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}

export interface PacienteUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export type { PageMetadata, Page } from './common';
