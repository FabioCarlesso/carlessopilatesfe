import { Provider } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CampoOpcoesAvaliacao, CatalogoOpcoesAvaliacao, OpcaoAvaliacao } from '../app/core/models/opcoes-avaliacao';
import { OpcoesAvaliacaoService } from '../app/core/services/opcoes-avaliacao.service';

const op = (valor: string, rotulo: string, ativa = true): OpcaoAvaliacao => ({ valor, rotulo, ativa });

const graus = [op('PRESERVADO', 'Preservado'), op('ALTERACAO_LEVE', 'Alteração leve'), op('ALTERACAO_GRAVE', 'Alteração grave')];

function campo(
  nome: string, rotulo: string, selecao: 'UNICA' | 'MULTIPLA', opcoes: OpcaoAvaliacao[], complemento: string, comResultado = false
): CampoOpcoesAvaliacao {
  return { campo: nome, rotulo, selecao, comResultado, opcoes, campoComplemento: complemento };
}

/** Recorte do catálogo da API para os specs, com uma opção aposentada em cada tipo de seleção. */
export const CATALOGO_OPCOES_TESTE: CatalogoOpcoesAvaliacao = {
  campos: [
    campo('regioesDor', 'Regiões de dor/queixa', 'MULTIPLA',
      [op('CERVICAL', 'Cervical'), op('LOMBAR', 'Lombar'), op('OMBRO_DIREITO', 'Ombro direito'), op('CEFALEIA_ANTIGA', 'Cefaleia antiga', false)],
      'regioesDorComplemento'),
    campo('condicoesSaude', 'Condições de saúde', 'MULTIPLA',
      [op('HERNIA_DE_DISCO', 'Hérnia de disco'), op('ESCOLIOSE', 'Escoliose')], 'condicoesSaudeComplemento'),
    campo('nivelAtividadeFisicaOpcao', 'Nível de atividade física', 'UNICA',
      [op('SEDENTARIO', 'Sedentário'), op('ATIVO', 'Ativo'), op('LEVE', 'Leve', false)], 'nivelAtividadeFisicaComplemento'),
    campo('objetivosOpcoes', 'Objetivos', 'MULTIPLA',
      [op('ALIVIO_DE_DOR', 'Alívio de dor'), op('POSTURA', 'Postura')], 'objetivosComplemento'),
    campo('achadosPosturais', 'Achados posturais', 'MULTIPLA',
      [op('HIPERCIFOSE_TORACICA', 'Hipercifose torácica'), op('ESCOLIOSE', 'Escoliose'), op('PE_PLANO', 'Pé plano')],
      'achadosPosturaisComplemento'),
    campo('padraoRespiratorioOpcao', 'Padrão respiratório', 'UNICA',
      [op('DIAFRAGMATICO', 'Diafragmático'), op('MISTO', 'Misto')], 'padraoRespiratorioComplemento'),
    campo('equilibrioOpcao', 'Equilíbrio', 'UNICA', graus, 'equilibrioComplemento'),
    campo('coordenacaoMotoraOpcao', 'Coordenação motora', 'UNICA', graus, 'coordenacaoMotoraComplemento'),
    campo('testesFuncionais', 'Testes funcionais', 'MULTIPLA',
      [op('SCHOBER', 'Schober'), op('ADAMS', 'Adams'), op('THOMAS', 'Thomas'), op('LASEGUE_ANTIGO', 'Lasègue antigo', false)],
      'testesFuncionaisComplemento', true)
  ]
};

export function campoTeste(nome: string): CampoOpcoesAvaliacao {
  const encontrado = CATALOGO_OPCOES_TESTE.campos.find(c => c.campo === nome);
  if (!encontrado) throw new Error(`Campo ${nome} fora do catálogo de teste`);
  return encontrado;
}

/** Substitui o serviço do catálogo por um que responde na hora, sem HTTP. */
export function provideOpcoesAvaliacaoFake(
  catalogo: () => Observable<CatalogoOpcoesAvaliacao> = () => of(CATALOGO_OPCOES_TESTE)
): Provider {
  return { provide: OpcoesAvaliacaoService, useValue: { catalogo } };
}
