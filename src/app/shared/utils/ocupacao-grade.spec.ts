import { OcupacaoCelula } from '../../core/models/relatorio-ocupacao';
import { faixaOcupacao, lotadoComEspera, montarGradeOcupacao } from './ocupacao-grade';

function celula(parcial: Partial<OcupacaoCelula>): OcupacaoCelula {
  return {
    data: '2026-11-23',
    diaSemana: 'MONDAY',
    horario: '08:00:00',
    profissional: { id: 5, nome: 'Paula' },
    ocupacao: 1,
    capacidade: 3,
    vagas: 2,
    lotado: false,
    dentroDaDisponibilidade: true,
    listaEspera: 0,
    alunos: [],
    ...parcial
  };
}

describe('ocupacao-grade', () => {
  describe('faixaOcupacao', () => {
    it('should be livre while more than half of the capacity is free', () => {
      expect(faixaOcupacao(celula({ ocupacao: 1, vagas: 2 }))).toBe('livre');
    });

    it('should be parcial with free seats up to half of the capacity', () => {
      expect(faixaOcupacao(celula({ ocupacao: 2, vagas: 1 }))).toBe('parcial');
    });

    it('should be lotado without seats', () => {
      expect(faixaOcupacao(celula({ ocupacao: 3, vagas: 0, lotado: true }))).toBe('lotado');
    });

    it('should be fora outside the professional availability, whatever the seats', () => {
      expect(faixaOcupacao(celula({ dentroDaDisponibilidade: false, vagas: 0 }))).toBe('fora');
    });

    it('should not count seats for the group without professional', () => {
      expect(faixaOcupacao(celula({ profissional: null, capacidade: null, vagas: null, dentroDaDisponibilidade: null })))
        .toBe('sem-vaga');
    });
  });

  it('should flag only full slots with a waiting list', () => {
    expect(lotadoComEspera(celula({ ocupacao: 3, vagas: 0, lotado: true, listaEspera: 2 }))).toBeTrue();
    expect(lotadoComEspera(celula({ ocupacao: 3, vagas: 0, lotado: true, listaEspera: 0 }))).toBeFalse();
    expect(lotadoComEspera(celula({ ocupacao: 1, vagas: 2, listaEspera: 4 }))).toBeFalse();
  });

  describe('montarGradeOcupacao', () => {
    it('should build Monday to Sunday columns from the week start', () => {
      const grade = montarGradeOcupacao('2026-11-23', []);

      expect(grade.dias.map(d => d.data)).toEqual([
        '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'
      ]);
      expect(grade.dias[0].rotulo).toBe('Seg 23/11');
      expect(grade.dias[6].rotulo).toBe('Dom 29/11');
      expect(grade.linhas).toEqual([]);
    });

    it('should list only hours with classes, sorted, with "Sem horário" last', () => {
      const grade = montarGradeOcupacao('2026-11-23', [
        celula({ horario: '18:00:00' }),
        celula({ horario: null, data: '2026-11-24', profissional: null, capacidade: null, vagas: null }),
        celula({ horario: '08:00:00', data: '2026-11-25' })
      ]);

      expect(grade.linhas.map(l => l.rotulo)).toEqual(['08:00', '18:00', 'Sem horário']);
    });

    it('should keep every professional of the same slot in the same cell, in API order', () => {
      const paula = celula({ profissional: { id: 5, nome: 'Paula' } });
      const semProf = celula({ profissional: null, capacidade: null, vagas: null, dentroDaDisponibilidade: null });
      const grade = montarGradeOcupacao('2026-11-23', [paula, semProf, celula({ data: '2026-11-27' })]);

      const oito = grade.linhas[0];
      expect(oito.itensPorDia[0]).toEqual([paula, semProf]);
      expect(oito.itensPorDia[1]).toEqual([]);
      expect(oito.itensPorDia[4].length).toBe(1);
    });
  });
});
