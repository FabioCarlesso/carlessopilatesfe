import { DiaSemana } from './plano';

/**
 * Faixa semanal de atendimento de um profissional (issue #134, carlessopilatesapi#216).
 *
 * O `diaSemana` é o mesmo `DayOfWeek` dos planos e da lista de espera
 * (`MONDAY`…`SUNDAY`). A faixa é **semiaberta**, `[horaInicio, horaFim)`: numa
 * faixa 07:00–12:00 o horário 12:00 já está fora, e duas faixas que só encostam
 * (12:00–14:00 e 14:00–19:00) não se sobrepõem.
 */
export interface DisponibilidadeProfissionalResponseDTO {
  id: number;
  profissionalId: number;
  diaSemana: DiaSemana;
  /** `HH:mm:ss` — normalize com `normalizarHora` antes de exibir ou comparar. */
  horaInicio: string;
  horaFim: string;
  /** Versão do registro para o locking otimista: devolva-a no `PUT`. */
  version: number;
  dataCriacao: string;
  dataAtualizacao: string | null;
}

/** Corpo do `POST` e do `PUT` (substituição completa). `version` só é conferida no `PUT`. */
export interface DisponibilidadeProfissionalRequestDTO {
  diaSemana: DiaSemana;
  /** `HH:mm`. */
  horaInicio: string;
  horaFim: string;
  version?: number | null;
}

/** Resposta de `GET /profissionais/{id}/disponibilidades/verificar`. */
export interface VerificacaoDisponibilidadeDTO {
  /** `true` também quando o profissional não tem nenhuma faixa: sem configuração, não há aviso. */
  dentroDaDisponibilidade: boolean;
}
