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
}

export interface PageMetadata {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Page<T> {
  content: T[];
  page: PageMetadata;
}
