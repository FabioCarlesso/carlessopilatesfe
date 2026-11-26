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
  /** Tomador da nota (responsável ou empresa, ver `/tomadores`); nulo = a nota sai no próprio paciente. */
  tomadorId: number | null;
  tomadorNome: string | null;
  /** Só dígitos (11 ou 14). */
  tomadorCpfCnpj: string | null;
  /**
   * Fisioterapeuta padrão (issue #300, carlessopilatesapi#245): usado pela API
   * nas aulas geradas pelos pagamentos. Opcionais para tolerar a API anterior;
   * ausente ou nulo = sem padrão.
   */
  profissionalPadraoId?: number | null;
  profissionalPadraoNome?: string | null;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}

/**
 * Preferência de nota fiscal, comum ao cadastro e à edição. O tomador não muda pela
 * edição: só por `PATCH /pacientes/{id}/tomador` (ver `PacienteService.vincularTomador`),
 * para que desmarcar "CPF na nota" não apague o vínculo.
 */
export interface PacienteNotaFiscalDTO {
  cpfNaNota?: boolean;
}

/**
 * Fisioterapeuta padrão no cadastro (issue #300); nulo ou ausente = sem padrão.
 * Na edição ele **não** vai no `PUT`, que é parcial (nulo mantém o atual): trocar
 * ou remover o padrão é só por `PATCH /pacientes/{id}/profissional-padrao` (ver
 * `PacienteService.definirProfissionalPadrao`), como o tomador. Profissional
 * inativo ou inexistente volta `400`/`404` com mensagem.
 */
export interface PacienteProfissionalPadraoDTO {
  profissionalPadraoId?: number | null;
}

export interface PacienteRequestDTO extends PacienteNotaFiscalDTO, PacienteProfissionalPadraoDTO {
  /** Tomador vinculado já no cadastro. */
  tomadorId?: number | null;
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
