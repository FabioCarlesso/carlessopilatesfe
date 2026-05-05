export interface EvolucaoSessaoRequestDTO {
  sessaoId: number;
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
  exerciciosRealizados?: string | null;
  escalaDor?: number | null;
  observacoes?: string | null;
}

export interface EvolucaoSessaoUpdateDTO {
  subjetivo?: string | null;
  objetivo?: string | null;
  avaliacao?: string | null;
  plano?: string | null;
  exerciciosRealizados?: string | null;
  escalaDor?: number | null;
  observacoes?: string | null;
}

export interface EvolucaoSessaoResponseDTO {
  id: number;
  sessaoId: number;
  pacienteId: number;
  nomePaciente: string;
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
  exerciciosRealizados: string | null;
  escalaDor: number | null;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
