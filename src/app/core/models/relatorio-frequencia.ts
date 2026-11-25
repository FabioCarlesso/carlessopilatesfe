/**
 * Relatório de frequência e faltas por paciente (carlessopilatesapi#233). Só
 * contam aulas com data **anterior a hoje** no fuso do estúdio: `consideradoAte`
 * é o menor entre `fim` e ontem. Falta é a aula passada não realizada.
 */
export interface RelatorioFrequenciaFiltros {
  profissionalId?: number | null;
  pacienteId?: number | null;
  /** Percentual de 0 a 100: traz só quem tem presença **abaixo** do valor (estrito). */
  taxaMaxima?: number | null;
}

export interface RelatorioFrequenciaTotais {
  pacientes: number;
  aulasPrevistas: number;
  aulasRealizadas: number;
  faltas: number;
  /** `null` quando nenhuma aula foi considerada no período. */
  taxaPresenca: number | null;
}

export interface RelatorioFrequenciaPaciente {
  pacienteId: number;
  pacienteNome: string;
  ativo: boolean;
  aulasPrevistas: number;
  aulasRealizadas: number;
  faltas: number;
  /** Percentual de 0 a 100, com 1 casa decimal (HALF_UP), igual ao do XLSX. */
  taxaPresenca: number;
  ultimaAulaRealizada: string | null;
}

export interface RelatorioFrequenciaDTO {
  periodo: { inicio: string; fim: string };
  consideradoAte: string;
  filtros: {
    profissionalId: number | null;
    profissionalNome: string | null;
    pacienteId: number | null;
    taxaMaxima: number | null;
  };
  totais: RelatorioFrequenciaTotais;
  /** Já ordenados pela API: menor presença primeiro. */
  pacientes: RelatorioFrequenciaPaciente[];
  geradoEm: string;
}
