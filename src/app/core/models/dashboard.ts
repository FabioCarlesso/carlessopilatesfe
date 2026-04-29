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
  receitaMesAtual: number;
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
