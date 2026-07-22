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

// O PUT /api/sessoes/{id} só aplica data, horário, duração e observações.
// Tipo, profissional e status não são alterados por esse endpoint: tipo e
// profissional são definidos apenas na criação e o status muda pelas ações
// PATCH /realizar e PATCH /cancelar.
export interface SessaoUpdateDTO {
  dataHora?: string | null;
  duracao?: number | null;
  observacoes?: string | null;
}

export interface SessaoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataHora: string;
  tipo: SessaoTipo;
  duracao: number | null;
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
