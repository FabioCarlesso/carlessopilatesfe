export interface DashboardPacientesResumoDTO {
  totalAtivos: number;
  totalInativos: number;
}

export interface DashboardProfissionaisResumoDTO {
  totalAtivos: number;
  totalInativos: number;
}

export interface DashboardPagamentosResumoDTO {
  totalPendentes: number;
  totalPagos: number;
  totalVencidos: number;
  /** `null` para quem não é `ADMIN` nem `FINANCEIRO`: a API não expõe o faturamento aos demais papéis. */
  receitaMesAtual: number | null;
}

export interface DashboardAulasResumoDTO {
  totalRealizadasMesAtual: number;
  totalAgendadasMesAtual: number;
}

export interface DashboardResumoDTO {
  pacientes: DashboardPacientesResumoDTO;
  profissionais: DashboardProfissionaisResumoDTO;
  pagamentos: DashboardPagamentosResumoDTO;
  aulas: DashboardAulasResumoDTO;
  geradoEm: string;
}

/**
 * Séries mensais de `GET /dashboard/indicadores` (só `ADMIN`). `mes` vem como
 * `AAAA-MM`; cada lista traz todos os meses da janela, do mais antigo ao
 * atual, com zero nos meses sem movimento.
 */
export interface DashboardReceitaMensalDTO {
  mes: string;
  receita: number;
}

/** `agendadas` são as aulas com `realizada = false`, o mesmo par do resumo. */
export interface DashboardAulasMensalDTO {
  mes: string;
  realizadas: number;
  agendadas: number;
}

/**
 * Só conta pacientes com data de cadastro/inativação, que a API passou a
 * registrar na V41: os anteriores a ela não entram em nenhum mês.
 */
export interface DashboardPacientesMensalDTO {
  mes: string;
  novos: number;
  inativados: number;
}

export interface DashboardIndicadoresDTO {
  meses: number;
  receita: DashboardReceitaMensalDTO[];
  aulas: DashboardAulasMensalDTO[];
  pacientes: DashboardPacientesMensalDTO[];
  geradoEm: string;
}

/** Item do ranking de `GET /dashboard/aulas-por-profissional` (só `ADMIN`). */
export interface AulasPorProfissionalDTO {
  profissionalId: number;
  nome: string;
  totalRealizadas: number;
}
