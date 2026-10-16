export interface PlanoTratamentoRequestDTO {
  pacienteId: number;
  dataInicio: string;
  dataFimPrevista?: string | null;
  objetivosTratamento: string;
  intervencoesPlanejadas?: string | null;
  numeroSessoesPrevistas?: number | null;
  frequenciaSessoes?: string | null;
  responsavelTratamento?: string | null;
  observacoes?: string | null;
}

export interface PlanoTratamentoUpdateDTO {
  dataInicio?: string | null;
  dataFimPrevista?: string | null;
  objetivosTratamento?: string | null;
  intervencoesPlanejadas?: string | null;
  numeroSessoesPrevistas?: number | null;
  frequenciaSessoes?: string | null;
  responsavelTratamento?: string | null;
  observacoes?: string | null;
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export interface PlanoTratamentoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataInicio: string;
  dataFimPrevista: string | null;
  objetivosTratamento: string;
  intervencoesPlanejadas: string | null;
  numeroSessoesPrevistas: number | null;
  frequenciaSessoes: string | null;
  responsavelTratamento: string | null;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}
