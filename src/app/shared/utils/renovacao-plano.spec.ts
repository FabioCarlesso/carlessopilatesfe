import { convertToParamMap } from '@angular/router';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../core/models/plano';
import {
  DIAS_AVISO_RENOVACAO,
  calcularPeriodoFim,
  calcularSituacaoPlano,
  descreverPrazoRenovacao,
  ehDataIsoValida,
  lerPreenchimentoRenovacao,
  montarRenovacao,
  ultimoPagamentoDoPlano
} from './renovacao-plano';

const plano: PlanoResponseDTO = {
  id: 7,
  pacienteId: 1,
  tipo: 'MENSAL',
  valor: 250,
  frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-08-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'],
  ativo: true,
  horario: null
};

function pagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1,
    pacienteId: 1,
    pacienteNome: 'Ana',
    planoId: 7,
    valor: 250,
    status: 'PAGO',
    dataPagamento: '2026-10-05',
    dataVencimento: '2026-10-11',
    periodoInicio: '2026-10-01',
    periodoFim: '2026-10-31',
    ...parcial
  };
}

describe('renovacao-plano utils', () => {
  describe('ultimoPagamentoDoPlano', () => {
    it('should pick the payment with the latest periodoFim of the given plan only', () => {
      const antigo = pagamento({ id: 1, periodoFim: '2026-09-30' });
      const recente = pagamento({ id: 2, periodoFim: '2026-10-31' });
      const outroPlano = pagamento({ id: 3, planoId: 99, periodoFim: '2027-01-31' });
      expect(ultimoPagamentoDoPlano(7, [recente, outroPlano, antigo])).toBe(recente);
    });

    it('should break ties by the highest id', () => {
      const a = pagamento({ id: 4 });
      const b = pagamento({ id: 9 });
      expect(ultimoPagamentoDoPlano(7, [b, a])).toBe(b);
    });

    it('should return null without payments of the plan', () => {
      expect(ultimoPagamentoDoPlano(7, [pagamento({ planoId: 99 })])).toBeNull();
    });
  });

  describe('calcularSituacaoPlano', () => {
    const hoje = '2026-10-10';

    it('should report SEM_PLANO without an active plan', () => {
      expect(calcularSituacaoPlano(null, [pagamento({})], hoje)).toEqual({ tipo: 'SEM_PLANO' });
    });

    it('should report SEM_PAGAMENTO when the active plan has no payments', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ planoId: 99 })], hoje);
      expect(situacao).toEqual({ tipo: 'SEM_PAGAMENTO', plano });
    });

    it('should report EM_ABERTO when the last payment is PENDENTE or VENCIDO', () => {
      const pago = pagamento({ id: 1, periodoFim: '2026-10-31' });
      const pendente = pagamento({ id: 2, status: 'PENDENTE', periodoInicio: '2026-11-01', periodoFim: '2026-11-30' });
      expect(calcularSituacaoPlano(plano, [pago, pendente], hoje).tipo).toBe('EM_ABERTO');

      const vencido = pagamento({ id: 3, status: 'VENCIDO' });
      const situacao = calcularSituacaoPlano(plano, [vencido], hoje);
      expect(situacao.tipo).toBe('EM_ABERTO');
      expect(situacao.tipo === 'EM_ABERTO' && situacao.ultimo).toBe(vencido);
    });

    it('should report PAGO when more than N days remain', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ periodoFim: '2026-10-26' })], hoje);
      expect(situacao.tipo).toBe('PAGO');
      expect(situacao.tipo === 'PAGO' && situacao.diasRestantes).toBe(DIAS_AVISO_RENOVACAO + 1);
    });

    it('should offer RENOVAR exactly at N days remaining', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ periodoFim: '2026-10-25' })], hoje);
      expect(situacao.tipo).toBe('RENOVAR');
      expect(situacao.tipo === 'RENOVAR' && situacao.diasRestantes).toBe(DIAS_AVISO_RENOVACAO);
    });

    it('should offer RENOVAR with negative days once the paid period has ended', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ periodoFim: '2026-10-07' })], hoje);
      expect(situacao.tipo).toBe('RENOVAR');
      expect(situacao.tipo === 'RENOVAR' && situacao.diasRestantes).toBe(-3);
    });

    it('should count days across a month turn without timezone shift', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ periodoFim: '2026-11-02' })], '2026-10-30');
      expect(situacao.tipo === 'RENOVAR' && situacao.diasRestantes).toBe(3);
      expect(situacao.tipo === 'RENOVAR' && situacao.renovacao).toEqual({
        planoId: 7,
        valor: 250,
        periodoInicio: '2026-11-03',
        dataVencimento: '2026-11-13'
      });
    });

    it('should accept a custom limit', () => {
      const situacao = calcularSituacaoPlano(plano, [pagamento({ periodoFim: '2026-10-20' })], hoje, 5);
      expect(situacao.tipo).toBe('PAGO');
    });
  });

  describe('montarRenovacao', () => {
    it('should start the day after the last period and fall due 10 days later, crossing the month', () => {
      expect(montarRenovacao(plano, { periodoFim: '2026-10-31' })).toEqual({
        planoId: 7,
        valor: 250,
        periodoInicio: '2026-11-01',
        dataVencimento: '2026-11-11'
      });
      expect(montarRenovacao(plano, { periodoFim: '2026-12-25' }).dataVencimento).toBe('2027-01-05');
    });
  });

  describe('descreverPrazoRenovacao', () => {
    it('should describe remaining and elapsed days', () => {
      expect(descreverPrazoRenovacao(5)).toBe('Plano vence em 5 dias');
      expect(descreverPrazoRenovacao(1)).toBe('Plano vence amanhã');
      expect(descreverPrazoRenovacao(0)).toBe('Plano vence hoje');
      expect(descreverPrazoRenovacao(-1)).toBe('Período pago terminou há 1 dia');
      expect(descreverPrazoRenovacao(-4)).toBe('Período pago terminou há 4 dias');
    });
  });

  describe('calcularPeriodoFim', () => {
    it('should mirror the API: start + months of the type - 1 day', () => {
      expect(calcularPeriodoFim('2026-11-01', 'MENSAL')).toBe('2026-11-30');
      expect(calcularPeriodoFim('2026-11-15', 'TRIMESTRAL')).toBe('2027-02-14');
      expect(calcularPeriodoFim('2026-01-31', 'MENSAL')).toBe('2026-02-27');
      expect(calcularPeriodoFim('2026-03-01', 'ANUAL')).toBe('2027-02-28');
    });
  });

  describe('ehDataIsoValida', () => {
    it('should accept only existing yyyy-MM-dd dates', () => {
      expect(ehDataIsoValida('2026-02-28')).toBeTrue();
      expect(ehDataIsoValida('2026-02-30')).toBeFalse();
      expect(ehDataIsoValida('2026-2-3')).toBeFalse();
      expect(ehDataIsoValida('')).toBeFalse();
      expect(ehDataIsoValida(null)).toBeFalse();
    });
  });

  describe('lerPreenchimentoRenovacao', () => {
    const planos = [{ id: 7 }];

    it('should read every valid parameter', () => {
      const query = convertToParamMap({
        planoId: '7',
        valor: '250.5',
        periodoInicio: '2026-11-01',
        dataVencimento: '2026-11-11'
      });
      expect(lerPreenchimentoRenovacao(query, planos)).toEqual({
        planoId: 7,
        valor: 250.5,
        periodoInicio: '2026-11-01',
        dataVencimento: '2026-11-11'
      });
    });

    it('should ignore invalid parameters and a plan outside the active list', () => {
      const query = convertToParamMap({
        planoId: '99',
        valor: '-3',
        periodoInicio: '2026-13-01',
        dataVencimento: 'amanhã'
      });
      expect(lerPreenchimentoRenovacao(query, planos)).toEqual({});
      expect(lerPreenchimentoRenovacao(convertToParamMap({ valor: '0', planoId: 'abc' }), planos)).toEqual({});
    });

    it('should return an empty object without query params', () => {
      expect(lerPreenchimentoRenovacao(convertToParamMap({}), planos)).toEqual({});
      expect(lerPreenchimentoRenovacao(undefined, planos)).toEqual({});
    });
  });
});
