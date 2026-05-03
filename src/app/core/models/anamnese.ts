export interface AnamneseRequestDTO {
  pacienteId: number;
  queixaPrincipal: string;
  historicoDoencas?: string;
  historicoCirurgias?: string;
  historicoLesoes?: string;
  medicamentosUso?: string;
  alergias?: string;
  nivelAtividadeFisica?: string;
  restricoesMedicas?: string;
  objetivos: string;
  observacoes?: string;
}

export interface AnamneseUpdateDTO {
  queixaPrincipal?: string;
  historicoDoencas?: string;
  historicoCirurgias?: string;
  historicoLesoes?: string;
  medicamentosUso?: string;
  alergias?: string;
  nivelAtividadeFisica?: string;
  restricoesMedicas?: string;
  objetivos?: string;
  observacoes?: string;
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
