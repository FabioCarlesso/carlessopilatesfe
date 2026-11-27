import { HttpErrorResponse } from '@angular/common/http';
import { VistaCorporal } from '../../core/models/ponto-dor';
import {
  coordenadaNormalizada,
  diametroPercentual,
  faixaIntensidade,
  limitarCoordenada,
  mensagemErroPontosDor,
  raioPonto,
  regiaoAproximada,
  urlDesenho
} from './mapa-corporal';

/** Ponto a partir das coordenadas do `viewBox` 240×520, como no gerador do desenho. */
function em(vista: VistaCorporal, x: number, y: number) {
  return { vista, x: x / 240, y: y / 520 };
}

describe('mapa-corporal utils', () => {
  it('should build the drawing path from the version and the view', () => {
    expect(urlDesenho(1, 'FRENTE')).toBe('mapa-corporal/v1/frente.svg');
    expect(urlDesenho(2, 'LATERAL_ESQUERDA')).toBe('mapa-corporal/v2/lateral-esquerda.svg');
  });

  it('should clamp and round the normalized coordinate', () => {
    expect(limitarCoordenada(-0.2)).toBe(0);
    expect(limitarCoordenada(1.3)).toBe(1);
    expect(limitarCoordenada(0.123456)).toBe(0.1235);
  });

  it('should convert a click into a coordinate relative to the drawing, whatever its size', () => {
    expect(coordenadaNormalizada(150, 360, { left: 100, top: 100, width: 100, height: 520 })).toEqual({ x: 0.5, y: 0.5 });
    expect(coordenadaNormalizada(130, 152, { left: 100, top: 100, width: 200, height: 433 })).toEqual({ x: 0.15, y: 0.1201 });
    expect(coordenadaNormalizada(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });

  it('should grow the dot with the intensity', () => {
    expect(raioPonto(0)).toBe(6);
    expect(raioPonto(10)).toBe(12);
    expect(raioPonto(null)).toBe(8);
    expect(diametroPercentual(10)).toBe(10);
  });

  it('should group the intensity in bands', () => {
    expect(faixaIntensidade(null)).toBe('sem');
    expect(faixaIntensidade(3)).toBe('leve');
    expect(faixaIntensidade(6)).toBe('moderada');
    expect(faixaIntensidade(7)).toBe('intensa');
  });

  describe('regiaoAproximada', () => {
    it('should name the head, the neck and the midline without a side', () => {
      expect(regiaoAproximada(em('FRENTE', 120, 50))).toBe('Cabeça');
      expect(regiaoAproximada(em('COSTAS', 120, 90))).toBe('Pescoço');
      expect(regiaoAproximada(em('FRENTE', 120, 230))).toBe('Abdome');
    });

    it('should mirror the side between the front and the back views', () => {
      // Na frente, a metade esquerda da imagem é o lado direito do paciente.
      expect(regiaoAproximada(em('FRENTE', 90, 230))).toBe('Abdome, lado direito');
      expect(regiaoAproximada(em('COSTAS', 90, 230))).toBe('Região lombar, lado esquerdo');
      expect(regiaoAproximada(em('COSTAS', 150, 170))).toBe('Região torácica, lado direito');
    });

    it('should recognize the upper limbs by the distance from the axis', () => {
      expect(regiaoAproximada(em('FRENTE', 158, 112))).toBe('Ombro, lado esquerdo');
      expect(regiaoAproximada(em('FRENTE', 82, 160))).toBe('Braço, lado direito');
      expect(regiaoAproximada(em('COSTAS', 180, 230))).toBe('Antebraço, lado direito');
      expect(regiaoAproximada(em('FRENTE', 45, 300))).toBe('Mão, lado direito');
      expect(regiaoAproximada(em('COSTAS', 120, 115))).toBe('Trapézio');
    });

    it('should name the lower limbs by height', () => {
      expect(regiaoAproximada(em('FRENTE', 105, 280))).toBe('Quadril, lado direito');
      expect(regiaoAproximada(em('COSTAS', 105, 280))).toBe('Glúteo, lado esquerdo');
      expect(regiaoAproximada(em('FRENTE', 136, 330))).toBe('Coxa, lado esquerdo');
      expect(regiaoAproximada(em('FRENTE', 136, 390))).toBe('Joelho, lado esquerdo');
      expect(regiaoAproximada(em('FRENTE', 136, 430))).toBe('Perna, lado esquerdo');
      expect(regiaoAproximada(em('COSTAS', 136, 430))).toBe('Panturrilha, lado direito');
      expect(regiaoAproximada(em('COSTAS', 136, 480))).toBe('Pé, lado direito');
    });

    it('should split the trunk into front and back in the side views', () => {
      expect(regiaoAproximada(em('LATERAL_DIREITA', 145, 150))).toBe('Tórax');
      expect(regiaoAproximada(em('LATERAL_DIREITA', 92, 240))).toBe('Região lombar');
      expect(regiaoAproximada(em('LATERAL_ESQUERDA', 148, 240))).toBe('Região lombar');
      expect(regiaoAproximada(em('LATERAL_ESQUERDA', 95, 120))).toBe('Tórax');
      expect(regiaoAproximada(em('LATERAL_ESQUERDA', 140, 280))).toBe('Glúteo');
      expect(regiaoAproximada(em('LATERAL_DIREITA', 120, 430))).toBe('Perna');
    });
  });

  describe('mensagemErroPontosDor', () => {
    it('should show the API detail of a 400 and of a 403', () => {
      expect(mensagemErroPontosDor(new HttpErrorResponse({ status: 400, error: { detail: 'Máximo de 50 pontos.' } }), 'x'))
        .toBe('Máximo de 50 pontos.');
      expect(mensagemErroPontosDor(new HttpErrorResponse({ status: 403, error: { detail: 'Sem acesso.' } }), 'x'))
        .toBe('Sem acesso.');
    });

    it('should fall back to the default handling otherwise', () => {
      expect(mensagemErroPontosDor(new HttpErrorResponse({ status: 500 }), 'Falhou.')).toBe('Falhou.');
      expect(mensagemErroPontosDor(new HttpErrorResponse({ status: 403, error: null }), 'Falhou.'))
        .toContain('permissão');
      expect(mensagemErroPontosDor(new Error('x'), 'Falhou.')).toBe('Falhou.');
    });
  });
});
