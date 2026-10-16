export type PlanoTratamentoStatus = 'ATIVO' | 'ENCERRADO' | 'SUSPENSO';

export interface PlanoTratamentoRequestDTO {
  pacienteId: number;
  dataInicio: string;
  dataPrevisaoTermino?: string | null;
  objetivosTerapeuticos: string;
  frequenciaSemanal: number;
  condutasPropostas: string;
  exerciciosIndicados: string;
  exerciciosContraindicados?: string | null;
  equipamentosPrevistos?: string | null;
  observacoesClinicas?: string | null;
}

export interface PlanoTratamentoUpdateDTO {
  dataInicio?: string | null;
  dataPrevisaoTermino?: string | null;
  objetivosTerapeuticos?: string | null;
  frequenciaSemanal?: number | null;
  condutasPropostas?: string | null;
  exerciciosIndicados?: string | null;
  exerciciosContraindicados?: string | null;
  equipamentosPrevistos?: string | null;
  observacoesClinicas?: string | null;
  status?: PlanoTratamentoStatus | null;
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export interface PlanoTratamentoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataInicio: string;
  dataPrevisaoTermino: string | null;
  objetivosTerapeuticos: string;
  frequenciaSemanal: number;
  condutasPropostas: string;
  exerciciosIndicados: string;
  exerciciosContraindicados: string | null;
  equipamentosPrevistos: string | null;
  observacoesClinicas: string | null;
  status: PlanoTratamentoStatus;
  dataCriacao: string;
  dataAtualizacao: string | null;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}

export const PLANO_TRATAMENTO_STATUS_LABEL: Record<PlanoTratamentoStatus, string> = {
  ATIVO: 'Ativo',
  ENCERRADO: 'Encerrado',
  SUSPENSO: 'Suspenso'
};
