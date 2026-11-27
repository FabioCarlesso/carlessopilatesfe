import {
  CAMPOS_OPCOES_ANAMNESE,
  CAMPOS_OPCOES_EXAME_FISICO,
  CAMPOS_OPCOES_REAVALIACAO
} from '../../core/models/opcoes-avaliacao';
import { CATALOGO_OPCOES_TESTE, campoTeste } from '../../../testing/opcoes-avaliacao';
import {
  NAO_INFORMADO,
  campoDoCatalogo,
  compararOpcoes,
  controlesOpcoes,
  descreverMudanca,
  dtoOpcoes,
  opcaoAntiga,
  resumirOpcoes,
  rotuloOpcao,
  valoresFormularioOpcoes
} from './opcoes-avaliacao';

describe('opcoes-avaliacao', () => {
  describe('controlesOpcoes', () => {
    it('cria o controle de cada campo e do seu complemento, com o valor vazio do tipo', () => {
      const controles = controlesOpcoes(CAMPOS_OPCOES_EXAME_FISICO);
      expect(controles['achadosPosturais'].value).toEqual([]);
      expect(controles['equilibrioOpcao'].value).toBeNull();
      expect(controles['testesFuncionais'].value).toEqual([]);
      expect(controles['equilibrioComplemento'].value).toBe('');
      expect(Object.keys(controles).length).toBe(10);
    });
  });

  describe('valoresFormularioOpcoes', () => {
    it('lê os campos do registro', () => {
      const valores = valoresFormularioOpcoes(CAMPOS_OPCOES_ANAMNESE, {
        regioesDor: ['CERVICAL'],
        regioesDorComplemento: 'Irradia',
        nivelAtividadeFisicaOpcao: 'ATIVO',
        condicoesSaude: [],
        objetivosOpcoes: ['POSTURA']
      });
      expect(valores['regioesDor']).toEqual(['CERVICAL']);
      expect(valores['regioesDorComplemento']).toBe('Irradia');
      expect(valores['nivelAtividadeFisicaOpcao']).toBe('ATIVO');
      expect(valores['objetivosOpcoes']).toEqual(['POSTURA']);
      expect(valores['condicoesSaudeComplemento']).toBe('');
    });

    it('registro antigo, sem os campos, volta vazio', () => {
      const valores = valoresFormularioOpcoes(CAMPOS_OPCOES_EXAME_FISICO, { queixaFuncional: 'Dor' });
      expect(valores['achadosPosturais']).toEqual([]);
      expect(valores['padraoRespiratorioOpcao']).toBeNull();
      expect(valores['testesFuncionais']).toEqual([]);
    });

    it('descarta itens malformados dos testes e das listas', () => {
      const valores = valoresFormularioOpcoes(CAMPOS_OPCOES_EXAME_FISICO, {
        achadosPosturais: ['ESCOLIOSE', 3, null],
        testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }, null, { resultado: 'NEGATIVO' }, { teste: 'ADAMS' }]
      });
      expect(valores['achadosPosturais']).toEqual(['ESCOLIOSE']);
      expect(valores['testesFuncionais']).toEqual([
        { teste: 'SCHOBER', resultado: 'POSITIVO' },
        { teste: 'ADAMS', resultado: null }
      ]);
    });

    it('aceita registro nulo', () => {
      expect(valoresFormularioOpcoes(CAMPOS_OPCOES_ANAMNESE, null)['regioesDor']).toEqual([]);
    });
  });

  describe('dtoOpcoes', () => {
    const valor = {
      regioesDor: ['LOMBAR'],
      regioesDorComplemento: '  Lado direito ',
      achadosPosturais: [],
      achadosPosturaisComplemento: '',
      padraoRespiratorioOpcao: null,
      padraoRespiratorioComplemento: '   ',
      equilibrioOpcao: 'PRESERVADO',
      equilibrioComplemento: '',
      coordenacaoMotoraOpcao: '',
      coordenacaoMotoraComplemento: '',
      testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }, { teste: 'ADAMS', resultado: null }],
      testesFuncionaisComplemento: ''
    };

    it('na criação manda nulo para o que está vazio', () => {
      const dto = dtoOpcoes(CAMPOS_OPCOES_REAVALIACAO, valor, true);
      expect(dto.regioesDor).toEqual(['LOMBAR']);
      expect(dto.regioesDorComplemento).toBe('Lado direito');
      expect(dto.achadosPosturais).toEqual([]);
      expect(dto.padraoRespiratorioOpcao).toBeNull();
      expect(dto.padraoRespiratorioComplemento).toBeNull();
      expect(dto.equilibrioOpcao).toBe('PRESERVADO');
      expect(dto.coordenacaoMotoraOpcao).toBeNull();
    });

    it('na edição manda "" para limpar seleção única e complemento (PUT parcial)', () => {
      const dto = dtoOpcoes(CAMPOS_OPCOES_REAVALIACAO, valor, false);
      expect(dto.padraoRespiratorioOpcao).toBe('');
      expect(dto.coordenacaoMotoraOpcao).toBe('');
      expect(dto.achadosPosturaisComplemento).toBe('');
      expect(dto.achadosPosturais).toEqual([]);
    });

    it('só manda os testes com resultado', () => {
      const dto = dtoOpcoes(CAMPOS_OPCOES_EXAME_FISICO, valor, true);
      expect(dto.testesFuncionais).toEqual([{ teste: 'SCHOBER', resultado: 'POSITIVO' }]);
    });

    it('só traz os campos do formulário', () => {
      const dto = dtoOpcoes(CAMPOS_OPCOES_ANAMNESE, {}, true);
      expect(Object.keys(dto).sort()).toEqual([
        'condicoesSaude', 'condicoesSaudeComplemento', 'nivelAtividadeFisicaComplemento', 'nivelAtividadeFisicaOpcao',
        'objetivosComplemento', 'objetivosOpcoes', 'regioesDor', 'regioesDorComplemento'
      ]);
      expect(dto.regioesDor).toEqual([]);
    });
  });

  describe('rótulos', () => {
    const regioes = campoTeste('regioesDor');

    it('usa o rótulo do catálogo e o valor cru fora dele', () => {
      expect(rotuloOpcao(regioes, 'CERVICAL')).toBe('Cervical');
      expect(rotuloOpcao(regioes, 'JOELHO_X')).toBe('JOELHO_X');
      expect(rotuloOpcao(null, 'CERVICAL')).toBe('CERVICAL');
    });

    it('marca como antiga a opção aposentada ou desconhecida', () => {
      expect(opcaoAntiga(regioes, 'CERVICAL')).toBeFalse();
      expect(opcaoAntiga(regioes, 'CEFALEIA_ANTIGA')).toBeTrue();
      expect(opcaoAntiga(regioes, 'JOELHO_X')).toBeTrue();
      expect(opcaoAntiga(null, 'CERVICAL')).toBeFalse();
    });

    it('acha o campo no catálogo', () => {
      expect(campoDoCatalogo(CATALOGO_OPCOES_TESTE, 'regioesDor')).toBe(regioes);
      expect(campoDoCatalogo(CATALOGO_OPCOES_TESTE, 'inexistente')).toBeNull();
      expect(campoDoCatalogo(null, 'regioesDor')).toBeNull();
    });
  });

  describe('resumirOpcoes', () => {
    it('monta os itens com rótulos, resultado e complemento, omitindo os vazios', () => {
      const itens = resumirOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_REAVALIACAO, {
        regioesDor: ['CERVICAL', 'CEFALEIA_ANTIGA'],
        achadosPosturais: [],
        equilibrioOpcao: 'PRESERVADO',
        padraoRespiratorioOpcao: null,
        padraoRespiratorioComplemento: 'Apneia leve',
        testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }]
      });

      expect(itens.map(i => i.campo)).toEqual(['regioesDor', 'padraoRespiratorioOpcao', 'equilibrioOpcao', 'testesFuncionais']);
      expect(itens[0].rotulo).toBe('Regiões de dor/queixa');
      expect(itens[0].valores).toEqual([
        { valor: 'CERVICAL', rotulo: 'Cervical', antiga: false },
        { valor: 'CEFALEIA_ANTIGA', rotulo: 'Cefaleia antiga', antiga: true }
      ]);
      expect(itens[1]).toEqual(jasmine.objectContaining({ valores: [], complemento: 'Apneia leve' }));
      expect(itens[3].valores[0]).toEqual({ valor: 'SCHOBER', rotulo: 'Schober', antiga: false, resultado: 'Positivo' });
    });

    it('sem catálogo usa os nomes crus', () => {
      const [item] = resumirOpcoes(null, CAMPOS_OPCOES_ANAMNESE, { regioesDor: ['CERVICAL'] });
      expect(item.rotulo).toBe('regioesDor');
      expect(item.valores[0].rotulo).toBe('CERVICAL');
    });

    it('registro antigo não gera itens', () => {
      expect(resumirOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_ANAMNESE, { queixaPrincipal: 'x' })).toEqual([]);
    });
  });

  describe('compararOpcoes', () => {
    it('acha itens incluídos e removidos na seleção múltipla', () => {
      const r = compararOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_REAVALIACAO,
        { regioesDor: ['CERVICAL', 'LOMBAR'] }, { regioesDor: ['LOMBAR', 'OMBRO_DIREITO'] });
      expect(r.comparados).toBe(1);
      expect(r.mudancas).toEqual([{
        campo: 'regioesDor', rotulo: 'Regiões de dor/queixa', incluidos: ['Ombro direito'], removidos: ['Cervical'],
        valorAlterado: null, resultadosAlterados: []
      }]);
    });

    it('acha a troca da seleção única, inclusive para e de "não informado"', () => {
      const r = compararOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_EXAME_FISICO,
        { equilibrioOpcao: 'ALTERACAO_GRAVE', padraoRespiratorioOpcao: null, coordenacaoMotoraOpcao: 'PRESERVADO' },
        { equilibrioOpcao: 'ALTERACAO_LEVE', padraoRespiratorioOpcao: 'MISTO', coordenacaoMotoraOpcao: null });
      expect(r.mudancas.map(m => [m.campo, m.valorAlterado])).toEqual([
        ['padraoRespiratorioOpcao', { de: NAO_INFORMADO, para: 'Misto' }],
        ['equilibrioOpcao', { de: 'Alteração grave', para: 'Alteração leve' }],
        ['coordenacaoMotoraOpcao', { de: 'Preservado', para: NAO_INFORMADO }]
      ]);
    });

    it('acha testes incluídos, removidos e com resultado trocado', () => {
      const r = compararOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_EXAME_FISICO,
        { testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }, { teste: 'ADAMS', resultado: 'NEGATIVO' }] },
        { testesFuncionais: [{ teste: 'SCHOBER', resultado: 'NEGATIVO' }, { teste: 'THOMAS', resultado: 'POSITIVO' }] });
      const [m] = r.mudancas;
      expect(m.incluidos).toEqual(['Thomas (positivo)']);
      expect(m.removidos).toEqual(['Adams (negativo)']);
      expect(m.resultadosAlterados).toEqual([{ teste: 'Schober', de: 'Positivo', para: 'Negativo' }]);
    });

    it('não aponta mudança quando é igual', () => {
      const registro = { achadosPosturais: ['ESCOLIOSE'], equilibrioOpcao: 'PRESERVADO' };
      const r = compararOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_EXAME_FISICO, registro, { ...registro });
      expect(r).toEqual({ comparados: 2, mudancas: [] });
    });

    it('ignora o campo que um dos registros não traz e o que está vazio nos dois', () => {
      const r = compararOpcoes(CATALOGO_OPCOES_TESTE, CAMPOS_OPCOES_REAVALIACAO,
        { achadosPosturais: [], equilibrioOpcao: null },
        { regioesDor: ['LOMBAR'], achadosPosturais: [], equilibrioOpcao: null });
      expect(r).toEqual({ comparados: 0, mudancas: [] });
    });

    it('aceita registros nulos e catálogo ausente', () => {
      expect(compararOpcoes(null, CAMPOS_OPCOES_REAVALIACAO, null, { regioesDor: ['LOMBAR'] }).comparados).toBe(0);
      const r = compararOpcoes(null, CAMPOS_OPCOES_REAVALIACAO, { regioesDor: [] }, { regioesDor: ['LOMBAR'] });
      expect(r.mudancas[0]).toEqual(jasmine.objectContaining({ rotulo: 'regioesDor', incluidos: ['LOMBAR'] }));
    });
  });

  describe('descreverMudanca', () => {
    it('junta as partes numa frase', () => {
      expect(descreverMudanca({
        campo: 'testesFuncionais', rotulo: 'Testes', incluidos: ['Thomas (positivo)'], removidos: ['Adams (negativo)'],
        valorAlterado: null, resultadosAlterados: [{ teste: 'Schober', de: 'Positivo', para: 'Negativo' }]
      })).toBe('incluído: Thomas (positivo); removido: Adams (negativo); Schober: de Positivo para Negativo');
      expect(descreverMudanca({
        campo: 'equilibrioOpcao', rotulo: 'Equilíbrio', incluidos: [], removidos: [],
        valorAlterado: { de: 'Preservado', para: 'Alteração leve' }, resultadosAlterados: []
      })).toBe('de Preservado para Alteração leve');
    });
  });
});
