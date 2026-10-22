export type TipoPagamento = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
export type FrequenciaSemanal = 'UMA_VEZ' | 'DUAS_VEZES' | 'TRES_VEZES';
export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'VENCIDO';

export interface PlanoResponseDTO {
  id: number;
  pacienteId: number;
  tipo: TipoPagamento;
  valor: number;
  frequenciaSemanal: FrequenciaSemanal;
  dataInicio: string;
  diasSemana: DiaSemana[];
  ativo: boolean;
  /** `HH:mm:ss` das aulas em todos os `diasSemana`, ou `null` em plano sem horário. */
  horario: string | null;
}

export interface PlanoRequestDTO {
  pacienteId: number;
  tipo: TipoPagamento;
  valor: number;
  frequenciaSemanal: FrequenciaSemanal;
  dataInicio: string;
  diasSemana: DiaSemana[];
  /** Opcional: copiado para cada aula gerada pelo pagamento. */
  horario?: string | null;
}

export interface PagamentoResponseDTO {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  planoId: number;
  valor: number;
  status: StatusPagamento;
  dataPagamento: string | null;
  dataVencimento: string;
  periodoInicio: string;
  periodoFim: string;
}

export interface PagamentoRequestDTO {
  pacienteId: number;
  planoId: number;
  valor: number;
  dataVencimento: string;
  periodoInicio: string;
}

export interface AulaResponseDTO {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  pagamentoId: number;
  data: string;
  /** `HH:mm:ss`, ou `null` em aula sem horário (anterior à #106 da API ou de plano sem horário). */
  horario: string | null;
  realizada: boolean;
  profissionalId?: number | null;
  profissionalNome?: string | null;
}

export const DIAS_SEMANA_LABEL: Record<DiaSemana, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo'
};

export const TIPO_LABEL: Record<TipoPagamento, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual'
};

export const FREQUENCIA_LABEL: Record<FrequenciaSemanal, string> = {
  UMA_VEZ: '1x por semana',
  DUAS_VEZES: '2x por semana',
  TRES_VEZES: '3x por semana'
};

export const FREQUENCIA_DIAS: Record<FrequenciaSemanal, number> = {
  UMA_VEZ: 1,
  DUAS_VEZES: 2,
  TRES_VEZES: 3
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  VENCIDO: 'Vencido'
};
