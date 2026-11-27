import { AvaliacaoFisioterapeuticaResponseDTO } from '../../core/models/avaliacao-fisioterapeutica';
import { ReavaliacaoResponseDTO } from '../../core/models/reavaliacao';
import {
  CHAVE_SEM_VINCULO,
  chaveDaAnalise,
  formatarDataVinculo,
  montarOpcoesVinculo,
  rotuloDoVinculo,
  vinculoDaChave
} from './vinculo-postural';

const avaliacao = (id: number, dataAvaliacao: string) =>
  ({ id, dataAvaliacao }) as AvaliacaoFisioterapeuticaResponseDTO;
const reavaliacao = (id: number, dataReavaliacao: string) =>
  ({ id, dataReavaliacao }) as ReavaliacaoResponseDTO;

describe('vinculo-postural', () => {
  it('formats yyyy-MM-dd and ISO date-time without timezone shifts', () => {
    expect(formatarDataVinculo('2026-07-01')).toBe('01/07/2026');
    expect(formatarDataVinculo('2026-07-01T00:30:00')).toBe('01/07/2026');
    expect(formatarDataVinculo('invalida')).toBe('invalida');
  });

  it('derives the key of an analysis', () => {
    expect(chaveDaAnalise({ avaliacaoFisioterapeuticaId: 5, reavaliacaoId: null })).toBe('avaliacao:5');
    expect(chaveDaAnalise({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 })).toBe('reavaliacao:7');
    expect(chaveDaAnalise({ avaliacaoFisioterapeuticaId: null })).toBe(CHAVE_SEM_VINCULO);
  });

  it('turns a key into the PATCH body', () => {
    expect(vinculoDaChave('avaliacao:5')).toEqual({ avaliacaoFisioterapeuticaId: 5, reavaliacaoId: null });
    expect(vinculoDaChave('reavaliacao:7')).toEqual({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 });
    expect(vinculoDaChave('')).toEqual({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: null });
    expect(vinculoDaChave('avaliacao:abc')).toEqual({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: null });
  });

  it('merges avaliações and reavaliações newest first', () => {
    const opcoes = montarOpcoesVinculo(
      [avaliacao(5, '2026-07-10'), avaliacao(4, '2026-10-01')],
      [reavaliacao(7, '2026-10-01'), reavaliacao(8, '2026-08-15')]
    );

    expect(opcoes.map(o => o.chave)).toEqual(['reavaliacao:7', 'avaliacao:4', 'reavaliacao:8', 'avaliacao:5']);
    expect(opcoes[0].label).toBe('Reavaliação de 01/10/2026');
    expect(opcoes[3].label).toBe('Avaliação de 10/07/2026');
  });

  it('labels the link, falling back to the record type when it is not among the options', () => {
    const opcoes = montarOpcoesVinculo([avaliacao(5, '2026-07-10')], []);

    expect(rotuloDoVinculo({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: null }, opcoes)).toBe('Solta');
    expect(rotuloDoVinculo({ avaliacaoFisioterapeuticaId: 5 }, opcoes)).toBe('Avaliação de 10/07/2026');
    expect(rotuloDoVinculo({ avaliacaoFisioterapeuticaId: 9 }, opcoes)).toBe('Avaliação fisioterapêutica');
    expect(rotuloDoVinculo({ avaliacaoFisioterapeuticaId: null, reavaliacaoId: 7 }, opcoes)).toBe('Reavaliação');
  });
});
