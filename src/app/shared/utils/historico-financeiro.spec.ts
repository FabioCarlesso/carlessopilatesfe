import { NotaFiscalEmitidaResponseDTO } from '../../core/models/nfse-emitida';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../core/models/plano';
import {
  contagemDoPacote,
  historicoDePlanos,
  ordenarNfsesRecentesPrimeiro,
  ordenarPagamentosRecentesPrimeiro,
  pacoteAtual,
  pagamentoEncerrado,
  resumirPagamentos,
  separarPagamentos,
  situacaoPagamento
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

  describe('pagamentoEncerrado e separarPagamentos', () => {
    it('should send to the history only paid payments whose period already ended', () => {
      expect(pagamentoEncerrado({ status: 'PAGO', periodoFim: '2026-10-28' }, hoje)).toBeTrue();
      expect(pagamentoEncerrado({ status: 'PAGO', periodoFim: hoje }, hoje)).toBeFalse();
      expect(pagamentoEncerrado({ status: 'PAGO', periodoFim: '2026-11-30' }, hoje)).toBeFalse();
    });

    it('should never send an open payment to the history, however old', () => {
      expect(pagamentoEncerrado({ status: 'VENCIDO', periodoFim: '2025-01-31' }, hoje)).toBeFalse();
      expect(pagamentoEncerrado({ status: 'PENDENTE', periodoFim: '2025-01-31' }, hoje)).toBeFalse();
    });

    it('should split current and previous payments, latest due date first', () => {
      const { vigentes, anteriores } = separarPagamentos([
        pagamento({ id: 1, status: 'PAGO', dataVencimento: '2026-08-10', periodoFim: '2026-08-31' }),
        pagamento({ id: 2, status: 'PAGO', dataVencimento: '2026-09-10', periodoFim: '2026-09-30' }),
        pagamento({ id: 3, status: 'VENCIDO', dataVencimento: '2026-07-10', periodoFim: '2026-07-31' }),
        pagamento({ id: 4, status: 'PAGO', dataVencimento: '2026-10-10', periodoFim: '2026-11-02' }),
        pagamento({ id: 5, status: 'PENDENTE', dataVencimento: '2026-11-03', periodoFim: '2026-11-30' })
      ], hoje);

      expect(vigentes.map(p => p.id)).toEqual([5, 4, 3]);
      expect(anteriores.map(p => p.id)).toEqual([2, 1]);
    });
  });

  describe('pacoteAtual', () => {
    it('should pick the payment whose period covers today', () => {
      const atual = pacoteAtual([
        pagamento({ id: 1, periodoInicio: '2026-09-01', periodoFim: '2026-09-28' }),
        pagamento({ id: 2, periodoInicio: '2026-09-29', periodoFim: '2026-10-29' }),
        pagamento({ id: 3, periodoInicio: '2026-10-30', periodoFim: '2026-11-27' })
      ], hoje);

      expect(atual?.pagamento.id).toBe(2);
      expect(atual?.situacao).toBe('EM_CURSO');
    });

    it('should prefer the latest start when more than one period covers today', () => {
      const atual = pacoteAtual([
        pagamento({ id: 7, periodoInicio: '2026-10-01', periodoFim: '2026-10-31' }),
        pagamento({ id: 8, periodoInicio: '2026-10-20', periodoFim: '2026-11-20' })
      ], hoje);

      expect(atual?.pagamento.id).toBe(8);
    });

    it('should fall back to the latest package already started when none covers today', () => {
      const atual = pacoteAtual([
        pagamento({ id: 1, periodoInicio: '2026-07-01', periodoFim: '2026-07-28' }),
        pagamento({ id: 2, periodoInicio: '2026-08-01', periodoFim: '2026-08-27' })
      ], hoje);

      expect(atual?.pagamento.id).toBe(2);
      expect(atual?.situacao).toBe('ENCERRADO');
    });

    it('should fall back to the next package when none started yet', () => {
      const atual = pacoteAtual([
        pagamento({ id: 6, periodoInicio: '2026-12-01', periodoFim: '2026-12-28' }),
        pagamento({ id: 5, periodoInicio: '2026-11-03', periodoFim: '2026-11-30' })
      ], hoje);

      expect(atual?.pagamento.id).toBe(5);
      expect(atual?.situacao).toBe('FUTURO');
    });

    it('should be null without payments', () => {
      expect(pacoteAtual([], hoje)).toBeNull();
    });
  });

  describe('contagemDoPacote', () => {
    it('should use the numbers from the API', () => {
      expect(contagemDoPacote({ aulasPacote: 8, aulasRealizadas: 3 })).toEqual({ realizadas: 3, total: 8, restantes: 5 });
    });

    it('should never report negative remaining classes', () => {
      expect(contagemDoPacote({ aulasPacote: 4, aulasRealizadas: 5 })?.restantes).toBe(0);
    });

    it('should be null when the API does not send the fields or the package has no size', () => {
      expect(contagemDoPacote({})).toBeNull();
      expect(contagemDoPacote({ aulasPacote: 8 })).toBeNull();
      expect(contagemDoPacote({ aulasRealizadas: 2 })).toBeNull();
      expect(contagemDoPacote({ aulasPacote: 0, aulasRealizadas: 0 })).toBeNull();
    });
  });

  describe('ordenarNfsesRecentesPrimeiro', () => {
    it('should sort by the most recent issue date regardless of list order', () => {
      const notas = [
        nota({ id: 1, dataEmissao: '2026-08-05' }),
        nota({ id: 2, dataEmissao: '2026-10-05' }),
        nota({ id: 3, dataEmissao: '2026-09-05' })
      ];
      expect(ordenarNfsesRecentesPrimeiro(notas).map(n => n.id)).toEqual([2, 3, 1]);
      expect(notas.map(n => n.id)).toEqual([1, 2, 3]);
    });

    it('should break same-day ties by id', () => {
      expect(ordenarNfsesRecentesPrimeiro([nota({ id: 4 }), nota({ id: 7 }), nota({ id: 5 })]).map(n => n.id))
        .toEqual([7, 5, 4]);
    });
  });
});
