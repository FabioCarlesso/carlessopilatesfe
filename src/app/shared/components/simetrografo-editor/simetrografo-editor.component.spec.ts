import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimetrografoEditorComponent } from './simetrografo-editor.component';
import { LandmarkDTO } from '../../../core/models/avaliacao-postural';
import { EstadoMarcacao } from '../../utils/simetrografo';

/** Imagem 400x800 posicionada em (100, 50) — o mesmo retângulo usado nos cálculos abaixo. */
const RECT_IMAGEM = { left: 100, top: 50, width: 400, height: 800 };

function pointerEvent(tipo: string, x: number, y: number, pointerId = 1): PointerEvent {
  return new PointerEvent(tipo, { pointerId, clientX: x, clientY: y, bubbles: true });
}

describe('SimetrografoEditorComponent', () => {
  let fixture: ComponentFixture<SimetrografoEditorComponent>;
  let component: SimetrografoEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimetrografoEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SimetrografoEditorComponent);
    component = fixture.componentInstance;
    component.fotoUrl = 'blob:foto-fake';
    component.vista = 'FRENTE';
    fixture.detectChanges();

    // Simula a foto já carregada e medida, sem depender do decode real da imagem.
    component.larguraNatural = 1080;
    component.alturaNatural = 1440;
    spyOn(
      component as unknown as { rectImagem: () => typeof RECT_IMAGEM },
      'rectImagem'
    ).and.returnValue(RECT_IMAGEM);

    // A imagem não decodifica no headless: fixa as medidas de layout de que o
    // limite de deslocamento depende (viewport 400x800, foto ocupando-o inteiro).
    medir(component.viewportRef!.nativeElement, 'clientWidth', 400);
    medir(component.viewportRef!.nativeElement, 'clientHeight', 800);
    medir(component.fotoRef!.nativeElement, 'offsetWidth', 400);
    medir(component.fotoRef!.nativeElement, 'offsetHeight', 800);
  });

  function medir(el: Element, propriedade: string, valor: number): void {
    Object.defineProperty(el, propriedade, { value: valor, configurable: true });
  }

  /** Posição vertical, em px de tela, da alça de arraste do prumo. */
  function alcaTelaY(): number {
    return RECT_IMAGEM.top + (component.prumoAlcaY / component.alturaNatural) * RECT_IMAGEM.height;
  }

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('marcação guiada', () => {
    it('instrui qual ponto tocar em seguida', () => {
      expect(component.instrucao).toBe('Toque no olho esquerdo na foto');
    });

    it('marca o ponto indicado na posição tocada e avança para o próximo', () => {
      const emitido: EstadoMarcacao[] = [];
      component.marcacaoAlterada.subscribe(e => emitido.push(e));

      // Toque no centro da imagem, sem deslocamento: marca o próximo pendente.
      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerUp(pointerEvent('pointerup', 300, 450));

      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }]);
      expect(component.proximo?.codigo).toBe('OLHO_DIR');
      expect(emitido.length).toBe(1);
    });

    it('não marca quando o toque cai fora da imagem', () => {
      component.onPointerDown(pointerEvent('pointerdown', 10, 10));
      component.onPointerUp(pointerEvent('pointerup', 10, 10));

      expect(component.pontos).toEqual([]);
    });

    it('trata arraste longo como pan, sem marcar ponto', () => {
      component.zoom = 2;

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 220, 450));
      component.onPointerUp(pointerEvent('pointerup', 220, 450));

      expect(component.pontos).toEqual([]);
      expect(component.panX).toBe(-80);
    });

    it('anuncia a conclusão quando todos os pontos da vista foram marcados', () => {
      component.vista = 'LADO_DIREITO';
      component.pontos = component.sequencia.map(def => ({ codigo: def.codigo, x: 0.5, y: 0.5 }));

      expect(component.proximo).toBeNull();
      expect(component.instrucao).toBe('Todos os pontos desta vista foram marcados.');
    });
  });

  describe('correção por arraste', () => {
    beforeEach(() => {
      component.pontos = [{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }];
    });

    it('reposiciona o ponto sob o ponteiro sem criar duplicata', () => {
      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 340, 530));
      component.onPointerUp(pointerEvent('pointerup', 340, 530));

      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.6, y: 0.6 }]);
    });

    it('não deixa a linha de prumo capturar toques sobre a foto', () => {
      component.pontos = [];
      component.prumoX = 0.5;

      // x=300 fica exatamente sobre a linha, mas longe da alça: marca o ponto.
      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerUp(pointerEvent('pointerup', 300, 450));

      expect(component.prumoX).toBe(0.5);
      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }]);
    });

    it('move o prumo ao arrastar pela alça na base da foto', () => {
      component.pontos = [];
      component.prumoX = 0.5;

      const alcaY = alcaTelaY();
      component.onPointerDown(pointerEvent('pointerdown', 300, alcaY));
      component.onPointerMove(pointerEvent('pointermove', 200, alcaY));

      expect(component.prumoX).toBe(0.25);
      expect(component.pontos).toEqual([]);
    });
  });

  describe('desfazer', () => {
    it('reverte a última marcação', () => {
      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerUp(pointerEvent('pointerup', 300, 450));
      expect(component.pontos.length).toBe(1);

      component.desfazer();

      expect(component.pontos).toEqual([]);
      expect(component.podeDesfazer).toBeFalse();
    });

    it('reverte um arraste devolvendo o ponto à posição anterior', () => {
      component.pontos = [{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }];

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 340, 530));
      component.onPointerUp(pointerEvent('pointerup', 340, 530));

      component.desfazer();

      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }]);
    });

    it('reverte o ajuste da linha de prumo', () => {
      component.prumoX = 0.5;
      const alcaY = alcaTelaY();

      component.onPointerDown(pointerEvent('pointerdown', 300, alcaY));
      component.onPointerMove(pointerEvent('pointermove', 200, alcaY));
      component.onPointerUp(pointerEvent('pointerup', 200, alcaY));
      expect(component.prumoX).toBe(0.25);

      component.desfazer();

      expect(component.prumoX).toBe(0.5);
    });

    it('não faz nada quando não há histórico', () => {
      expect(component.podeDesfazer).toBeFalse();
      component.desfazer();
      expect(component.pontos).toEqual([]);
    });
  });

  describe('zoom', () => {
    it('respeita os limites de aproximação', () => {
      component.zoom = component.zoomMaximo;
      component.aproximar();
      expect(component.zoom).toBe(component.zoomMaximo);

      component.zoom = component.zoomMinimo;
      component.afastar();
      expect(component.zoom).toBe(component.zoomMinimo);
    });

    it('reenquadra zerando zoom e deslocamento', () => {
      component.zoom = 3;
      component.panX = 120;
      component.panY = -80;

      component.reenquadrar();

      expect(component.zoom).toBe(component.zoomMinimo);
      expect(component.panX).toBe(0);
      expect(component.panY).toBe(0);
    });

    it('mantém as coordenadas normalizadas corretas depois do zoom', () => {
      component.zoom = 3;
      // O rect espelha a imagem ampliada 3x: o mesmo ponto anatômico continua em 0.5/0.5.
      (component as unknown as { rectImagem: () => unknown }).rectImagem = () => ({
        left: -100,
        top: -350,
        width: 1200,
        height: 2400
      });

      component.onPointerDown(pointerEvent('pointerdown', 500, 850));
      component.onPointerUp(pointerEvent('pointerup', 500, 850));

      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }]);
    });
  });

  describe('pinça (dois dedos)', () => {
    /** Encosta dois dedos separados por `separacao` px na vertical. */
    function encostarDoisDedos(separacao: number): void {
      component.onPointerDown(pointerEvent('pointerdown', 300, 450, 1));
      component.onPointerDown(pointerEvent('pointerdown', 300, 450 + separacao, 2));
    }

    it('amplia proporcionalmente ao afastamento dos dedos', () => {
      encostarDoisDedos(100);
      component.onPointerMove(pointerEvent('pointermove', 300, 650, 2));

      expect(component.zoom).toBe(2);
    });

    it('reduz ao aproximar os dedos', () => {
      component.zoom = 4;
      encostarDoisDedos(200);
      component.onPointerMove(pointerEvent('pointermove', 300, 550, 2));

      expect(component.zoom).toBe(2);
    });

    it('respeita os limites de zoom', () => {
      encostarDoisDedos(10);
      component.onPointerMove(pointerEvent('pointermove', 300, 5000, 2));

      expect(component.zoom).toBe(component.zoomMaximo);
    });

    it('não marca ponto durante a pinça', () => {
      encostarDoisDedos(100);
      component.onPointerMove(pointerEvent('pointermove', 300, 650, 2));
      component.onPointerUp(pointerEvent('pointerup', 300, 650, 2));
      component.onPointerUp(pointerEvent('pointerup', 300, 450, 1));

      expect(component.pontos).toEqual([]);
    });

    it('segue como pan quando um dos dedos é levantado, sem saltar a imagem', () => {
      component.zoom = 2;
      encostarDoisDedos(100);
      component.onPointerUp(pointerEvent('pointerup', 300, 550, 2));

      const panAntes = component.panX;
      component.onPointerMove(pointerEvent('pointermove', 260, 450, 1));

      expect(component.panX).toBe(panAntes - 40);
    });
  });

  describe('limite de deslocamento', () => {
    it('não deixa arrastar a foto para fora da área visível', () => {
      component.zoom = 2;

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 9999, 9999));

      expect(component.panX).toBe(0);
      expect(component.panY).toBe(0);
    });

    it('trava o arraste na borda oposta da foto ampliada', () => {
      component.zoom = 2;

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', -9999, -9999));

      // Foto de 800x1600 num viewport de 400x800: sobra -400 / -800.
      expect(component.panX).toBe(-400);
      expect(component.panY).toBe(-800);
    });
  });

  describe('grade e prumo', () => {
    it('alterna a visibilidade da grade e do prumo', () => {
      expect(component.gradeVisivel).toBeTrue();
      component.alternarGrade();
      expect(component.gradeVisivel).toBeFalse();

      expect(component.prumoVisivel).toBeTrue();
      component.alternarPrumo();
      expect(component.prumoVisivel).toBeFalse();
    });

    it('desenha a grade com quadrados de espaçamento igual nos dois eixos', () => {
      component.divisoesGrade = 10;

      expect(component.espacamentoGrade).toBe(108);
      expect(component.linhasVerticais.length).toBe(9);
      // 1440 / 108 = 13,3 → 13 linhas horizontais internas.
      expect(component.linhasHorizontais.length).toBe(13);
    });

    it('ajusta o espaçamento pelo controle de divisões', () => {
      component.ajustarDivisoes({ target: { value: '20' } } as unknown as Event);

      expect(component.divisoesGrade).toBe(20);
      expect(component.espacamentoGrade).toBe(54);
    });
  });

  describe('modo somente leitura (análise concluída)', () => {
    beforeEach(() => {
      component.somenteLeitura = true;
    });

    it('não marca pontos ao tocar na foto', () => {
      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerUp(pointerEvent('pointerup', 300, 450));

      expect(component.pontos).toEqual([]);
    });

    it('não reposiciona pontos existentes', () => {
      component.pontos = [{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }];

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 340, 530));

      expect(component.pontos).toEqual([{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }]);
    });

    it('não oferece desfazer nem refazer marcação', () => {
      component.pontos = [{ codigo: 'OLHO_ESQ', x: 0.5, y: 0.5 }];
      component.remarcar('OLHO_ESQ');

      expect(component.pontos.length).toBe(1);
      expect(component.podeDesfazer).toBeFalse();
    });

    it('continua permitindo navegar pela foto com pan', () => {
      component.zoom = 2;

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerMove(pointerEvent('pointermove', 250, 400));

      expect(component.panX).toBe(-50);
      expect(component.panY).toBe(-50);
    });

    it('avisa que a marcação está bloqueada', () => {
      expect(component.instrucao).toContain('somente leitura');
    });
  });

  describe('restauração de rascunho', () => {
    it('carrega pontos e prumo salvos e retoma do próximo pendente', () => {
      const salvos: LandmarkDTO[] = [
        { codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 },
        { codigo: 'OLHO_DIR', x: 0.55, y: 0.13 }
      ];
      component.landmarks = salvos;
      component.linhaPrumoX = 0.502;
      component.ngOnChanges({
        landmarks: { currentValue: salvos, previousValue: [], firstChange: false, isFirstChange: () => false },
        linhaPrumoX: { currentValue: 0.502, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.pontos).toEqual(salvos);
      expect(component.prumoX).toBe(0.502);
      expect(component.proximo?.codigo).toBe('OMBRO_ESQ');
      expect(component.totalMarcados).toBe(2);
    });

    it('centraliza o prumo quando a análise ainda não tem posição salva', () => {
      component.linhaPrumoX = null;
      component.ngOnChanges({
        linhaPrumoX: { currentValue: null, previousValue: 0.3, firstChange: false, isFirstChange: () => false }
      });

      expect(component.prumoX).toBe(0.5);
    });

    it('não altera o array recebido do componente pai ao marcar', () => {
      const salvos: LandmarkDTO[] = [{ codigo: 'OLHO_ESQ', x: 0.45, y: 0.12 }];
      component.landmarks = salvos;
      component.ngOnChanges({
        landmarks: { currentValue: salvos, previousValue: [], firstChange: false, isFirstChange: () => false }
      });

      component.onPointerDown(pointerEvent('pointerdown', 300, 450));
      component.onPointerUp(pointerEvent('pointerup', 300, 450));

      expect(salvos.length).toBe(1);
      expect(component.pontos.length).toBe(2);
    });
  });

  describe('refazer marcação pelo checklist', () => {
    it('remove o ponto e volta a indicá-lo como próximo', () => {
      component.pontos = [
        { codigo: 'OLHO_ESQ', x: 0.4, y: 0.1 },
        { codigo: 'OLHO_DIR', x: 0.6, y: 0.1 }
      ];

      component.remarcar('OLHO_ESQ');

      expect(component.estaMarcado('OLHO_ESQ')).toBeFalse();
      expect(component.proximo?.codigo).toBe('OLHO_ESQ');
      expect(component.podeDesfazer).toBeTrue();
    });
  });

  describe('proporção da imagem', () => {
    it('deriva largura/altura da imagem natural para a API calcular os ângulos', () => {
      expect(component.proporcaoImagem).toBe(0.75);
    });

    it('retorna null enquanto a foto não foi medida', () => {
      component.alturaNatural = 0;
      expect(component.proporcaoImagem).toBeNull();
    });
  });

  describe('linhas de referência', () => {
    it('desenha a linha apenas quando os dois pontos do par estão marcados', () => {
      component.pontos = [{ codigo: 'OMBRO_ESQ', x: 0.4, y: 0.25 }];
      expect(component.linhasReferencia.length).toBe(0);

      component.pontos = [...component.pontos, { codigo: 'OMBRO_DIR', x: 0.6, y: 0.3 }];

      expect(component.linhasReferencia).toEqual([
        { x1: 0.4 * 1080, y1: 0.25 * 1440, x2: 0.6 * 1080, y2: 0.3 * 1440 }
      ]);
    });

    it('acompanha a correção de um ponto por arraste', () => {
      component.pontos = [
        { codigo: 'OMBRO_ESQ', x: 0.4, y: 0.25 },
        { codigo: 'OMBRO_DIR', x: 0.6, y: 0.3 }
      ];

      component.onPointerDown(pointerEvent('pointerdown', 340, 290));
      component.onPointerMove(pointerEvent('pointermove', 340, 370));

      expect(component.linhasReferencia[0].y2).toBeCloseTo(0.4 * 1440, 5);
    });

    it('não desenha linhas nas vistas laterais, que têm um ponto por região', () => {
      component.vista = 'LADO_DIREITO';
      component.pontos = [
        { codigo: 'OMBRO', x: 0.5, y: 0.25 },
        { codigo: 'QUADRIL', x: 0.52, y: 0.5 }
      ];

      expect(component.linhasReferencia.length).toBe(0);
    });
  });
});
