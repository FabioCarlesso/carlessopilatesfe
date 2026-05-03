export interface AnamneseRequestDTO {
  pacienteId: number;
  queixaPrincipal: string;
  historicoDoencas?: string | null;
  historicoCirurgias?: string | null;
  historicoLesoes?: string | null;
  medicamentosUso?: string | null;
  alergias?: string | null;
  nivelAtividadeFisica?: string | null;
  restricoesMedicas?: string | null;
  objetivos: string;
  observacoes?: string | null;
}

export interface AnamneseUpdateDTO {
  queixaPrincipal: string;
  objetivos: string;
  historicoDoencas?: string | null;
  historicoCirurgias?: string | null;
  historicoLesoes?: string | null;
  medicamentosUso?: string | null;
  alergias?: string | null;
  nivelAtividadeFisica?: string | null;
  restricoesMedicas?: string | null;
  observacoes?: string | null;
}

export interface AnamneseResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  queixaPrincipal: string;
  historicoDoencas: string | null;
  historicoCirurgias: string | null;
  historicoLesoes: string | null;
  medicamentosUso: string | null;
  alergias: string | null;
  nivelAtividadeFisica: string | null;
  restricoesMedicas: string | null;
  objetivos: string;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
