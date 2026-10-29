import { ParamMap } from '@angular/router';
import { PagamentoResponseDTO, PlanoResponseDTO, TipoPagamento } from '../../core/models/plano';
import { diasEntre, hojeIso, paraData, somarDias, somarMeses } from './calendario';

/**
 * Renovação assistida de plano pela equipe (issue #133). Tudo aqui é função
 * pura: o detalhe do paciente decide o que mostrar a partir do plano ativo e
 * dos pagamentos dele, e o formulário de novo pagamento lê de volta o
 * pré-preenchimento que a ação "Renovar" monta.
 *
 * A API já gera a próxima cobrança sozinha (`CobrancaScheduler`, às 07:00,
 * quando faltam 7 dias ou menos), mas roda no modo Serverless da Railway: o job
 * só executa se a aplicação estiver acordada nesse horário, e uma execução
 * perdida não é refeita. Por isso a tela mostra tanto a cobrança que o job
 * gerou quanto a falta dela, e oferece o caminho manual.
 *
 * As datas circulam como `yyyy-MM-dd` e passam só pelos utilitários de
 * `calendario.ts`, nunca por `new Date(iso)`, que leria a data em UTC.
 */

/**
 * Antecedência, em dias, com que o detalhe do paciente passa a oferecer
 * "Renovar": faltando 15 dias ou menos para o fim do período pago (ou com ele
 * já terminado) e sem cobrança seguinte. É maior que os 7 dias do job da API de
 * propósito, para a equipe ter tempo de agir quando o job não roda.
 */
export const DIAS_AVISO_RENOVACAO = 15;

/**
 * Dias entre o início do período e o vencimento da cobrança. Espelha o default
 * de `app.cobranca.vencimento-dias` da API, que não é exposto em nenhuma rota.
 */
export const DIAS_VENCIMENTO_COBRANCA = 10;

/** Meses cobertos por cada tipo de plano, como o `TipoPagamento.getMeses()` da API. */
export const MESES_POR_TIPO: Record<TipoPagamento, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  ANUAL: 12
};

/** Query params que "Renovar" envia para `/pagamentos/novo/:pacienteId`. */
export interface PreenchimentoRenovacao {
  planoId: number;
  valor: number;
  periodoInicio: string;
  dataVencimento: string;
}

export type SituacaoPlano =
  | { tipo: 'SEM_PLANO' }
  | { tipo: 'SEM_PAGAMENTO'; plano: PlanoResponseDTO }
  | { tipo: 'EM_ABERTO'; plano: PlanoResponseDTO; ultimo: PagamentoResponseDTO }
  | { tipo: 'PAGO'; plano: PlanoResponseDTO; ultimo: PagamentoResponseDTO; diasRestantes: number }
  | {
      tipo: 'RENOVAR';
      plano: PlanoResponseDTO;
      ultimo: PagamentoResponseDTO;
      diasRestantes: number;
      renovacao: PreenchimentoRenovacao;
    };

/**
 * Pagamento de maior `periodoFim` do plano — a mesma regra do job da API
 * (`findTopByPlanoOrderByPeriodoFimDesc`). As datas ISO comparam como texto.
 * Em empate, fica o de maior `id`, o mais recente.
 */
export function ultimoPagamentoDoPlano(
  planoId: number,
  pagamentos: readonly PagamentoResponseDTO[]
): PagamentoResponseDTO | null {
  let ultimo: PagamentoResponseDTO | null = null;
  for (const pagamento of pagamentos) {
    if (pagamento.planoId !== planoId) continue;
    if (
      !ultimo ||
      pagamento.periodoFim > ultimo.periodoFim ||
      (pagamento.periodoFim === ultimo.periodoFim && pagamento.id > ultimo.id)
    ) {
      ultimo = pagamento;
    }
  }
  return ultimo;
}

/**
 * Próxima cobrança no mesmo esquema do job: começa no dia seguinte ao fim do
 * último período e vence {@link DIAS_VENCIMENTO_COBRANCA} dias depois. Manter o
 * mesmo `periodoInicio` do job é o que faz o `409` da API impedir cobrança
 * dupla quando os dois agem no mesmo período.
 */
export function montarRenovacao(
  plano: PlanoResponseDTO,
  ultimo: Pick<PagamentoResponseDTO, 'periodoFim'>
): PreenchimentoRenovacao {
  const periodoInicio = somarDias(ultimo.periodoFim, 1);
  return {
    planoId: plano.id,
    valor: plano.valor,
    periodoInicio,
    dataVencimento: somarDias(periodoInicio, DIAS_VENCIMENTO_COBRANCA)
  };
}

/**
 * Situação do plano ativo para o bloco "Plano e renovação" do detalhe do
 * paciente. `pagamentos` pode trazer pagamentos de planos anteriores: só os do
 * plano ativo contam.
 *
 * - sem plano ativo → `SEM_PLANO`;
 * - plano sem pagamentos → `SEM_PAGAMENTO`;
 * - último pagamento `PENDENTE` ou `VENCIDO` → `EM_ABERTO` (a próxima cobrança
 *   já existe, gerada pelo job ou pela equipe);
 * - último pagamento `PAGO` faltando mais de `limite` dias → `PAGO`;
 * - último pagamento `PAGO` faltando `limite` dias ou menos, ou com o período
 *   já terminado (dias negativos) → `RENOVAR`.
 */
export function calcularSituacaoPlano(
  plano: PlanoResponseDTO | null,
  pagamentos: readonly PagamentoResponseDTO[],
  hoje: string = hojeIso(),
  limite: number = DIAS_AVISO_RENOVACAO
): SituacaoPlano {
  if (!plano) return { tipo: 'SEM_PLANO' };

  const ultimo = ultimoPagamentoDoPlano(plano.id, pagamentos);
  if (!ultimo) return { tipo: 'SEM_PAGAMENTO', plano };
  if (ultimo.status !== 'PAGO') return { tipo: 'EM_ABERTO', plano, ultimo };

  const diasRestantes = diasEntre(hoje, ultimo.periodoFim);
  if (diasRestantes > limite) return { tipo: 'PAGO', plano, ultimo, diasRestantes };
  return { tipo: 'RENOVAR', plano, ultimo, diasRestantes, renovacao: montarRenovacao(plano, ultimo) };
}

/** "Plano vence em 5 dias", "Plano vence amanhã", "Plano vence hoje" ou "Período pago terminou há 3 dias". */
export function descreverPrazoRenovacao(diasRestantes: number): string {
  if (diasRestantes < 0) {
    const dias = -diasRestantes;
    return `Período pago terminou há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  if (diasRestantes === 0) return 'Plano vence hoje';
  if (diasRestantes === 1) return 'Plano vence amanhã';
  return `Plano vence em ${diasRestantes} dias`;
}

/**
 * Fim do período cobrado, como a API calcula no `POST /pagamentos`:
 * `periodoInicio + meses do tipo - 1 dia`. O `somarMeses` limita o dia ao fim
 * do mês, como o `plusMonths` do Java.
 */
export function calcularPeriodoFim(periodoInicio: string, tipo: TipoPagamento): string {
  return somarDias(somarMeses(periodoInicio, MESES_POR_TIPO[tipo]), -1);
}

/** Verdadeiro para `yyyy-MM-dd` que existe no calendário (recusa `2026-02-30`). */
export function ehDataIsoValida(valor: string | null | undefined): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = paraData(valor);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

/**
 * Lê o pré-preenchimento da renovação da query string do formulário de novo
 * pagamento. Cada parâmetro é validado sozinho: o inválido ou ausente fica
 * fora do resultado (o campo continua vazio, como sem query params), e um
 * `planoId` que não está entre os planos ativos do paciente também.
 */
export function lerPreenchimentoRenovacao(
  query: ParamMap | null | undefined,
  planosAtivos: readonly Pick<PlanoResponseDTO, 'id'>[]
): Partial<PreenchimentoRenovacao> {
  if (!query) return {};
  const resultado: Partial<PreenchimentoRenovacao> = {};

  const planoId = query.get('planoId');
  if (planoId && /^[1-9]\d*$/.test(planoId) && planosAtivos.some(p => p.id === Number(planoId))) {
    resultado.planoId = Number(planoId);
  }

  const valor = query.get('valor');
  if (valor && /^\d+(\.\d{1,2})?$/.test(valor) && Number(valor) > 0) {
    resultado.valor = Number(valor);
  }

  const periodoInicio = query.get('periodoInicio');
  if (ehDataIsoValida(periodoInicio)) resultado.periodoInicio = periodoInicio;

  const dataVencimento = query.get('dataVencimento');
  if (ehDataIsoValida(dataVencimento)) resultado.dataVencimento = dataVencimento;

  return resultado;
}
