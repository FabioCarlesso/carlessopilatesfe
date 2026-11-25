import { CalendarioDia, CalendarioEvento } from './calendario';

/**
 * Montagem da agenda impressa (issue #291): a mesma coleção que a tela mostra,
 * reorganizada para papel. Na tela a semana é uma grade **dia × evento** (cada
 * célula empilha o dia inteiro); no papel ela vira **horário × dia**, que é o
 * "mapa de horários" que a recepção deixa na parede. Fica aqui, sem DOM, para
 * ter cobertura própria.
 */

/** Rótulo da linha das aulas e sessões sem horário definido. */
export const SEM_HORARIO = 'Sem horário';

export interface LinhaImpressao {
  /** `HH:mm`, ou {@link SEM_HORARIO}. */
  horario: string;
  /** Uma posição por dia da semana, na ordem das colunas; vazia no dia sem evento. */
  celulas: CalendarioEvento[][];
}

/**
 * Ordena por horário, com o "sem horário" por último — no papel ele não tem
 * lugar na sequência do dia —, e depois pelo nome do paciente, para que a
 * mesma faixa saia sempre na mesma ordem.
 */
export function compararParaImpressao(a: CalendarioEvento, b: CalendarioEvento): number {
  if (a.horario !== b.horario) {
    if (a.horario === null) return 1;
    if (b.horario === null) return -1;
    return a.horario < b.horario ? -1 : 1;
  }
  return (a.paciente ?? '').localeCompare(b.paciente ?? '', 'pt-BR');
}

/**
 * Grade da semana: uma linha por horário que tem ao menos um evento em algum
 * dia, uma coluna por dia. Horário sem nenhum evento na semana não vira linha,
 * para a folha não se encher de faixas vazias.
 */
export function montarLinhasDaSemana(dias: CalendarioDia[]): LinhaImpressao[] {
  const horarios = new Set<string>();
  for (const dia of dias) {
    for (const evento of dia.eventos) horarios.add(evento.horario ?? SEM_HORARIO);
  }

  const ordenados = [...horarios].sort((a, b) => {
    if (a === SEM_HORARIO) return 1;
    if (b === SEM_HORARIO) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  return ordenados.map(horario => ({
    horario,
    celulas: dias.map(dia =>
      dia.eventos
        .filter(evento => (evento.horario ?? SEM_HORARIO) === horario)
        .sort(compararParaImpressao)
    )
  }));
}

/** Lista do dia em ordem de horário, para a folha em retrato. */
export function ordenarEventosDoDia(dia: CalendarioDia): CalendarioEvento[] {
  return [...dia.eventos].sort(compararParaImpressao);
}

/** "25/11/2026 às 14:05", no relógio local de quem imprime. */
export function formatarGeradoEm(agora: Date = new Date()): string {
  const dois = (valor: number) => String(valor).padStart(2, '0');
  return `${dois(agora.getDate())}/${dois(agora.getMonth() + 1)}/${agora.getFullYear()} às ` +
    `${dois(agora.getHours())}:${dois(agora.getMinutes())}`;
}

/**
 * Regra `@page` da vista: a semana sai em A4 paisagem (sete colunas não cabem
 * em retrato) e o dia em A4 retrato. Vai num `<style>` injetado no `head`, e
 * não no SCSS do componente, porque `@page` não aceita seletor: a orientação
 * só pode mudar trocando a própria regra.
 */
export function regraDePagina(visao: 'semanal' | 'diaria'): string {
  const orientacao = visao === 'semanal' ? 'landscape' : 'portrait';
  return `@page { size: A4 ${orientacao}; margin: 10mm; }`;
}
