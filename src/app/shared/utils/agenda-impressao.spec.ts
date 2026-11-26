import { CalendarioDia, CalendarioEvento } from './calendario';
import {
  compararParaImpressao,
  formatarGeradoEm,
  montarLinhasDaSemana,
  ordenarEventosDoDia,
  regraDePagina,
  SEM_HORARIO
} from './agenda-impressao';

function evento(dados: Partial<CalendarioEvento> & { chave: string; dia: string }): CalendarioEvento {
  return {
    origem: 'AULA',
    id: 1,
    horario: '08:00',
    duracao: null,
    titulo: 'Aula',
    rotulo: 'Aula',
    status: 'AGENDADA',
    statusLabel: 'Agendada',
    feriado: false,
    tipo: null,
    profissional: 'Paula',
    profissionalId: 5,
    pacienteId: 1,
    paciente: 'Ana',
    descricao: '',
    link: ['/'],
    ...dados
  };
}

function dia(data: string, eventos: CalendarioEvento[]): CalendarioDia {
  return { dia: data, numero: Number(data.slice(8)), doPeriodo: true, hoje: false, rotulo: data, eventos };
}

describe('agenda-impressao utils', () => {
  describe('compararParaImpressao', () => {
    it('should order by time, leaving events without time last, then by patient name', () => {
      const eventos = [
        evento({ chave: 'a', dia: '2026-11-23', horario: null, paciente: 'Zé' }),
        evento({ chave: 'b', dia: '2026-11-23', horario: '10:00', paciente: 'Bruno' }),
        evento({ chave: 'c', dia: '2026-11-23', horario: '08:00', paciente: 'Carla' }),
        evento({ chave: 'd', dia: '2026-11-23', horario: '08:00', paciente: 'Ana' })
      ];

      expect(eventos.sort(compararParaImpressao).map(e => e.chave)).toEqual(['d', 'c', 'b', 'a']);
    });
  });

  describe('montarLinhasDaSemana', () => {
    it('should build one row per time with events, one cell per day, without empty rows', () => {
      const segunda = dia('2026-11-23', [
        evento({ chave: 's1', dia: '2026-11-23', horario: '18:00', paciente: 'Bruno' }),
        evento({ chave: 's2', dia: '2026-11-23', horario: '08:00', paciente: 'Carla' }),
        evento({ chave: 's3', dia: '2026-11-23', horario: '08:00', paciente: 'Ana' })
      ]);
      const terca = dia('2026-11-24', [evento({ chave: 't1', dia: '2026-11-24', horario: null })]);
      const quarta = dia('2026-11-25', []);

      const linhas = montarLinhasDaSemana([segunda, terca, quarta]);

      expect(linhas.map(l => l.horario)).toEqual(['08:00', '18:00', SEM_HORARIO]);
      expect(linhas[0].celulas.map(c => c.map(e => e.chave))).toEqual([['s3', 's2'], [], []]);
      expect(linhas[1].celulas.map(c => c.map(e => e.chave))).toEqual([['s1'], [], []]);
      expect(linhas[2].celulas.map(c => c.map(e => e.chave))).toEqual([[], ['t1'], []]);
    });

    it('should return no rows for a week without events', () => {
      expect(montarLinhasDaSemana([dia('2026-11-23', [])])).toEqual([]);
    });

    it('should keep every event of the week in exactly one cell', () => {
      const dias = [
        dia('2026-11-23', [evento({ chave: 'a', dia: '2026-11-23', horario: '07:00' })]),
        dia('2026-11-24', [
          evento({ chave: 'b', dia: '2026-11-24', horario: '07:00' }),
          evento({ chave: 'c', dia: '2026-11-24', horario: '19:30' })
        ])
      ];

      const chaves = montarLinhasDaSemana(dias).flatMap(l => l.celulas.flat().map(e => e.chave));

      expect(chaves.sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('ordenarEventosDoDia', () => {
    it('should list the day in time order without mutating the day', () => {
      const eventos = [
        evento({ chave: 'tarde', dia: '2026-11-23', horario: '15:00' }),
        evento({ chave: 'manha', dia: '2026-11-23', horario: '07:00' })
      ];
      const doDia = dia('2026-11-23', eventos);

      expect(ordenarEventosDoDia(doDia).map(e => e.chave)).toEqual(['manha', 'tarde']);
      expect(doDia.eventos.map(e => e.chave)).toEqual(['tarde', 'manha']);
    });
  });

  describe('formatarGeradoEm', () => {
    it('should format the local date and time with two digits', () => {
      expect(formatarGeradoEm(new Date(2026, 10, 5, 9, 7))).toBe('05/11/2026 às 09:07');
    });
  });

  describe('regraDePagina', () => {
    it('should print the week in A4 landscape and the day in A4 portrait', () => {
      expect(regraDePagina('semanal')).toBe('@page { size: A4 landscape; margin: 10mm; }');
      expect(regraDePagina('diaria')).toBe('@page { size: A4 portrait; margin: 10mm; }');
    });
  });
});
