import { AulaResponseDTO, PagamentoResponseDTO, PlanoResponseDTO } from '../../core/models/plano';
import {
  DIAS_FALTAS_RECENTES,
  ehFalta,
  lerAreaPaciente,
  resumirAgenda,
  resumirClinico,
  resumirFinanceiro
} from './resumo-paciente';

function aula(parcial: Partial<AulaResponseDTO>): AulaResponseDTO {
  return {
    id: 1, pacienteId: 10, pacienteNome: 'Ana', pagamentoId: 1, data: '2026-10-29', horario: '08:00:00',
    realizada: false, ...parcial
  };
}

function pagamento(parcial: Partial<PagamentoResponseDTO>): PagamentoResponseDTO {
  return {
    id: 1, pacienteId: 10, pacienteNome: 'Ana', planoId: 1, valor: 100, status: 'PENDENTE',
    dataPagamento: null, dataVencimento: '2026-11-10', periodoInicio: '2026-11-01', periodoFim: '2026-11-30',
    ...parcial
  };
}

const plano: PlanoResponseDTO = {
  id: 1, pacienteId: 10, tipo: 'MENSAL', valor: 300, frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-01-01', diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: true, horario: null
};

describe('resumo-paciente utils', () => {
  const hoje = '2026-10-29';

  describe('lerAreaPaciente', () => {
    const todas = ['clinico', 'agenda', 'financeiro'] as const;

    it('should keep a valid area the role can reach', () => {
      expect(lerAreaPaciente('agenda', todas)).toBe('agenda');
    });

    it('should fall back to the first available area when missing, unknown or out of reach', () => {
      expect(lerAreaPaciente(null, todas)).toBe('clinico');
      expect(lerAreaPaciente('xyz', todas)).toBe('clinico');
      expect(lerAreaPaciente('clinico', ['agenda', 'financeiro'])).toBe('agenda');
    });

    it('should return null when no area is available', () => {
      expect(lerAreaPaciente('clinico', [])).toBeNull();
    });
  });

  describe('resumirClinico', () => {
    it('should pick the most recent assessment and evolution regardless of order', () => {
      const resumo = resumirClinico(
        [{ dataAvaliacao: '2026-03-01' }, { dataAvaliacao: '2026-09-10' }, { dataAvaliacao: '2026-05-02' }],
        [{ dataHoraRegistro: '2026-10-01T09:00:00' }, { dataHoraRegistro: '2026-10-20T08:30:00' }]
      );
      expect(resumo).toEqual({ ultimaAvaliacao: '2026-09-10', ultimaEvolucao: '2026-10-20T08:30:00' });
    });

    it('should return nulls for a brand-new patient', () => {
      expect(resumirClinico([], [])).toEqual({ ultimaAvaliacao: null, ultimaEvolucao: null });
    });
  });

  describe('ehFalta', () => {
    it('should count a past class that was not given', () => {
      expect(ehFalta(aula({ data: '2026-10-28' }), hoje)).toBeTrue();
    });

    it('should not count given classes, holidays, nor today', () => {
      expect(ehFalta(aula({ data: '2026-10-28', realizada: true }), hoje)).toBeFalse();
      expect(ehFalta(aula({ data: '2026-10-28', feriado: true }), hoje)).toBeFalse();
      expect(ehFalta(aula({ data: hoje }), hoje)).toBeFalse();
    });
  });

  describe('resumirAgenda', () => {
    it('should find the next class from today on, by date and time', () => {
      const resumo = resumirAgenda([
        aula({ id: 1, data: '2026-11-05', horario: '08:00:00' }),
        aula({ id: 2, data: '2026-10-30', horario: '18:00:00' }),
        aula({ id: 3, data: '2026-10-30', horario: '07:00:00' }),
        aula({ id: 4, data: '2026-10-29', realizada: true }),
        aula({ id: 5, data: '2026-10-31', feriado: true })
      ], hoje);
      expect(resumo.proximaAula?.id).toBe(3);
    });

    it('should list recent absences, most recent first, within the window', () => {
      const resumo = resumirAgenda([
        aula({ id: 1, data: '2026-10-20' }),
        aula({ id: 2, data: '2026-10-27' }),
        aula({ id: 3, data: '2026-10-25', feriado: true, realizada: true }),
        aula({ id: 4, data: '2026-10-26', realizada: true }),
        aula({ id: 5, data: '2026-09-01' })
      ], hoje);
      expect(resumo.faltasRecentes.map(a => a.id)).toEqual([2, 1]);
    });

    it('should include the first day of the window', () => {
      const resumo = resumirAgenda([aula({ data: '2026-09-29' })], hoje, DIAS_FALTAS_RECENTES);
      expect(resumo.faltasRecentes.length).toBe(1);
    });

    it('should be empty for a patient without classes', () => {
      expect(resumirAgenda([], hoje)).toEqual({ proximaAula: null, faltasRecentes: [] });
    });
  });

  describe('resumirFinanceiro', () => {
    it('should report the active plan, next due date and pending charges', () => {
      const resumo = resumirFinanceiro(plano, [
        pagamento({ id: 1, status: 'PAGO', dataPagamento: '2026-10-05', dataVencimento: '2026-10-10' }),
        pagamento({ id: 2, dataVencimento: '2026-12-10' }),
        pagamento({ id: 3, dataVencimento: '2026-11-10' }),
        pagamento({ id: 4, dataVencimento: '2026-10-01', valor: 50 }),
        pagamento({ id: 5, status: 'VENCIDO', dataVencimento: '2026-09-10', planoId: 99 })
      ], hoje);
      expect(resumo.plano).toBe(plano);
      expect(resumo.proximoVencimento?.id).toBe(3);
      expect(resumo.pendentes).toEqual({ quantidade: 2, valor: 200 });
      expect(resumo.vencidos).toEqual({ quantidade: 2, valor: 150 });
      expect(resumo.situacao.tipo).toBe('EM_ABERTO');
    });

    it('should be empty for a patient without plan nor payments', () => {
      const resumo = resumirFinanceiro(null, [], hoje);
      expect(resumo.plano).toBeNull();
      expect(resumo.proximoVencimento).toBeNull();
      expect(resumo.pendentes.quantidade).toBe(0);
      expect(resumo.vencidos.quantidade).toBe(0);
      expect(resumo.situacao.tipo).toBe('SEM_PLANO');
    });
  });
});
