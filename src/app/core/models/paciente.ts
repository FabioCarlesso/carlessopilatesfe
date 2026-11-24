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
  /** Opcional na API: pacientes importados do seufisio podem vir sem e-mail. */
  email: string | null;
  /** Opcional na API, como o e-mail. */
  cpf: string | null;
  telefone: string;
  dataNascimento: string;
  endereco: EnderecoDTO | null;
  ativo: boolean;
  /** Se o paciente deseja CPF/CNPJ na nota fiscal (carlessopilatesapi#229). */
  cpfNaNota: boolean;
  /** Tomador alternativo da nota (responsável ou empresa), só dígitos; nulo = o próprio paciente. */
  notaCpfCnpj: string | null;
  notaNome: string | null;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}

/** Campos da nota fiscal, comuns ao cadastro e à edição. */
export interface PacienteNotaFiscalDTO {
  cpfNaNota?: boolean;
  /** Só dígitos (11 ou 14). Na edição, `''` remove o tomador alternativo. */
  notaCpfCnpj?: string;
  /** Exige `notaCpfCnpj`. Na edição, `''` remove o nome. */
  notaNome?: string;
}

export interface PacienteRequestDTO extends PacienteNotaFiscalDTO {
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}

export interface PacienteUpdateDTO extends PacienteNotaFiscalDTO {
  nome?: string;
  email?: string;
  /** Aceito na edição para completar o CPF de quem não tem; CPF de outro paciente responde `409`. */
  cpf?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export type { PageMetadata, Page } from './common';
