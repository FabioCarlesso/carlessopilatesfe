import { DiaSemana, FrequenciaSemanal, TipoPagamento } from './plano';

/** Contrato de `GET /api/relatorios/pacientes` (carlessopilatesapi#230). */
export type SituacaoPacienteRelatorio = 'ATIVOS' | 'INATIVOS' | 'TODOS';

export type PendenciaCadastroPaciente =
  | 'SEM_CPF'
  | 'SEM_EMAIL'
  | 'SEM_TELEFONE'
  | 'SEM_DATA_NASCIMENTO'
  | 'SEM_PLANO_ATIVO';

export type RelatorioPacientesFormatoExportacao = 'pdf' | 'xlsx';

export interface RelatorioPacientesFiltros {
  situacao?: SituacaoPacienteRelatorio;
  /** Só `true` filtra; `false` equivale a não enviar. */
  semPlanoAtivo?: boolean;
  /** Só `true` filtra; `false` equivale a não enviar. */
  cadastroIncompleto?: boolean;
  /** 1 a 12. */
  mesNascimento?: number | null;
  profissionalId?: number | null;
}

export interface RelatorioPacientesPlanoAtivo {
  id: number;
  tipo: TipoPagamento;
  frequenciaSemanal: FrequenciaSemanal;
  /** De segunda a domingo. */
  diasSemana: DiaSemana[];
  /** `HH:mm:ss`, ou nulo quando o plano não tem horário fixo. */
  horario: string | null;
  valor: number;
}

export interface RelatorioPacientesLinha {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  idade: number | null;
  ativo: boolean;
  dataCadastro: string | null;
  dataInativacao: string | null;
  planoAtivo: RelatorioPacientesPlanoAtivo | null;
  /** Profissional da próxima aula não realizada do paciente. */
  profissional: { id: number; nome: string } | null;
  /** Fisioterapeuta padrão do paciente (carlessopilatesapi#245). Ausente com a API anterior. */
  profissionalPadrao?: { id: number; nome: string } | null;
  pendencias: PendenciaCadastroPaciente[];
}

export interface RelatorioPacientesDTO {
  filtros: {
    situacao: SituacaoPacienteRelatorio;
    semPlanoAtivo: boolean;
    cadastroIncompleto: boolean;
    mesNascimento: number | null;
    profissionalId: number | null;
    profissionalNome: string | null;
  };
  /** Contam as linhas devolvidas, já filtradas. */
  totais: { total: number; ativos: number; inativos: number; comPendencia: number };
  pacientes: RelatorioPacientesLinha[];
  geradoEm: string;
}

export const SITUACAO_PACIENTE_RELATORIO_LABEL: Record<SituacaoPacienteRelatorio, string> = {
  ATIVOS: 'Ativos',
  INATIVOS: 'Inativos',
  TODOS: 'Todos'
};

export const PENDENCIA_CADASTRO_LABEL: Record<PendenciaCadastroPaciente, string> = {
  SEM_CPF: 'Sem CPF',
  SEM_EMAIL: 'Sem e-mail',
  SEM_TELEFONE: 'Sem telefone',
  SEM_DATA_NASCIMENTO: 'Sem data de nascimento',
  SEM_PLANO_ATIVO: 'Sem plano ativo'
};

export const MESES_LABEL: readonly string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
