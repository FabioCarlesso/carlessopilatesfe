import { LandmarkDTO } from '../../core/models/avaliacao-postural';
import {
  LIMIAR_ASSIMETRIA_GRAUS,
  PARES_REFERENCIA,
  anguloEntre,
  calcularMetricas,
  desvioPrumo,
  ladoMaisBaixo,
  montarMedidas
} from './metricas-posturais';

const olhoEsq = (x: number, y: number): LandmarkDTO => ({ codigo: 'OLHO_ESQ', x, y });
const olhoDir = (x: number, y: number): LandmarkDTO => ({ codigo: 'OLHO_DIR', x, y });
const ombroEsq = (x: number, y: number): LandmarkDTO => ({ codigo: 'OMBRO_ESQ', x, y });
const ombroDir = (x: number, y: number): LandmarkDTO => ({ codigo: 'OMBRO_DIR', x, y });

describe('anguloEntre', () => {
  it('devolve 0° para pontos nivelados', () => {
    expect(anguloEntre(olhoEsq(0.4, 0.2), olhoDir(0.6, 0.2), 0.75)).toBe(0);
  });

  it('aplica a proporção da foto antes do ângulo, senão os graus saem distorcidos', () => {
    const a = olhoEsq(0.4, 0.2);
    const b = olhoDir(0.6, 0.3);

    // Δx normalizado = 0,2 e Δy = 0,1. Em foto quadrada, atan(0,1/0,2) = 26,57°;
    // com proporção 0,5 o Δx real vira 0,1 e o ângulo sobe para 45°.
    expect(anguloEntre(a, b, null)).toBe(26.57);
    expect(anguloEntre(a, b, 0.5)).toBe(45);
  });

  it('normaliza para (-90, 90]: a ordem de marcação não muda a reta', () => {
    const a = olhoEsq(0.6, 0.3);
    const b = olhoDir(0.4, 0.2);

    // Mesmo par do teste anterior com os lados invertidos na imagem.
    expect(anguloEntre(a, b, 0.5)).toBe(45);
  });

  it('devolve null quando falta um dos pontos ou eles coincidem', () => {
    expect(anguloEntre(undefined, olhoDir(0.6, 0.2), 0.75)).toBeNull();
    expect(anguloEntre(olhoEsq(0.4, 0.2), undefined, 0.75)).toBeNull();
    expect(anguloEntre(olhoEsq(0.5, 0.2), olhoDir(0.5, 0.2), 0.75)).toBeNull();
  });

  it('reproduz os valores calculados pela API para a mesma marcação', () => {
    // Caso conferido contra o backend: 7,59° e 6,34° com proporção 0,75.
    expect(anguloEntre(olhoEsq(0.45, 0.12), olhoDir(0.55, 0.13), 0.75)).toBe(7.59);
    expect(anguloEntre(ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27), 0.75)).toBe(6.34);
  });
});

describe('desvioPrumo', () => {
  it('usa o ponto médio entre os acrômios nas vistas frontais', () => {
    const landmarks = [ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27)];

    // Ponto médio 0,5 contra prumo em 0,502 — valor conferido contra a API.
    expect(desvioPrumo('FRENTE', landmarks, 0.502)).toBe(0.002);
  });

  it('usa o próprio acrômio nas vistas laterais', () => {
    const landmarks: LandmarkDTO[] = [{ codigo: 'OMBRO', x: 0.55, y: 0.25 }];

    expect(desvioPrumo('LADO_DIREITO', landmarks, 0.5)).toBe(0.05);
  });

  it('devolve null sem prumo ou sem os pontos de referência', () => {
    expect(desvioPrumo('FRENTE', [ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27)], null)).toBeNull();
    expect(desvioPrumo('FRENTE', [ombroEsq(0.38, 0.25)], 0.5)).toBeNull();
    expect(desvioPrumo('LADO_DIREITO', [], 0.5)).toBeNull();
  });
});

describe('calcularMetricas', () => {
  it('deixa como pendentes os pares ainda não marcados', () => {
    const metricas = calcularMetricas('FRENTE', [olhoEsq(0.45, 0.12), olhoDir(0.55, 0.13)], 0.5, 0.75);

    expect(metricas.inclinacaoCabecaGraus).toBe(7.59);
    expect(metricas.desnivelOmbrosGraus).toBeNull();
    expect(metricas.desnivelQuadrilGraus).toBeNull();
    expect(metricas.desnivelJoelhosGraus).toBeNull();
  });

  it('só converte o desvio para centímetros quando há calibração', () => {
    const landmarks = [ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27)];

    expect(calcularMetricas('FRENTE', landmarks, 0.45, 0.75).desvioPrumoCm).toBeNull();
    expect(calcularMetricas('FRENTE', landmarks, 0.45, 0.75, 180).desvioPrumoCm).toBe(9);
  });

  it('devolve tudo nulo sem pontos marcados', () => {
    const metricas = calcularMetricas('FRENTE', [], 0.5, 0.75);

    expect(Object.values(metricas).every(valor => valor === null)).toBeTrue();
  });
});

describe('ladoMaisBaixo', () => {
  const parOmbros = PARES_REFERENCIA[1];

  it('aponta o lado com maior y, que é o mais baixo na foto', () => {
    expect(ladoMaisBaixo([ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27)], parOmbros)).toBe('DIREITA');
    expect(ladoMaisBaixo([ombroEsq(0.38, 0.29), ombroDir(0.62, 0.27)], parOmbros)).toBe('ESQUERDA');
  });

  it('independe de qual ponto ficou à esquerda na imagem', () => {
    // Vista espelhada: o ombro direito aparece à esquerda da foto, mas continua
    // sendo o mais baixo porque tem o maior y.
    expect(ladoMaisBaixo([ombroEsq(0.62, 0.25), ombroDir(0.38, 0.27)], parOmbros)).toBe('DIREITA');
  });

  it('devolve null com pontos nivelados ou incompletos', () => {
    expect(ladoMaisBaixo([ombroEsq(0.38, 0.25), ombroDir(0.62, 0.25)], parOmbros)).toBeNull();
    expect(ladoMaisBaixo([ombroEsq(0.38, 0.25)], parOmbros)).toBeNull();
  });
});

describe('montarMedidas', () => {
  const landmarks = [ombroEsq(0.38, 0.25), ombroDir(0.62, 0.27)];

  function medida(label: string, metricas: Parameters<typeof montarMedidas>[0]) {
    return montarMedidas(metricas, landmarks).find(m => m.label === label)!;
  }

  const semMetricas = {
    inclinacaoCabecaGraus: null,
    desnivelOmbrosGraus: null,
    desnivelQuadrilGraus: null,
    desnivelJoelhosGraus: null,
    desvioPrumoNormalizado: null,
    desvioPrumoCm: null
  };

  it('formata o valor em graus com a direção do desnível', () => {
    const ombros = medida('Ombros', { ...semMetricas, desnivelOmbrosGraus: 6.34 });

    expect(ombros.texto).toBe('6,3°');
    expect(ombros.direcao).toBe('dir. baixo');
  });

  it('classifica como assimétrico a partir do limiar, e não abaixo dele', () => {
    expect(medida('Ombros', { ...semMetricas, desnivelOmbrosGraus: 1.9 }).assimetrica).toBeFalse();
    expect(medida('Ombros', { ...semMetricas, desnivelOmbrosGraus: 2 }).assimetrica).toBeTrue();
    expect(LIMIAR_ASSIMETRIA_GRAUS).toBe(2);
  });

  it('classifica pelo módulo: o sinal só indica qual lado está mais baixo', () => {
    expect(medida('Ombros', { ...semMetricas, desnivelOmbrosGraus: -3.5 }).texto).toBe('3,5°');
    expect(medida('Ombros', { ...semMetricas, desnivelOmbrosGraus: -3.5 }).assimetrica).toBeTrue();
  });

  it('marca como pendente a medida cujo par ainda não foi marcado', () => {
    const joelhos = medida('Joelhos', semMetricas);

    expect(joelhos.texto).toBeNull();
    expect(joelhos.assimetrica).toBeFalse();
  });

  it('mostra o desvio de prumo em cm apenas quando há calibração', () => {
    const semCalibracao = medida('Desvio do prumo', { ...semMetricas, desvioPrumoNormalizado: 0.052 });
    const comCalibracao = medida('Desvio do prumo', {
      ...semMetricas,
      desvioPrumoNormalizado: 0.052,
      desvioPrumoCm: 9.36
    });

    expect(semCalibracao.texto).toBe('0,052');
    expect(semCalibracao.texto).not.toContain('cm');
    expect(comCalibracao.texto).toBe('9,4 cm');
  });

  it('mantém as 4 casas do valor normalizado que a API devolve', () => {
    expect(medida('Desvio do prumo', { ...semMetricas, desvioPrumoNormalizado: 0.0025 }).texto).toBe('0,0025');
  });

  it('trata métricas ausentes como pendências, sem quebrar', () => {
    expect(montarMedidas(null, []).every(m => m.texto === null)).toBeTrue();
  });
});
