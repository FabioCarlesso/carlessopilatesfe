/**
 * Tipo do bloqueio (issue #299, carlessopilatesapi#244). Só o `FERIADO` de dia
 * inteiro tem efeito nas aulas: a API as marca como realizadas, com
 * `feriado = true`, gerando repasse e sem contar falta. `OUTRO` (manutenção,
 * evento) continua só informativo.
 */
export type TipoBloqueio = 'FERIADO' | 'OUTRO';

export const TIPO_BLOQUEIO_LABEL: Record<TipoBloqueio, string> = {
  FERIADO: 'Feriado',
  OUTRO: 'Outro'
};

/**
 * Bloqueio de agenda (issue #135): feriado, manutenção ou evento em que o
 * estúdio não funciona.
 *
 * O bloqueio do tipo `OUTRO` é **informativo**: a API não impede a geração de
 * aulas do pagamento nem o agendamento de sessões no período bloqueado — ele
 * avisa a agenda e o formulário de sessão, e a decisão continua com a recepção.
 * O `FERIADO` de dia inteiro marca as aulas do dia como realizadas (issue #299).
 */
export interface BloqueioAgendaResponseDTO {
  id: number;
  /** `yyyy-MM-dd`. */
  dataInicio: string;
  /** `yyyy-MM-dd`, **inclusiva**: feriado de um dia repete a mesma data nas duas pontas. */
  dataFim: string;
  /**
   * `HH:mm:ss` — a API sempre devolve os segundos, mesmo quando o `POST` mandou
   * só `HH:mm`. O formulário trabalha em `HH:mm`, então o horário nunca deve ser
   * comparado nem exibido como string crua: use `normalizarHora` de
   * `shared/utils/hora`.
   */
  horaInicio: string | null;
  horaFim: string | null;
  /** Derivado pela API: verdadeiro quando não há faixa de horário. */
  diaInteiro: boolean;
  motivo: string;
  /**
   * Opcional só para tolerar a API anterior à carlessopilatesapi#244 (e os
   * bloqueios antigos): ausente vale `OUTRO`.
   */
  tipo?: TipoBloqueio;
  dataCriacao: string;
  dataAtualizacao: string | null;
}

/**
 * Corpo do `POST`/`PUT`. As horas só valem juntas: as duas ausentes significam
 * dia inteiro, e mandar apenas uma volta `400`. O `PUT` é substituição
 * completa — omitir a faixa devolve o bloqueio para dia inteiro.
 */
export interface BloqueioAgendaRequestDTO {
  dataInicio: string;
  dataFim: string;
  horaInicio: string | null;
  horaFim: string | null;
  motivo: string;
  /** Opcional na API: ausente vale `OUTRO`. O formulário sempre envia. */
  tipo?: TipoBloqueio;
}

/** Mesmo `@Size` do DTO da API. */
export const BLOQUEIO_MOTIVO_MAX = 200;

/**
 * Teto do período de `GET /bloqueios`, maior que os 92 dias de `GET /aulas`
 * porque feriados são conferidos para o ano inteiro de uma vez.
 */
export const BLOQUEIO_PERIODO_MAX_DIAS = 366;
