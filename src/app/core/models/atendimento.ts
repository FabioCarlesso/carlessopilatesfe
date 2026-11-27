import { EvolucaoSessaoResponseDTO } from './evolucao-sessao';
import { AulaResponseDTO } from './plano';
import { SessaoResponseDTO, SessaoTipo } from './sessao';

/**
 * Atendimento da aula (issue #303, carlessopilatesapi#246): para quem usa, aula
 * e sessão viram uma coisa só. A API cria (ou reaproveita) a sessão vinculada à
 * aula, marca a aula como realizada e registra a evolução numa chamada.
 */

/** A evolução do atendimento: os campos de `POST /evolucoes-sessao`, menos a sessão. */
export interface AtendimentoEvolucaoDTO {
  /** `yyyy-MM-ddTHH:mm` (LocalDateTime); ausente, vale o horário atual do estúdio. */
  dataHoraRegistro?: string | null;
  exerciciosRealizados?: string | null;
  equipamentosUtilizados?: string | null;
  cargasMolas?: string | null;
  dorAntes?: number | null;
  dorDepois?: number | null;
  respostaPaciente?: string | null;
  intercorrencias?: string | null;
  orientacoes?: string | null;
  observacoesFisioterapeuta?: string | null;
}

/** Corpo de `POST /aulas/{id}/atendimento`; todos os campos são opcionais. */
export interface AtendimentoRequestDTO {
  /**
   * Na aula ainda não realizada, sobrescreve o profissional da aula; na já
   * realizada, vale só para a sessão criada agora.
   */
  profissionalId?: number | null;
  /** Tipo da sessão criada; ausente, `PILATES`. Ignorado se a aula já tem sessão. */
  tipo?: SessaoTipo;
  evolucao?: AtendimentoEvolucaoDTO;
}

export interface AtendimentoResponseDTO {
  aula: AulaResponseDTO;
  sessao: SessaoResponseDTO;
  evolucao: EvolucaoSessaoResponseDTO | null;
}
