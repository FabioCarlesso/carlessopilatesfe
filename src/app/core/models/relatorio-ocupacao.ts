/**
 * Ocupação da grade semanal (carlessopilatesapi#235): por dia, horário e
 * profissional, alunos e vagas das aulas da semana, com a contagem da lista de
 * espera. A API normaliza `semana` para segunda a domingo.
 */
export type DiaSemanaApi =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface RelatorioOcupacaoFiltros {
  /** Qualquer data (`yyyy-MM-dd`) da semana desejada. */
  semana?: string | null;
  profissionalId?: number | null;
}

export interface OcupacaoProfissional {
  id: number;
  nome: string;
}

export interface OcupacaoAluno {
  id: number;
  nome: string;
}

/**
 * Uma célula é dia + horário + profissional. `capacidade`, `vagas` e
 * `dentroDaDisponibilidade` vêm `null` quando a célula não conta vaga (aula sem
 * profissional ou sem horário).
 */
export interface OcupacaoCelula {
  data: string;
  diaSemana: DiaSemanaApi;
  /** `HH:mm:ss`, ou `null` para aula sem horário. */
  horario: string | null;
  profissional: OcupacaoProfissional | null;
  ocupacao: number;
  capacidade: number | null;
  vagas: number | null;
  lotado: boolean;
  dentroDaDisponibilidade: boolean | null;
  listaEspera: number;
  alunos: OcupacaoAluno[];
}

export interface RelatorioOcupacaoTotais {
  /** Todas as aulas da semana. */
  aulas: number;
  /** Aulas com profissional (soma das ocupações). */
  ocupacao: number;
  semProfissional: number;
  /** Capacidade e vagas somam só as células que contam vaga e estão na disponibilidade. */
  capacidade: number;
  vagas: number;
}

export interface RelatorioOcupacaoDTO {
  semana: { inicio: string; fim: string };
  capacidadePorHorario: number;
  filtros: { profissionalId: number | null; profissionalNome: string | null };
  totais: RelatorioOcupacaoTotais;
  /** Ordenadas por data, horário (sem horário por último) e profissional (sem profissional por último). */
  celulas: OcupacaoCelula[];
  geradoEm: string;
}
