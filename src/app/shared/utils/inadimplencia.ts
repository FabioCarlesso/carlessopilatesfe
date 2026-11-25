import { Ordenacao, toSortParam } from '../../core/models/ordenacao';
import { PagamentoFiltro } from '../../core/models/inadimplencia';
import { PagamentoResponseDTO, StatusPagamento } from '../../core/models/plano';
import { diasEntre, hojeIso, somarDias } from './calendario';

/**
 * Regras puras da tela de inadimplência (issue #127): dias em atraso,
 * ordenação, validação da faixa de vencimento e formatação.
 */

/**
 * Campo **virtual** da ordenação: dias em atraso não existem na API, que só
 * devolve `status` e `dataVencimento`. A ordenação continua sendo do servidor,
 * valendo para todas as páginas e não só para a que está na tela — ver
 * {@link sortDaInadimplencia}.
 */
export const CAMPO_DIAS_ATRASO = 'diasAtraso';

/**
 * Dias corridos entre o vencimento e hoje, para o que ainda está em aberto.
 * Pagamento `PAGO` e pagamento que ainda não venceu (inclusive o que vence
 * hoje) têm atraso `0`.
 */
export function diasEmAtraso(
  pagamento: Pick<PagamentoResponseDTO, 'status' | 'dataVencimento'>,
  hoje: string = hojeIso()
): number {
  if (pagamento.status === 'PAGO' || !pagamento.dataVencimento) return 0;
  return Math.max(0, diasEntre(pagamento.dataVencimento, hoje));
}

/** "—" quando não há atraso; senão "1 dia" ou "N dias". */
export function descreverAtraso(dias: number): string {
  if (dias <= 0) return '—';
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

/**
 * Converte a ordenação da tela para os parâmetros `sort` do `Pageable`.
 *
 * O campo virtual {@link CAMPO_DIAS_ATRASO} não pode virar só `dataVencimento`:
 * pagamento `PAGO` e pendente ainda no prazo têm atraso zero qualquer que seja o
 * vencimento, e um pago antigo apareceria antes de um vencido real. Por isso o
 * status vem primeiro e o vencimento desempata dentro dele:
 *
 * - mais atraso primeiro (`desc`): `status,desc` (VENCIDO → PENDENTE → PAGO) e
 *   `dataVencimento,asc` (o vencimento mais antigo é o maior atraso);
 * - menos atraso primeiro (`asc`): o inverso das duas chaves.
 *
 * Depende da ordem alfabética dos nomes do enum, que a API grava como texto.
 */
export function sortDaInadimplencia(ordenacao: Ordenacao): string[] {
  if (ordenacao.campo !== CAMPO_DIAS_ATRASO) return [toSortParam(ordenacao)];
  const maisAtrasoPrimeiro = ordenacao.direcao === 'desc';
  return [
    toSortParam({ campo: 'status', direcao: maisAtrasoPrimeiro ? 'desc' : 'asc' }),
    toSortParam({ campo: 'dataVencimento', direcao: maisAtrasoPrimeiro ? 'asc' : 'desc' })
  ];
}

/**
 * Recusa localmente a faixa que a API recusaria com `400`. Uma ponta só é
 * válida — "vencidos até 30/06" é uma consulta legítima.
 */
export function validarFaixaVencimento(de: string | null | undefined, ate: string | null | undefined): string | null {
  if (de && ate && de > ate) {
    return 'O vencimento inicial não pode ser posterior ao final.';
  }
  return null;
}

/**
 * `yyyy-MM-ddTHH:mm[:ss]` → "12/05/2026 às 14:03". Lê a string em vez de passar
 * por `Date`, porque o servidor grava hora local sem fuso e `new Date()` a
 * interpretaria conforme o navegador. Formato inesperado volta como veio.
 */
export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor);
  if (!match) return valor;
  const [, ano, mes, dia, hora, minuto] = match;
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
}

/** Atalhos de filtro da tela (issue #290). */
export type AtalhoInadimplencia = 'vencidas' | 'vencem7dias' | 'emAberto';

/** Janela, em dias a partir de hoje, do atalho "Vencem em 7 dias". */
export const DIAS_RENOVACAO_SEMANA = 7;

/** Status e faixa de vencimento de um atalho; o paciente filtrado é preservado pela tela. */
export type FiltroDoAtalho = Required<Pick<PagamentoFiltro, 'status'>> & Pick<PagamentoFiltro, 'vencimentoDe' | 'vencimentoAte'>;

/**
 * Converte o atalho em filtro, sempre a partir do dia **local** (`hoje`):
 *
 * - **Vencidas**: pendentes e vencidos com vencimento até ontem. Inclui o
 *   `PENDENTE` já vencido que o scheduler ainda não marcou como `VENCIDO` — a
 *   mesma regra dos dias em atraso da API.
 * - **Vencem em 7 dias**: `PENDENTE` com vencimento de hoje a hoje + 7, as
 *   renovações da semana.
 * - **Todas em aberto**: pendentes e vencidos, sem faixa (o padrão da tela).
 */
export function filtroDoAtalho(atalho: AtalhoInadimplencia, hoje: string = hojeIso()): FiltroDoAtalho {
  switch (atalho) {
    case 'vencidas':
      return { status: ['PENDENTE', 'VENCIDO'], vencimentoAte: somarDias(hoje, -1) };
    case 'vencem7dias':
      return { status: ['PENDENTE'], vencimentoDe: hoje, vencimentoAte: somarDias(hoje, DIAS_RENOVACAO_SEMANA) };
    case 'emAberto':
      return { status: ['PENDENTE', 'VENCIDO'] };
  }
}

/** Qual atalho, se algum, descreve o filtro aplicado (ignora o paciente). */
export function atalhoDoFiltro(filtro: PagamentoFiltro, hoje: string = hojeIso()): AtalhoInadimplencia | null {
  const atalhos: AtalhoInadimplencia[] = ['vencidas', 'vencem7dias', 'emAberto'];
  return atalhos.find(atalho => mesmoFiltro(filtroDoAtalho(atalho, hoje), filtro)) ?? null;
}

function mesmoFiltro(atalho: FiltroDoAtalho, filtro: PagamentoFiltro): boolean {
  const status: readonly StatusPagamento[] = filtro.status ?? [];
  return (
    status.length === atalho.status.length &&
    atalho.status.every(s => status.includes(s)) &&
    (filtro.vencimentoDe || undefined) === atalho.vencimentoDe &&
    (filtro.vencimentoAte || undefined) === atalho.vencimentoAte
  );
}
