import { BloqueioAgendaResponseDTO } from '../../core/models/bloqueio-agenda';
import {
  agruparBloqueiosPorDia,
  bloqueiosDoDia,
  bloqueiosDoHorario,
  cobreDia,
  descreverBloqueio,
  ehDiaInteiro,
  formatarFaixaHoraria,
  formatarPeriodo,
  normalizarHora
} from './bloqueio-agenda';

function bloqueio(
  dados: Partial<BloqueioAgendaResponseDTO> & { id: number; dataInicio: string }
): BloqueioAgendaResponseDTO {
  const horaInicio = dados.horaInicio ?? null;
  const horaFim = dados.horaFim ?? null;
  return {
    dataFim: dados.dataInicio,
    horaInicio,
    horaFim,
    diaInteiro: horaInicio === null && horaFim === null,
    motivo: 'Feriado',
    dataCriacao: '2026-01-02T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

describe('bloqueio-agenda utils', () => {
  describe('normalizarHora', () => {
    it('should keep HH:mm untouched', () => {
      expect(normalizarHora('08:30')).toBe('08:30');
    });

    // O Jackson só escreve os segundos quando eles não são zero, então as duas
    // formas chegam do mesmo endpoint.
    it('should drop the seconds the API may send', () => {
      expect(normalizarHora('08:30:00')).toBe('08:30');
      expect(normalizarHora('08:30:45')).toBe('08:30');
    });

    it('should return null for absent or unrecognized values', () => {
      expect(normalizarHora(null)).toBeNull();
      expect(normalizarHora(undefined)).toBeNull();
      expect(normalizarHora('')).toBeNull();
      expect(normalizarHora('manhã')).toBeNull();
    });
  });

  describe('ehDiaInteiro', () => {
    it('should be true when there is no time range', () => {
      expect(ehDiaInteiro(bloqueio({ id: 1, dataInicio: '2026-12-25' }))).toBeTrue();
    });

    it('should be false when both hours are informed', () => {
      const comFaixa = bloqueio({ id: 1, dataInicio: '2026-12-25', horaInicio: '08:00', horaFim: '12:00' });
      expect(ehDiaInteiro(comFaixa)).toBeFalse();
    });

    // As horas são a fonte de verdade: um `diaInteiro` divergente esconderia a
    // faixa da tela sem que ninguém percebesse.
    it('should follow the hours, not the diaInteiro flag', () => {
      const inconsistente = bloqueio({
        id: 1,
        dataInicio: '2026-12-25',
        horaInicio: '08:00',
        horaFim: '12:00',
        diaInteiro: true
      });
      expect(ehDiaInteiro(inconsistente)).toBeFalse();
    });
  });

  describe('cobreDia', () => {
    const natal = bloqueio({ id: 1, dataInicio: '2026-12-24', dataFim: '2026-12-26' });

    it('should include both ends of the period', () => {
      expect(cobreDia(natal, '2026-12-24')).toBeTrue();
      expect(cobreDia(natal, '2026-12-26')).toBeTrue();
      expect(cobreDia(natal, '2026-12-25')).toBeTrue();
    });

    it('should exclude days outside the period', () => {
      expect(cobreDia(natal, '2026-12-23')).toBeFalse();
      expect(cobreDia(natal, '2026-12-27')).toBeFalse();
    });
  });

  describe('bloqueiosDoDia', () => {
    const bloqueios = [
      bloqueio({ id: 1, dataInicio: '2026-12-24', dataFim: '2026-12-26', motivo: 'Recesso' }),
      bloqueio({ id: 2, dataInicio: '2026-12-25', motivo: 'Natal' }),
      bloqueio({ id: 3, dataInicio: '2027-01-01', motivo: 'Ano novo' })
    ];

    it('should return every block covering the day', () => {
      expect(bloqueiosDoDia(bloqueios, '2026-12-25').map(b => b.id)).toEqual([1, 2]);
    });

    it('should return an empty list for a free day', () => {
      expect(bloqueiosDoDia(bloqueios, '2026-12-27')).toEqual([]);
    });
  });

  describe('agruparBloqueiosPorDia', () => {
    const bloqueios = [bloqueio({ id: 1, dataInicio: '2026-12-24', dataFim: '2026-12-25' })];

    it('should index only the days that have blocks', () => {
      const porDia = agruparBloqueiosPorDia(bloqueios, ['2026-12-23', '2026-12-24', '2026-12-25']);

      expect(porDia.get('2026-12-24')?.map(b => b.id)).toEqual([1]);
      expect(porDia.get('2026-12-25')?.map(b => b.id)).toEqual([1]);
      expect(porDia.has('2026-12-23')).toBeFalse();
    });

    it('should ignore blocks outside the informed days', () => {
      expect(agruparBloqueiosPorDia(bloqueios, ['2027-01-01']).size).toBe(0);
    });
  });

  describe('bloqueiosDoHorario', () => {
    const diaInteiro = bloqueio({ id: 1, dataInicio: '2026-12-25', motivo: 'Natal' });
    const manha = bloqueio({
      id: 2,
      dataInicio: '2026-12-28',
      horaInicio: '08:00',
      horaFim: '12:00',
      motivo: 'Manutenção'
    });

    it('should catch any time of a full-day block', () => {
      expect(bloqueiosDoHorario([diaInteiro], '2026-12-25T19:00', 60).map(b => b.id)).toEqual([1]);
    });

    it('should catch a session that starts inside the range', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T09:00', 60).map(b => b.id)).toEqual([2]);
    });

    // A sobreposição é o critério: começar antes do bloqueio não livra a sessão
    // que avança sobre ele.
    it('should catch a session that starts before but overlaps the range', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T07:00', 120).map(b => b.id)).toEqual([2]);
    });

    it('should not catch a session that ends exactly when the range starts', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T07:00', 60)).toEqual([]);
    });

    it('should not catch a session that starts exactly when the range ends', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T12:00', 60)).toEqual([]);
    });

    it('should not catch a session outside the range', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T14:00', 60)).toEqual([]);
    });

    it('should not catch a session on another day', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-29T09:00', 60)).toEqual([]);
    });

    // Duração ausente ainda avisa quem escolheu um horário dentro da faixa: o
    // campo é preenchido depois da data e hora no formulário.
    it('should treat a missing duration as an instant', () => {
      expect(bloqueiosDoHorario([manha], '2026-12-28T08:00', null).map(b => b.id)).toEqual([2]);
      expect(bloqueiosDoHorario([manha], '2026-12-28T13:00', null)).toEqual([]);
    });

    it('should return an empty list without a date', () => {
      expect(bloqueiosDoHorario([manha], '', 60)).toEqual([]);
      expect(bloqueiosDoHorario([manha], null, 60)).toEqual([]);
      expect(bloqueiosDoHorario([manha], '2026-12-28', 60)).toEqual([]);
    });
  });

  describe('formatting', () => {
    it('should describe a full-day block', () => {
      const natal = bloqueio({ id: 1, dataInicio: '2026-12-25', motivo: 'Natal' });

      expect(formatarFaixaHoraria(natal)).toBe('Dia inteiro');
      expect(formatarPeriodo(natal)).toBe('25/12/2026');
      expect(descreverBloqueio(natal)).toBe('Natal — 25/12/2026, dia inteiro');
    });

    it('should describe a block with a time range over several days', () => {
      const manutencao = bloqueio({
        id: 2,
        dataInicio: '2026-12-28',
        dataFim: '2026-12-30',
        horaInicio: '08:00:00',
        horaFim: '12:00:00',
        motivo: 'Manutenção dos equipamentos'
      });

      expect(formatarFaixaHoraria(manutencao)).toBe('Das 08:00 às 12:00');
      expect(formatarPeriodo(manutencao)).toBe('28/12/2026 a 30/12/2026');
      expect(descreverBloqueio(manutencao)).toBe(
        'Manutenção dos equipamentos — 28/12/2026 a 30/12/2026, das 08:00 às 12:00'
      );
    });
  });
});
