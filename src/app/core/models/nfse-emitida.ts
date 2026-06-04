export interface NotaFiscalEmitidaRequestDTO {
  pacienteId: number;
  competencia: string;
  dataEmissao: string;
  numeroNota?: string | null;
  valor?: number | null;
  observacoes?: string | null;
}

export interface NotaFiscalEmitidaResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  competencia: string;
  numeroNota: string | null;
  dataEmissao: string;
  valor: number | null;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
