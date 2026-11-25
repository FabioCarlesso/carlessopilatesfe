/**
 * Relatório de aulas realizadas sem evolução registrada (carlessopilatesapi#234):
 * aulas `realizada = true` cujo paciente não tem, na mesma data, sessão com
 * evolução clínica (`EvolucaoSessao`). Só `ADMIN`.
 */
export interface RelatorioAulasSemEvolucaoFiltros {
  profissionalId?: number | null;
}

/** Quantidade por profissional; `profissionalId` nulo é o grupo "Sem profissional". */
export interface AulasSemEvolucaoPorProfissional {
  profissionalId: number | null;
  profissionalNome: string;
  quantidade: number;
}

export interface AulaSemEvolucao {
  aulaId: number;
  data: string;
  /** `HH:mm:ss`; nulo quando a aula nasceu sem horário. */
  horario: string | null;
  pacienteId: number;
  pacienteNome: string;
  profissionalId: number | null;
  profissionalNome: string | null;
}

export interface RelatorioAulasSemEvolucaoDTO {
  periodo: { inicio: string; fim: string };
  filtros: { profissionalId: number | null; profissionalNome: string | null };
  resumo: {
    totalAulas: number;
    porProfissional: AulasSemEvolucaoPorProfissional[];
  };
  aulas: AulaSemEvolucao[];
  geradoEm: string;
}
