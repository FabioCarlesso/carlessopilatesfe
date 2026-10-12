import {
  CAMPO_DIAS_ATRASO,
  descreverAtraso,
  diasEmAtraso,
  formatarDataHora,
  sortDaInadimplencia,
  validarFaixaVencimento
} from './inadimplencia';

describe('inadimplencia utils', () => {
  describe('diasEmAtraso', () => {
    const hoje = '2026-10-12';

    it('should count calendar days since the due date for an overdue payment', () => {
      expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2026-10-02' }, hoje)).toBe(10);
      expect(diasEmAtraso({ status: 'PENDENTE', dataVencimento: '2026-10-11' }, hoje)).toBe(1);
    });

    it('should cross month and year boundaries', () => {
      expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2025-12-31' }, '2026-01-02')).toBe(2);
      expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2026-02-28' }, '2026-03-01')).toBe(1);
    });

    // Fuso de Brasília não tem mais horário de verão, mas o navegador pode
    // estar em outro; o arredondamento protege a conta das 23h/25h da virada.
    it('should not lose a day across a daylight saving change', () => {
      expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2026-03-01' }, '2026-04-01')).toBe(31);
      expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2026-10-01' }, '2026-11-01')).toBe(31);
    });

    it('should be zero when the payment is due today or in the future', () => {
      expect(diasEmAtraso({ status: 'PENDENTE', dataVencimento: hoje }, hoje)).toBe(0);
      expect(diasEmAtraso({ status: 'PENDENTE', dataVencimento: '2026-11-10' }, hoje)).toBe(0);
    });

    it('should be zero for a paid payment, even with an old due date', () => {
      expect(diasEmAtraso({ status: 'PAGO', dataVencimento: '2026-01-10' }, hoje)).toBe(0);
    });

    it('should be zero without a due date', () => {
      expect(diasEmAtraso({ status: 'PENDENTE', dataVencimento: '' }, hoje)).toBe(0);
    });

    it('should default to the local today', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 9, 12, 23, 30));
      try {
        expect(diasEmAtraso({ status: 'VENCIDO', dataVencimento: '2026-10-09' })).toBe(3);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('descreverAtraso', () => {
    it('should render a dash when there is no delay', () => {
      expect(descreverAtraso(0)).toBe('—');
      expect(descreverAtraso(-3)).toBe('—');
    });

    it('should pluralize the day count', () => {
      expect(descreverAtraso(1)).toBe('1 dia');
      expect(descreverAtraso(45)).toBe('45 dias');
    });
  });

  describe('sortDaInadimplencia', () => {
    it('should pass real API fields through', () => {
      expect(sortDaInadimplencia({ campo: 'dataVencimento', direcao: 'asc' })).toEqual(['dataVencimento,asc']);
      expect(sortDaInadimplencia({ campo: 'paciente.nome', direcao: 'desc' })).toEqual(['paciente.nome,desc']);
    });

    it('should map days overdue to the due date in the opposite direction', () => {
      // Status primeiro: pago e pendente no prazo têm atraso zero e não podem se
      // misturar aos vencidos só por terem vencimento antigo.
      expect(sortDaInadimplencia({ campo: CAMPO_DIAS_ATRASO, direcao: 'desc' })).toEqual([
        'status,desc',
        'dataVencimento,asc'
      ]);
      expect(sortDaInadimplencia({ campo: CAMPO_DIAS_ATRASO, direcao: 'asc' })).toEqual([
        'status,asc',
        'dataVencimento,desc'
      ]);
    });
  });

  describe('validarFaixaVencimento', () => {
    it('should accept empty, single-ended and ordered ranges', () => {
      expect(validarFaixaVencimento('', '')).toBeNull();
      expect(validarFaixaVencimento(null, undefined)).toBeNull();
      expect(validarFaixaVencimento('2026-01-01', '')).toBeNull();
      expect(validarFaixaVencimento('', '2026-06-30')).toBeNull();
      expect(validarFaixaVencimento('2026-01-01', '2026-01-01')).toBeNull();
      expect(validarFaixaVencimento('2026-01-01', '2026-06-30')).toBeNull();
    });

    it('should reject an inverted range', () => {
      expect(validarFaixaVencimento('2026-06-30', '2026-01-01'))
        .toBe('O vencimento inicial não pode ser posterior ao final.');
    });
  });

  describe('formatarDataHora', () => {
    it('should format the server local timestamp without timezone conversion', () => {
      expect(formatarDataHora('2026-05-12T14:03:27')).toBe('12/05/2026 às 14:03');
      expect(formatarDataHora('2026-05-12T00:05')).toBe('12/05/2026 às 00:05');
    });

    it('should return empty for missing values and the raw value for unknown formats', () => {
      expect(formatarDataHora(null)).toBe('');
      expect(formatarDataHora(undefined)).toBe('');
      expect(formatarDataHora('ontem')).toBe('ontem');
    });
  });
});
