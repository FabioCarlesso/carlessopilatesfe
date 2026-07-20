import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandmarkDTO, MetricasPosturaisDTO } from '../../../core/models/avaliacao-postural';
import { PainelMedidasPosturaisComponent } from './painel-medidas-posturais.component';

const semMetricas: MetricasPosturaisDTO = {
  inclinacaoCabecaGraus: null,
  desnivelOmbrosGraus: null,
  desnivelQuadrilGraus: null,
  desnivelJoelhosGraus: null,
  desvioPrumoNormalizado: null,
  desvioPrumoCm: null
};

describe('PainelMedidasPosturaisComponent', () => {
  let fixture: ComponentFixture<PainelMedidasPosturaisComponent>;

  /**
   * Entradas são definidas por `setInput` — como o componente é OnPush, atribuir
   * a propriedade direto não o marcaria para verificação e a tela não
   * acompanharia as correções de marcação.
   */
  function definir(entradas: {
    metricas?: MetricasPosturaisDTO | null;
    landmarks?: readonly LandmarkDTO[];
    previa?: boolean;
  }): void {
    Object.entries(entradas).forEach(([nome, valor]) => fixture.componentRef.setInput(nome, valor));
    fixture.detectChanges();
  }

  function valores(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.medidas__valor'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PainelMedidasPosturaisComponent] });
    fixture = TestBed.createComponent(PainelMedidasPosturaisComponent);
  });

  it('mostra as cinco medidas como pendentes sem pontos marcados', () => {
    fixture.detectChanges();

    expect(valores().length).toBe(5);
    expect(valores().every(el => el.classList.contains('medidas__valor--pendente'))).toBeTrue();
  });

  it('destaca em vermelho o valor a partir do limiar e em verde abaixo dele', () => {
    definir({
      metricas: { ...semMetricas, desnivelOmbrosGraus: 2.3, desnivelJoelhosGraus: 0.4 },
      landmarks: [
        { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.25 },
        { codigo: 'OMBRO_DIR', x: 0.62, y: 0.27 },
        { codigo: 'JOELHO_ESQ', x: 0.42, y: 0.7 },
        { codigo: 'JOELHO_DIR', x: 0.58, y: 0.705 }
      ]
    });

    const [, ombros, , joelhos] = valores();
    expect(ombros.classList).toContain('medidas__valor--assimetrica');
    expect(ombros.textContent).toContain('2,3°');
    expect(ombros.textContent).toContain('dir. baixo');
    expect(joelhos.classList).toContain('medidas__valor--simetrica');
  });

  it('recalcula a exibição quando os pontos mudam', () => {
    definir({
      metricas: { ...semMetricas, desnivelOmbrosGraus: 2.3 },
      landmarks: [
        { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.25 },
        { codigo: 'OMBRO_DIR', x: 0.62, y: 0.27 }
      ]
    });
    expect(valores()[1].textContent).toContain('dir. baixo');

    // A fisioterapeuta corrige o ombro esquerdo para baixo do direito.
    definir({
      landmarks: [
        { codigo: 'OMBRO_ESQ', x: 0.38, y: 0.29 },
        { codigo: 'OMBRO_DIR', x: 0.62, y: 0.27 }
      ]
    });

    expect(valores()[1].textContent).toContain('esq. baixo');
  });

  it('sinaliza quando os números ainda são prévia local', () => {
    definir({ previa: true });
    expect(fixture.nativeElement.querySelector('.medidas__origem').textContent).toContain('Prévia');

    definir({ previa: false });
    expect(fixture.nativeElement.querySelector('.medidas__origem').textContent).toContain('API');
  });

  it('não exibe centímetros sem calibração', () => {
    definir({ metricas: { ...semMetricas, desvioPrumoNormalizado: 0.052 } });

    expect(valores()[4].textContent).toContain('0,052');
    expect(fixture.nativeElement.textContent).not.toContain('0,052 cm');
  });
});
