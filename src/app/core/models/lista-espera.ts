import { DiaSemana } from './plano';

/**
 * Lista de espera por horário (issue #137): quem quer entrar num dia da semana
 * e faixa de horário hoje lotados e aguarda a vaga que um cancelamento abrir.
 *
 * O `DiaSemana` é o mesmo `DayOfWeek` já usado pelos planos — a API fala o
 * enum do Java (`MONDAY`…`SUNDAY`) nos dois recursos, e um segundo tipo com os
 * mesmos sete valores só criaria duas fontes de verdade para o rótulo.
 */

export interface ListaEsperaResponseDTO {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  diaSemana: DiaSemana;
  /**
   * `HH:mm:ss` — a API devolve `LocalTime` com os segundos, mesmo quando o
   * `POST` mandou só `HH:mm`. Use `normalizarHora` de `shared/utils/hora` antes
   * de comparar ou exibir.
   */
  horaInicio: string;
  horaFim: string;
  /**
   * Instante da inscrição, gravado pelo **servidor**. É ele — e nada mais — que
   * define a ordem de chegada, e por isso não existe no corpo do `POST`.
   */
  dataEntrada: string;
  observacao: string | null;
}

/**
 * Corpo do `POST`. Sem `dataEntrada` de propósito: a posição na fila é do
 * servidor, e um cliente capaz de escolhê-la conseguiria furar a fila.
 */
export interface ListaEsperaRequestDTO {
  pacienteId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  observacao: string | null;
}

/** Filtros de `GET /lista-espera`; todos opcionais, mas a faixa só vale inteira. */
export interface ListaEsperaFiltro {
  diaSemana?: DiaSemana | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  pacienteId?: number | null;
}

/** Mesmo `@Size` do DTO da API. */
export const LISTA_ESPERA_OBSERVACAO_MAX = 500;
