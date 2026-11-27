import { AvaliacaoFisioterapeuticaResponseDTO } from '../../core/models/avaliacao-fisioterapeutica';
import { PlanoTratamentoResponseDTO } from '../../core/models/plano-tratamento';
import { ReavaliacaoResponseDTO } from '../../core/models/reavaliacao';
import {
  RegistrosAvaliacao,
  avaliacaoDeReferencia,
  etapaAnterior,
  etapaPendente,
  lerEtapa,
  lerFluxo,
  montarLinhaDoTempo,
  planoMaisRecente,
  proximaEtapa,
  situacaoEtapa
} from './fluxo-avaliacao';

const nada: RegistrosAvaliacao = { anamnese: false, avaliacao: false, plano: false, reavaliacao: false };

function avaliacao(id: number, data: string, extra: Partial<AvaliacaoFisioterapeuticaResponseDTO> = {}) {
  return {
    id,
    dataAvaliacao: data,
    queixaFuncional: 'Dor lombar',
    escalaDor: 6,
    diagnosticoFisioterapeutico: 'Lombalgia',
    ...extra
  } as AvaliacaoFisioterapeuticaResponseDTO;
}

function reavaliacao(id: number, data: string, extra: Partial<ReavaliacaoResponseDTO> = {}) {
  return {
    id,
    dataReavaliacao: data,
    evolucaoDor: null,
    objetivosAlcancados: null,
    pontosAtencao: null,
    ajustesRecomendados: null,
    ...extra
  } as ReavaliacaoResponseDTO;
}

describe('fluxo-avaliacao', () => {
  describe('leitura da URL', () => {
    it('should default to the initial flow', () => {
      expect(lerFluxo(null)).toBe('inicial');
      expect(lerFluxo('outro')).toBe('inicial');
      expect(lerFluxo('reavaliacao')).toBe('reavaliacao');
    });

    it('should accept only steps of the current flow', () => {
      expect(lerEtapa('plano', 'inicial')).toBe('plano');
      expect(lerEtapa('reavaliacao', 'inicial')).toBeNull();
      expect(lerEtapa('anamnese', 'reavaliacao')).toBeNull();
      expect(lerEtapa(null, 'inicial')).toBeNull();
    });
  });

  describe('etapa pendente', () => {
    it('should start a brand-new patient at the anamnesis', () => {
      expect(etapaPendente('inicial', nada)).toBe('anamnese');
    });

    it('should skip the optional postural step', () => {
      expect(etapaPendente('inicial', { ...nada, anamnese: true, avaliacao: true })).toBe('plano');
    });

    it('should follow the order even when a later step already exists', () => {
      expect(etapaPendente('inicial', { ...nada, anamnese: true, plano: true })).toBe('avaliacao');
    });

    it('should have nothing pending when every required step exists', () => {
      expect(etapaPendente('inicial', { ...nada, anamnese: true, avaliacao: true, plano: true })).toBeNull();
    });

    it('should leave only the reassessment itself pending in the reassessment flow', () => {
      expect(etapaPendente('reavaliacao', { ...nada, anamnese: true, avaliacao: true })).toBe('reavaliacao');
      expect(etapaPendente('reavaliacao', { ...nada, reavaliacao: true })).toBeNull();
    });
  });

  describe('situação da etapa', () => {
    it('should derive the initial flow situations from the records', () => {
      const registros = { ...nada, anamnese: true };
      expect(situacaoEtapa('inicial', 'anamnese', registros)).toBe('concluida');
      expect(situacaoEtapa('inicial', 'avaliacao', registros)).toBe('pendente');
      expect(situacaoEtapa('inicial', 'postural', registros)).toBe('opcional');
      expect(situacaoEtapa('inicial', 'plano', registros)).toBe('pendente');
    });

    it('should not count an existing plan as reviewed in the reassessment flow', () => {
      const registros = { ...nada, plano: true, reavaliacao: true };
      expect(situacaoEtapa('reavaliacao', 'reavaliacao', registros)).toBe('concluida');
      expect(situacaoEtapa('reavaliacao', 'plano', registros)).toBe('opcional');
    });
  });

  describe('navegação', () => {
    it('should walk the steps in order', () => {
      expect(proximaEtapa('inicial', 'anamnese')).toBe('avaliacao');
      expect(proximaEtapa('inicial', 'avaliacao')).toBe('postural');
      expect(proximaEtapa('inicial', 'postural')).toBe('plano');
      expect(proximaEtapa('inicial', 'plano')).toBeNull();
      expect(proximaEtapa('inicial', 'reavaliacao')).toBeNull();
      expect(etapaAnterior('inicial', 'plano')).toBe('postural');
      expect(etapaAnterior('inicial', 'anamnese')).toBeNull();
      expect(etapaAnterior('reavaliacao', 'postural')).toBe('reavaliacao');
      expect(etapaAnterior('reavaliacao', 'anamnese')).toBeNull();
    });
  });

  it('should pick the plan with the latest start, breaking ties by id', () => {
    const planos = [
      { id: 1, dataInicio: '2026-01-01' },
      { id: 3, dataInicio: '2026-06-01' },
      { id: 2, dataInicio: '2026-06-01' }
    ] as PlanoTratamentoResponseDTO[];
    expect(planoMaisRecente(planos)?.id).toBe(3);
    expect(planoMaisRecente([])).toBeNull();
  });

  describe('linha do tempo', () => {
    it('should be empty without records', () => {
      expect(montarLinhaDoTempo([], [])).toEqual([]);
    });

    it('should order assessments and reassessments chronologically, the first assessment being the initial one', () => {
      const linha = montarLinhaDoTempo(
        [avaliacao(2, '2026-09-01'), avaliacao(1, '2026-03-01')],
        [reavaliacao(8, '2026-06-01'), reavaliacao(7, '2026-09-01'), reavaliacao(6, '2026-06-01')]
      );
      expect(linha.map(i => `${i.tipo}#${i.id}`)).toEqual([
        'avaliacao#1', 'reavaliacao#6', 'reavaliacao#8', 'avaliacao#2', 'reavaliacao#7'
      ]);
      expect(linha.map(i => i.titulo)).toEqual([
        'Avaliação inicial', 'Reavaliação', 'Reavaliação', 'Avaliação fisioterapêutica', 'Reavaliação'
      ]);
    });

    it('should list only the filled highlights', () => {
      const [item] = montarLinhaDoTempo([avaliacao(1, '2026-03-01', { queixaFuncional: '  ' })], []);
      expect(item.destaques).toEqual([
        { rotulo: 'Escala de dor', valor: '6/10' },
        { rotulo: 'Diagnóstico fisioterapêutico', valor: 'Lombalgia' }
      ]);
      const [reav] = montarLinhaDoTempo([], [reavaliacao(1, '2026-03-01', { evolucaoDor: 'Melhorou' })]);
      expect(reav.destaques).toEqual([{ rotulo: 'Evolução da dor', valor: 'Melhorou' }]);
    });

    it('should omit the pain scale when it is missing', () => {
      const [item] = montarLinhaDoTempo([avaliacao(1, '2026-03-01', { escalaDor: null as unknown as number })], []);
      expect(item.destaques.map(d => d.rotulo)).not.toContain('Escala de dor');
    });
  });

  describe('avaliação de referência da reavaliação', () => {
    const linha = montarLinhaDoTempo([avaliacao(1, '2026-03-01')], [reavaliacao(5, '2026-06-01'), reavaliacao(6, '2026-09-01')]);

    it('should start a new reassessment from the latest record', () => {
      expect(avaliacaoDeReferencia(linha, null)).toEqual(jasmine.objectContaining({ tipo: 'reavaliacao', id: 6 }));
    });

    it('should compare an existing reassessment with the record before it', () => {
      expect(avaliacaoDeReferencia(linha, 6)).toEqual(jasmine.objectContaining({ tipo: 'reavaliacao', id: 5 }));
      expect(avaliacaoDeReferencia(linha, 5)).toEqual(jasmine.objectContaining({ tipo: 'avaliacao', id: 1 }));
    });

    it('should have no reference without previous records', () => {
      expect(avaliacaoDeReferencia([], null)).toBeNull();
      expect(avaliacaoDeReferencia(montarLinhaDoTempo([], [reavaliacao(5, '2026-06-01')]), 5)).toBeNull();
    });
  });

  describe('comparativo das opções na linha do tempo (issue #306)', () => {
    it('liga cada reavaliação ao registro anterior, com a referência para a tela', () => {
      const linha = montarLinhaDoTempo(
        [avaliacao(1, '2026-03-01', { achadosPosturais: ['ESCOLIOSE'] })],
        [reavaliacao(5, '2026-06-01'), reavaliacao(6, '2026-09-01')]
      );
      expect(linha[0].anterior).toBeNull();
      expect(linha[1].anterior?.referencia).toBe('à avaliação inicial de 01/03/2026');
      expect(linha[1].anterior?.registro).toBe(linha[0].registro);
      expect(linha[2].anterior?.referencia).toBe('à reavaliação de 01/06/2026');
      expect(linha[1].camposOpcoes.map(c => c.campo)).toContain('regioesDor');
      expect(linha[0].camposOpcoes.map(c => c.campo)).not.toContain('regioesDor');
    });

    it('a reavaliação depois da avaliação compara as regiões de dor com as da anamnese', () => {
      const linha = montarLinhaDoTempo(
        [avaliacao(1, '2026-03-01', { achadosPosturais: ['ESCOLIOSE'] })],
        [reavaliacao(5, '2026-06-01')],
        { regioesDor: ['CERVICAL'] }
      );
      expect(linha[1].anterior?.registro).toEqual(jasmine.objectContaining({ achadosPosturais: ['ESCOLIOSE'], regioesDor: ['CERVICAL'] }));
    });

    it('sem regiões na anamnese (API antiga) usa a avaliação como está', () => {
      const linha = montarLinhaDoTempo([avaliacao(1, '2026-03-01')], [reavaliacao(5, '2026-06-01')], {});
      expect(linha[1].anterior?.registro).toBe(linha[0].registro);
    });

    it('reavaliação sem registro anterior não compara', () => {
      const [item] = montarLinhaDoTempo([], [reavaliacao(5, '2026-06-01')]);
      expect(item.anterior).toBeNull();
    });
  });
});
