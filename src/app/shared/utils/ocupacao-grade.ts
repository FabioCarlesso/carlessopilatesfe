import { OcupacaoCelula } from '../../core/models/relatorio-ocupacao';
import { DIAS_SEMANA_ABREVIADO, paraData, somarDias } from './calendario';

/**
 * Faixa de cor de cada item da grade de ocupação (issue #294):
 * - `livre`: sobram mais vagas que a metade da capacidade (com 3, 1 aluno);
 * - `parcial`: ainda há vaga, mas no máximo metade (com 3, 2 alunos);
 * - `lotado`: sem vaga;
 * - `fora`: horário fora da disponibilidade do profissional, que não conta vaga;
 * - `sem-vaga`: aula sem profissional ou sem horário, que não conta vaga.
 */
export type FaixaOcupacao = 'livre' | 'parcial' | 'lotado' | 'fora' | 'sem-vaga';

export const FAIXA_OCUPACAO_LABEL: Record<FaixaOcupacao, string> = {
  livre: 'Livre',
  parcial: 'Parcial',
  lotado: 'Lotado',
  fora: 'Fora da disponibilidade',
  'sem-vaga': 'Sem contagem de vagas'
};

export function faixaOcupacao(celula: OcupacaoCelula): FaixaOcupacao {
  if (celula.capacidade === null || celula.vagas === null) return 'sem-vaga';
  if (celula.dentroDaDisponibilidade === false) return 'fora';
  if (celula.lotado || celula.vagas <= 0) return 'lotado';
  return celula.vagas * 2 > celula.capacidade ? 'livre' : 'parcial';
}

/** Horário lotado com gente esperando: é o caso que a tela destaca. */
export function lotadoComEspera(celula: OcupacaoCelula): boolean {
  return faixaOcupacao(celula) === 'lotado' && celula.listaEspera > 0;
}

export interface DiaGrade {
  /** `yyyy-MM-dd`. */
  data: string;
  /** "Seg 23/11". */
  rotulo: string;
}

export interface LinhaGrade {
  /** `HH:mm:ss`, ou `null` na linha "Sem horário". */
  horario: string | null;
  rotulo: string;
  /** Uma lista de itens (um por profissional) para cada dia, na ordem de `dias`. */
  itensPorDia: OcupacaoCelula[][];
}

export interface GradeOcupacao {
  dias: DiaGrade[];
  linhas: LinhaGrade[];
}

function doisDigitos(valor: number): string {
  return `${valor}`.padStart(2, '0');
}

/**
 * Monta a grade horário × dia (segunda a domingo, a partir de `inicioSemana`).
 * Só aparecem os horários que têm aula na semana; aulas sem horário vão para a
 * última linha, "Sem horário". Dentro de cada célula os itens mantêm a ordem
 * da API (profissional por nome, sem profissional por último).
 */
export function montarGradeOcupacao(inicioSemana: string, celulas: OcupacaoCelula[]): GradeOcupacao {
  const dias: DiaGrade[] = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(inicioSemana, i);
    const d = paraData(data);
    return {
      data,
      rotulo: `${DIAS_SEMANA_ABREVIADO[d.getDay()]} ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`
    };
  });

  const horarios = [...new Set(celulas.map(c => c.horario))].sort((a, b) => {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });

  const linhas = horarios.map(horario => ({
    horario,
    rotulo: horario === null ? 'Sem horário' : horario.slice(0, 5),
    itensPorDia: dias.map(dia => celulas.filter(c => c.horario === horario && c.data === dia.data))
  }));

  return { dias, linhas };
}
