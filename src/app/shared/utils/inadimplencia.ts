import { Ordenacao, toSortParam } from '../../core/models/ordenacao';
import { PagamentoResponseDTO } from '../../core/models/plano';
import { hojeIso, paraData } from './calendario';

/**
 * Regras puras da tela de inadimplência (issue #127): dias em atraso,
 * ordenação, validação da faixa de vencimento e formatação.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Campo **virtual** da ordenação: dias em atraso não existem na API, que só
 * devolve `dataVencimento`. Como o atraso é `hoje - vencimento`, ordenar por ele
 * é ordenar pelo vencimento na direção oposta — e a ordenação continua sendo do
 * servidor, valendo para todas as páginas e não só para a que está na tela.
 */
export const CAMPO_DIAS_ATRASO = 'diasAtraso';

/**
 * Dias corridos entre o vencimento e hoje, para o que ainda está em aberto.
 * Pagamento `PAGO` e pagamento que ainda não venceu (inclusive o que vence
 * hoje) têm atraso `0`.
 *
 * A conta usa o calendário local e arredonda a diferença, para uma virada de
 * horário de verão no intervalo não transformar 3 dias em 2,96.
 */
export function diasEmAtraso(
  pagamento: Pick<PagamentoResponseDTO, 'status' | 'dataVencimento'>,
  hoje: string = hojeIso()
): number {
  if (pagamento.status === 'PAGO' || !pagamento.dataVencimento) return 0;
  const dias = Math.round((paraData(hoje).getTime() - paraData(pagamento.dataVencimento).getTime()) / MS_POR_DIA);
  return Math.max(0, dias);
}

/** "—" quando não há atraso; senão "1 dia" ou "N dias". */
export function descreverAtraso(dias: number): string {
  if (dias <= 0) return '—';
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

/**
 * Converte a ordenação da tela para o `sort` do `Pageable`, traduzindo o campo
 * virtual {@link CAMPO_DIAS_ATRASO} para `dataVencimento` na direção oposta:
 * mais dias em atraso primeiro (`desc`) é o vencimento mais antigo primeiro
 * (`asc`).
 */
export function sortDaInadimplencia(ordenacao: Ordenacao): string {
  if (ordenacao.campo !== CAMPO_DIAS_ATRASO) return toSortParam(ordenacao);
  return toSortParam({ campo: 'dataVencimento', direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc' });
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
