import { StatusPagamento } from './plano';

/**
 * Gestão de inadimplência (issue #127).
 *
 * A listagem global de pagamentos (`GET /api/pagamentos`, só `ADMIN`) devolve o
 * mesmo `PagamentoResponseDTO` da tela por paciente, numa `Page` no formato
 * `VIA_DTO` do Spring — os mesmos `content` + `page.*` das demais listagens.
 */

/**
 * Filtros da listagem global. Todos opcionais e combináveis no servidor:
 * `status` vai **repetido** na query (`?status=PENDENTE&status=VENCIDO`), e a
 * faixa de vencimento é **inclusiva** nas duas pontas (`yyyy-MM-dd`) — a API
 * recusa com `400` uma faixa invertida.
 */
export interface PagamentoFiltro {
  status?: StatusPagamento[];
  vencimentoDe?: string;
  vencimentoAte?: string;
  pacienteId?: number;
}

/**
 * Contato de cobrança registrado para um pagamento. `GET
 * /api/pagamentos/{id}/cobrancas` devolve a lista já ordenada do mais recente
 * para o mais antigo, e a tela não reordena.
 */
export interface ContatoCobrancaDTO {
  id: number;
  pagamentoId: number;
  /** `yyyy-MM-dd`: quando o contato aconteceu, informado por quem registrou. */
  dataContato: string;
  observacao: string;
  /** Usuário autenticado que registrou o contato, gravado pelo servidor. */
  registradoPor: string;
  /** `yyyy-MM-ddTHH:mm:ss`, gravado pelo servidor. */
  registradoEm: string;
}

/**
 * Corpo do `POST /api/pagamentos/{id}/cobrancas`. A API recusa com `400` data
 * futura ou ausente e observação vazia ou acima de
 * {@link COBRANCA_OBSERVACAO_MAX}; com `422` o pagamento já `PAGO`.
 */
export interface ContatoCobrancaRequestDTO {
  dataContato: string;
  observacao: string;
}

/** Mesmo `@Size` do DTO da API. */
export const COBRANCA_OBSERVACAO_MAX = 500;

/** Todos os status, na ordem em que a tela os oferece como filtro. */
export const STATUS_PAGAMENTO_OPCOES: readonly StatusPagamento[] = ['PENDENTE', 'VENCIDO', 'PAGO'];

/** A tela abre no que ainda está em aberto: pendentes e vencidos. */
export const STATUS_INADIMPLENCIA_PADRAO: readonly StatusPagamento[] = ['PENDENTE', 'VENCIDO'];
