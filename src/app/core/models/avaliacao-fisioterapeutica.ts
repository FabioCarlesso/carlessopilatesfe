export interface AvaliacaoFisioterapeuticaRequestDTO {
  pacienteId: number;
  queixaPrincipal: string;
  objetivosTratamento: string;
  historicoClinico?: string | null;
  examePostural?: string | null;
  exameFisico?: string | null;
  testesEspeciais?: string | null;
  escalaDor?: number | null;
  localizacaoDor?: string | null;
  hipoteseDiagnostica?: string | null;
  condutaTerapeutica?: string | null;
  observacoes?: string | null;
}

export interface AvaliacaoFisioterapeuticaUpdateDTO {
  queixaPrincipal: string;
  objetivosTratamento: string;
  historicoClinico?: string | null;
  examePostural?: string | null;
  exameFisico?: string | null;
  testesEspeciais?: string | null;
  escalaDor?: number | null;
  localizacaoDor?: string | null;
  hipoteseDiagnostica?: string | null;
  condutaTerapeutica?: string | null;
  observacoes?: string | null;
}

export interface AvaliacaoFisioterapeuticaResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  queixaPrincipal: string;
  objetivosTratamento: string;
  historicoClinico: string | null;
  examePostural: string | null;
  exameFisico: string | null;
  testesEspeciais: string | null;
  escalaDor: number | null;
  localizacaoDor: string | null;
  hipoteseDiagnostica: string | null;
  condutaTerapeutica: string | null;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
