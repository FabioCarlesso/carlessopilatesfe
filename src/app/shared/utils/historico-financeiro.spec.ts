import { NotaFiscalEmitidaResponseDTO } from '../../core/models/nfse-emitida';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../core/models/plano';
import {
  contarAulas,
  historicoDePlanos,
  ordenarPagamentosRecentesPrimeiro,
  resumirPagamentos,
  situacaoPagamento,
  ultimaNfseEmitida
} from './historico-financeiro';

function pagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1, pacienteId: 10, pacienteNome: 'Ana', planoId: 1, valor: 100, status: 'PENDENTE',
    dataPagamento: null, dataVencimento: '2026-10-10', periodoInicio: '2026-10-01', periodoFim: '2026-10-31',
    ...parcial
  };
}

function plano(parcial: Partial<PlanoResponseDTO>): PlanoResponseDTO {
  return {
    id: 1, pacienteId: 10, tipo: 'MENSAL', valor: 300, frequenciaSemanal: 'DUAS_VEZES',
    dataInicio: '2026-01-01', diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: false, horario: null,
    ...parcial
  };
}

function nota(parcial: Partial<NotaFiscalEmitidaResponseDTO>): NotaFiscalEmitidaResponseDTO {
  return {
    id: 1, pacienteId: 10, nomePaciente: 'Ana', competencia: '09/2026', numeroNota: '1',
    dataEmissao: '2026-10-05', valor: 300, observacoes: null, dataCriacao: '2026-10-05T10:00:00',
    dataAtualizacao: null, ...parcial
  };
}

describe('historico-financeiro utils', () => {
  const hoje = '2026-10-29';

  describe('situacaoPagamento', () => {
    it('should keep the stored status of paid and overdue payments', () => {
      expect(situacaoPagamento({ status: 'PAGO', dataVencimento: '2026-01-10' }, hoje)).toBe('PAGO');
      expect(situacaoPagamento({ status: 'VENCIDO', dataVencimento: '2026-10-01' }, hoje)).toBe('VENCIDO');
    });

    it('should treat a pending payment past its due date as overdue', () => {
      expect(situacaoPagamento({ status: 'PENDENTE', dataVencimento: '2026-10-28' }, hoje)).toBe('VENCIDO');
    });

    it('should keep pending a payment due today or later', () => {
      expect(situacaoPagamento({ status: 'PENDENTE', dataVencimento: hoje }, hoje)).toBe('PENDENTE');
      expect(situacaoPagamento({ status: 'PENDENTE', dataVencimento: '2026-11-10' }, hoje)).toBe('PENDENTE');
    });
  });

  describe('resumirPagamentos', () => {
    it('should count and sum each situation', () => {
      const resumo = resumirPagamentos([
        pagamento({ id: 1, status: 'PAGO', valor: 250, dataPagamento: '2026-03-02' }),
        pagamento({ id: 2, status: 'PAGO', valor: 250, dataPagamento: '2026-04-02' }),
        pagamento({ id: 3, status: 'PENDENTE', valor: 300, dataVencimento: '2026-11-10' }),
        pagamento({ id: 4, status: 'VENCIDO', valor: 120, dataVencimento: '2026-09-10' }),
        pagamento({ id: 5, status: 'PENDENTE', valor: 80, dataVencimento: '2026-10-01' })
      ], hoje);

      expect(resumo.porSituacao.PAGO).toEqual({ quantidade: 2, valor: 500 });
      expect(resumo.porSituacao.PENDENTE).toEqual({ quantidade: 1, valor: 300 });
      expect(resumo.porSituacao.VENCIDO).toEqual({ quantidade: 2, valor: 200 });
    });

    it('should sum only payments made in the current year, by payment date', () => {
      const resumo = resumirPagamentos([
        pagamento({ id: 1, status: 'PAGO', valor: 200, dataPagamento: '2026-01-05', dataVencimento: '2025-12-30' }),
        pagamento({ id: 2, status: 'PAGO', valor: 150, dataPagamento: '2025-12-28', dataVencimento: '2026-01-05' }),
        pagamento({ id: 3, status: 'PAGO', valor: 90, dataPagamento: null }),
        pagamento({ id: 4, status: 'PENDENTE', valor: 500, dataVencimento: '2026-12-01' })
      ], hoje);

      expect(resumo.ano).toBe(2026);
      expect(resumo.pagoNoAno).toBe(200);
      expect(resumo.porSituacao.PAGO.valor).toBe(440);
    });

    it('should round sums to cents', () => {
      const resumo = resumirPagamentos([
        pagamento({ id: 1, status: 'PAGO', valor: 0.1, dataPagamento: '2026-02-01' }),
        pagamento({ id: 2, status: 'PAGO', valor: 0.2, dataPagamento: '2026-02-01' })
      ], hoje);
      expect(resumo.porSituacao.PAGO.valor).toBe(0.3);
      expect(resumo.pagoNoAno).toBe(0.3);
    });

    it('should return zeroed totals for an empty history', () => {
      const resumo = resumirPagamentos([], hoje);
      expect(resumo.porSituacao.PAGO).toEqual({ quantidade: 0, valor: 0 });
      expect(resumo.porSituacao.PENDENTE).toEqual({ quantidade: 0, valor: 0 });
      expect(resumo.porSituacao.VENCIDO).toEqual({ quantidade: 0, valor: 0 });
      expect(resumo.pagoNoAno).toBe(0);
    });
  });

  describe('ordenarPagamentosRecentesPrimeiro', () => {
    it('should sort by due date descending, breaking ties by id, without mutating the input', () => {
      const entrada = [
        pagamento({ id: 1, dataVencimento: '2026-08-10' }),
        pagamento({ id: 2, dataVencimento: '2026-10-10' }),
        pagamento({ id: 3, dataVencimento: '2026-10-10' })
      ];
      expect(ordenarPagamentosRecentesPrimeiro(entrada).map(p => p.id)).toEqual([3, 2, 1]);
      expect(entrada.map(p => p.id)).toEqual([1, 2, 3]);
    });
  });

  describe('historicoDePlanos', () => {
    it('should drop the active plan and sort by start date descending', () => {
      const ativo = plano({ id: 3, ativo: true, dataInicio: '2026-06-01' });
      const planos = [
        plano({ id: 1, dataInicio: '2025-01-01' }),
        ativo,
        plano({ id: 2, dataInicio: '2025-08-01' })
      ];
      expect(historicoDePlanos(planos, ativo).map(p => p.id)).toEqual([2, 1]);
    });

    it('should keep every plan when there is no active one', () => {
      expect(historicoDePlanos([plano({ id: 1 }), plano({ id: 2, dataInicio: '2026-02-01' })], null).map(p => p.id))
        .toEqual([2, 1]);
    });
  });

  describe('contarAulas', () => {
    it('should split done and pending classes', () => {
      expect(contarAulas([{ realizada: true }, { realizada: false }, { realizada: true }]))
        .toEqual({ realizadas: 2, pendentes: 1, total: 3 });
    });

    it('should be zero without classes', () => {
      expect(contarAulas([])).toEqual({ realizadas: 0, pendentes: 0, total: 0 });
    });
  });

  describe('ultimaNfseEmitida', () => {
    it('should pick the most recent issue date regardless of list order', () => {
      const notas = [
        nota({ id: 1, dataEmissao: '2026-08-05' }),
        nota({ id: 2, dataEmissao: '2026-10-05' }),
        nota({ id: 3, dataEmissao: '2026-09-05' })
      ];
      expect(ultimaNfseEmitida(notas)?.id).toBe(2);
    });

    it('should break same-day ties by id', () => {
      expect(ultimaNfseEmitida([nota({ id: 4 }), nota({ id: 7 }), nota({ id: 5 })])?.id).toBe(7);
    });

    it('should be null without notes', () => {
      expect(ultimaNfseEmitida([])).toBeNull();
    });
  });
});
