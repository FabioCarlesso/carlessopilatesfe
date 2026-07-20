import { LANDMARKS_FRONTAIS, LANDMARKS_LATERAIS, LandmarkDTO, landmarksDaVista } from '../../core/models/avaliacao-postural';
import {
  HistoricoEdicao,
  RetanguloImagem,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  definirLandmark,
  distancia,
  landmarkMaisProximo,
  limitarZoom,
  montarPayloadRascunho,
  paraNormalizado,
  paraTela,
  proximoPendente
} from './simetrografo';

/** Imagem 400x800 desenhada a partir de (100, 50), sem zoom. */
const rectSemZoom: RetanguloImagem = { left: 100, top: 50, width: 400, height: 800 };

describe('simetrografo - conversão de coordenadas', () => {
  it('converte ponto de tela em coordenadas normalizadas', () => {
    expect(paraNormalizado({ x: 300, y: 450 }, rectSemZoom)).toEqual({ x: 0.5, y: 0.5 });
    expect(paraNormalizado({ x: 100, y: 50 }, rectSemZoom)).toEqual({ x: 0, y: 0 });
    expect(paraNormalizado({ x: 500, y: 850 }, rectSemZoom)).toEqual({ x: 1, y: 1 });
  });

  it('limita coordenadas fora da imagem a [0,1] (a API rejeita valores fora do intervalo)', () => {
    expect(paraNormalizado({ x: -200, y: -100 }, rectSemZoom)).toEqual({ x: 0, y: 0 });
    expect(paraNormalizado({ x: 9999, y: 9999 }, rectSemZoom)).toEqual({ x: 1, y: 1 });
  });

  it('mantém as coordenadas normalizadas sob zoom e pan', () => {
    // Mesma imagem com zoom 2x e deslocada: o rect na tela dobra e muda de origem.
    const rectComZoom: RetanguloImagem = { left: -300, top: -750, width: 800, height: 1600 };

    // O ponto central da anatomia continua sendo 0.5/0.5 nos dois cenários.
    const semZoom = paraNormalizado({ x: 300, y: 450 }, rectSemZoom);
    const comZoom = paraNormalizado({ x: 100, y: 50 }, rectComZoom);

    expect(comZoom).toEqual(semZoom);
  });

  it('retorna a origem quando a imagem ainda não tem dimensões', () => {
    expect(paraNormalizado({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('arredonda para 4 casas decimais', () => {
    expect(paraNormalizado({ x: 100 + 400 / 3, y: 50 }, rectSemZoom).x).toBe(0.3333);
  });

  it('converte normalizado de volta para tela (ida e volta preserva o ponto)', () => {
    const tela = paraTela({ x: 0.25, y: 0.75 }, rectSemZoom);
    expect(tela).toEqual({ x: 200, y: 650 });
    expect(paraNormalizado(tela, rectSemZoom)).toEqual({ x: 0.25, y: 0.75 });
  });

  it('calcula distância entre pontos de tela', () => {
    expect(distancia({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('simetrografo - limites de zoom', () => {
  it('mantém o zoom dentro da faixa suportada', () => {
    expect(limitarZoom(0.1)).toBe(ZOOM_MINIMO);
    expect(limitarZoom(99)).toBe(ZOOM_MAXIMO);
    expect(limitarZoom(2.5)).toBe(2.5);
  });
});

describe('simetrografo - sequência guiada', () => {
  it('usa pares esquerdo/direito nas vistas frontais e pontos únicos nas laterais', () => {
    expect(landmarksDaVista('FRENTE')).toBe(LANDMARKS_FRONTAIS);
    expect(landmarksDaVista('COSTAS')).toBe(LANDMARKS_FRONTAIS);
    expect(landmarksDaVista('LADO_DIREITO')).toBe(LANDMARKS_LATERAIS);
    expect(landmarksDaVista('LADO_ESQUERDO')).toBe(LANDMARKS_LATERAIS);
    expect(LANDMARKS_FRONTAIS.length).toBe(10);
    expect(LANDMARKS_LATERAIS.length).toBe(5);
  });

  it('indica o primeiro ponto quando nada foi marcado', () => {
    expect(proximoPendente(LANDMARKS_FRONTAIS, [])?.codigo).toBe('OLHO_ESQ');
  });

  it('retoma do próximo pendente ao reabrir um rascunho parcial', () => {
    const rascunho: LandmarkDTO[] = [
      { codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 },
      { codigo: 'OLHO_DIR', x: 0.55, y: 0.13 },
      { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.25 }
    ];
    expect(proximoPendente(LANDMARKS_FRONTAIS, rascunho)?.codigo).toBe('OMBRO_DIR');
  });

  it('não depende da ordem em que os pontos foram marcados', () => {
    const foraDeOrdem: LandmarkDTO[] = [
      { codigo: 'TORNOZELO_DIR', x: 0.6, y: 0.95 },
      { codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 }
    ];
    expect(proximoPendente(LANDMARKS_FRONTAIS, foraDeOrdem)?.codigo).toBe('OLHO_DIR');
  });

  it('retorna null quando todos os pontos da vista estão marcados', () => {
    const completos = LANDMARKS_LATERAIS.map(def => ({ codigo: def.codigo, x: 0.5, y: 0.5 }));
    expect(proximoPendente(LANDMARKS_LATERAIS, completos)).toBeNull();
  });
});

describe('simetrografo - seleção de ponto para arraste', () => {
  const landmarks: LandmarkDTO[] = [
    { codigo: 'OLHO_ESQ', x: 0.25, y: 0.25 },
    { codigo: 'OLHO_DIR', x: 0.75, y: 0.25 }
  ];

  it('encontra o ponto sob o ponteiro dentro da tolerância', () => {
    const sobreOlhoEsq = paraTela({ x: 0.25, y: 0.25 }, rectSemZoom);
    expect(landmarkMaisProximo(landmarks, sobreOlhoEsq, rectSemZoom, 20)?.codigo).toBe('OLHO_ESQ');
  });

  it('ignora pontos fora da tolerância', () => {
    expect(landmarkMaisProximo(landmarks, { x: 0, y: 0 }, rectSemZoom, 20)).toBeNull();
  });

  it('escolhe o mais próximo quando dois pontos competem', () => {
    const quaseNoOlhoDir = paraTela({ x: 0.73, y: 0.25 }, rectSemZoom);
    expect(landmarkMaisProximo(landmarks, quaseNoOlhoDir, rectSemZoom, 100)?.codigo).toBe('OLHO_DIR');
  });
});

describe('simetrografo - definição de pontos', () => {
  it('adiciona um ponto novo ao final', () => {
    const resultado = definirLandmark([], 'OLHO_ESQ', { x: 0.4, y: 0.1 });
    expect(resultado).toEqual([{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }]);
  });

  it('reposiciona um ponto existente sem duplicar nem reordenar', () => {
    const inicial: LandmarkDTO[] = [
      { codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 },
      { codigo: 'OLHO_DIR', x: 0.6, y: 0.1 }
    ];
    const resultado = definirLandmark(inicial, 'OLHO_ESQ', { x: 0.42, y: 0.11 });

    expect(resultado.length).toBe(2);
    expect(resultado[0]).toEqual({ codigo: 'OLHO_ESQ', x: 0.42, y: 0.11 });
    expect(resultado[1]).toEqual({ codigo: 'OLHO_DIR', x: 0.6, y: 0.1 });
  });

  it('não muta o array original', () => {
    const inicial: LandmarkDTO[] = [{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }];
    definirLandmark(inicial, 'OLHO_DIR', { x: 0.6, y: 0.1 });
    expect(inicial.length).toBe(1);
  });
});

describe('simetrografo - histórico de desfazer', () => {
  it('começa vazio', () => {
    const historico = new HistoricoEdicao();
    expect(historico.podeDesfazer).toBeFalse();
    expect(historico.desfazer()).toBeNull();
  });

  it('devolve o estado anterior na ordem inversa das ações', () => {
    const historico = new HistoricoEdicao();
    historico.empilhar({ landmarks: [], linhaPrumoX: null });
    historico.empilhar({ landmarks: [{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }], linhaPrumoX: 0.5 });

    expect(historico.desfazer()).toEqual({ landmarks: [{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }], linhaPrumoX: 0.5 });
    expect(historico.desfazer()).toEqual({ landmarks: [], linhaPrumoX: null });
    expect(historico.podeDesfazer).toBeFalse();
  });

  it('isola o snapshot de mutações posteriores no array original', () => {
    const historico = new HistoricoEdicao();
    const landmarks: LandmarkDTO[] = [{ codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 }];
    historico.empilhar({ landmarks, linhaPrumoX: null });

    landmarks.push({ codigo: 'OLHO_DIR', x: 0.6, y: 0.1 });

    expect(historico.desfazer()?.landmarks.length).toBe(1);
  });

  it('descarta os estados mais antigos ao exceder o limite', () => {
    const historico = new HistoricoEdicao(2);
    historico.empilhar({ landmarks: [], linhaPrumoX: 0.1 });
    historico.empilhar({ landmarks: [], linhaPrumoX: 0.2 });
    historico.empilhar({ landmarks: [], linhaPrumoX: 0.3 });

    expect(historico.tamanho).toBe(2);
    expect(historico.desfazer()?.linhaPrumoX).toBe(0.3);
    expect(historico.desfazer()?.linhaPrumoX).toBe(0.2);
  });

  it('limpa a pilha', () => {
    const historico = new HistoricoEdicao();
    historico.empilhar({ landmarks: [], linhaPrumoX: null });
    historico.limpar();
    expect(historico.podeDesfazer).toBeFalse();
  });
});

describe('simetrografo - payload do rascunho', () => {
  const estado = {
    landmarks: [{ codigo: 'OLHO_ESQ' as const, x: 0.45, y: 0.12 }],
    linhaPrumoX: 0.502
  };

  it('envia landmarks parciais e a linha de prumo', () => {
    expect(montarPayloadRascunho(estado, 0.75)).toEqual({
      landmarks: [{ codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 }],
      linhaPrumoX: 0.502,
      proporcaoImagem: 0.75
    });
  });

  it('nunca envia métricas — a API as recalcula a cada salvamento', () => {
    expect(montarPayloadRascunho(estado, 0.75) as Record<string, unknown>).not.toEqual(
      jasmine.objectContaining({ metricas: jasmine.anything() })
    );
  });

  it('omite a proporção quando a imagem ainda não foi medida', () => {
    const payload = montarPayloadRascunho(estado, null);
    expect('proporcaoImagem' in payload).toBeFalse();
  });

  it('omite proporção inválida', () => {
    expect('proporcaoImagem' in montarPayloadRascunho(estado, 0)).toBeFalse();
  });

  it('permite salvar rascunho sem nenhum ponto marcado', () => {
    expect(montarPayloadRascunho({ landmarks: [], linhaPrumoX: null }, 0.75)).toEqual({
      landmarks: [],
      linhaPrumoX: null,
      proporcaoImagem: 0.75
    });
  });
});
