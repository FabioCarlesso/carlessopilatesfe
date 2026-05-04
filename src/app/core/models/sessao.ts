export type SessaoStatus = 'AGENDADA' | 'REALIZADA' | 'CANCELADA';
export type SessaoTipo = 'PILATES' | 'FISIOTERAPIA';

export interface SessaoRequestDTO {
  pacienteId: number;
  dataHora: string;
  tipo: SessaoTipo;
  duracao: number;
  profissionalId?: number | null;
  observacoes?: string | null;
}

export interface SessaoUpdateDTO {
  dataHora?: string | null;
  tipo?: SessaoTipo | null;
  duracao?: number | null;
  profissionalId?: number | null;
  observacoes?: string | null;
  status?: SessaoStatus | null;
}

export interface SessaoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataHora: string;
  tipo: SessaoTipo;
  duracao: number;
  profissionalId: number | null;
  nomeProfissional: string | null;
  status: SessaoStatus;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}

export const SESSAO_STATUS_LABEL: Record<SessaoStatus, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada'
};

export const SESSAO_TIPO_LABEL: Record<SessaoTipo, string> = {
  PILATES: 'Pilates',
  FISIOTERAPIA: 'Fisioterapia'
};
