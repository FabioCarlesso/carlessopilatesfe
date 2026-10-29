import { HttpErrorResponse } from '@angular/common/http';
import { DiaSemana } from '../../core/models/plano';
import { DisponibilidadeProfissionalResponseDTO } from '../../core/models/disponibilidade-profissional';
import { ehConflitoConcorrencia, extrairMensagemErro, MENSAGEM_CONFLITO_CONCORRENCIA } from './api-error';
import { minutosDoDia, normalizarHora } from './hora';

/**
 * Regras de exibição e validação da disponibilidade semanal dos profissionais
 * (issue #134). As regras de verdade são da API (carlessopilatesapi#216); estas
 * funções só antecipam na tela o que ela responderia, para o erro aparecer no
 * campo em vez de depois de uma ida ao servidor.
 */

/** Ordem da semana da grade: segunda a domingo, a mesma ordem do `DayOfWeek` em que a API devolve a listagem. */
export const DIAS_SEMANA_ORDEM: readonly DiaSemana[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

export interface DiaDaGrade {
  dia: DiaSemana;
  faixas: DisponibilidadeProfissionalResponseDTO[];
}

/** Faixa candidata a gravação, com horas em `HH:mm` ou `HH:mm:ss`. */
export interface FaixaCandidata {
  diaSemana: DiaSemana | '' | null;
  horaInicio: string | null;
  horaFim: string | null;
}

/**
 * Os sete dias da semana, sempre todos, cada um com as suas faixas em ordem de
 * início. Dia sem faixa vem com a lista vazia: a grade mostra "sem atendimento"
 * em vez de sumir com a coluna. A ordenação é refeita aqui, e não confiada à
 * API, porque a grade também recebe a faixa recém-gravada ao fim da lista.
 */
export function agruparPorDia(faixas: readonly DisponibilidadeProfissionalResponseDTO[]): DiaDaGrade[] {
  return DIAS_SEMANA_ORDEM.map(dia => ({
    dia,
    faixas: faixas
      .filter(faixa => faixa.diaSemana === dia)
      .sort((a, b) => (minutosDoDia(a.horaInicio) ?? 0) - (minutosDoDia(b.horaInicio) ?? 0))
  }));
}

/** `07:00–12:00`. */
export function descreverFaixa(faixa: { horaInicio: string; horaFim: string }): string {
  return `${normalizarHora(faixa.horaInicio) ?? faixa.horaInicio}–${normalizarHora(faixa.horaFim) ?? faixa.horaFim}`;
}

/**
 * Primeira faixa do mesmo dia que a candidata intersecta, ou `null`.
 *
 * Mesma interseção estrita da API (`inicio < fimNovo && fim > inicioNovo`): a
 * faixa é semiaberta, então 12:00–14:00 e 14:00–19:00 só encostam. Na edição,
 * `ignorarId` tira a própria faixa da conta, como o `PUT` faz no backend.
 */
export function faixaSobreposta(
  faixas: readonly DisponibilidadeProfissionalResponseDTO[],
  candidata: FaixaCandidata,
  ignorarId: number | null = null
): DisponibilidadeProfissionalResponseDTO | null {
  const inicio = minutosDoDia(candidata.horaInicio);
  const fim = minutosDoDia(candidata.horaFim);
  if (!candidata.diaSemana || inicio === null || fim === null || inicio >= fim) return null;

  return faixas.find(faixa => {
    if (faixa.id === ignorarId || faixa.diaSemana !== candidata.diaSemana) return false;
    const outroInicio = minutosDoDia(faixa.horaInicio);
    const outroFim = minutosDoDia(faixa.horaFim);
    return outroInicio !== null && outroFim !== null && outroInicio < fim && outroFim > inicio;
  }) ?? null;
}

const DATA_HORA_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;

/**
 * Data (`yyyy-MM-dd`) e horário (`HH:mm`) de um `datetime-local`, no formato que
 * `GET .../disponibilidades/verificar` espera, ou `null` se o valor ainda está
 * incompleto.
 */
export function partesDataHora(dataHora: string | null | undefined): { data: string; horario: string } | null {
  const match = typeof dataHora === 'string' ? DATA_HORA_LOCAL.exec(dataHora) : null;
  return match ? { data: match[1], horario: match[2] } : null;
}

/** Mensagem do `409 conflict` da API, que traz o dia em inglês (`MONDAY`) no `detail`. */
export const MENSAGEM_SOBREPOSICAO = 'Esta faixa se sobrepõe a outra já cadastrada no mesmo dia.';

/**
 * Mensagem amigável para as falhas de gravação e exclusão de uma faixa.
 *
 * O `409` tem dois sentidos na API e só o `type` os separa: `concurrent-modification`
 * (outra pessoa alterou a faixa) e `conflict` (sobreposição). O `422`
 * (`business-rule`) cobre faixa invertida e profissional inativo — a primeira o
 * formulário já barra, então o `detail` da API é repassado como veio.
 */
export function mensagemErroDisponibilidade(err: unknown, fallback: string): string {
  if (ehConflitoConcorrencia(err)) return MENSAGEM_CONFLITO_CONCORRENCIA;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return MENSAGEM_SOBREPOSICAO;
    if (err.status === 404) return 'Faixa ou profissional não encontrado. Recarregue a página.';
  }
  return extrairMensagemErro(err, fallback);
}
