import { TestBed } from '@angular/core/testing';
import { LandingComoFuncionaComponent } from './landing-como-funciona.component';
import { isOnPush } from '../../../../testing/onpush';

describe('LandingComoFuncionaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComoFuncionaComponent]
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = TestBed.createComponent(LandingComoFuncionaComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(LandingComoFuncionaComponent)).toBeTrue();
  });

  it('should render the steps as an ordered list', () => {
    const fixture = TestBed.createComponent(LandingComoFuncionaComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const passos = el.querySelectorAll('ol.como-funciona__passos > li');
    expect(passos.length).toBe(fixture.componentInstance.passos.length);
  });

  // A numeração visível é redundante com a semântica do `<ol>`: fica fora da
  // árvore de acessibilidade para o leitor de tela não anunciar "1 1".
  it('should hide the decorative step number from assistive technology', () => {
    const fixture = TestBed.createComponent(LandingComoFuncionaComponent);
    fixture.detectChanges();

    const numeros = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.passo__numero'));
    expect(numeros.length).toBeGreaterThan(0);
    for (const numero of numeros) {
      expect(numero.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('should number the steps sequentially', () => {
    const fixture = TestBed.createComponent(LandingComoFuncionaComponent);
    fixture.detectChanges();

    const numeros = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.passo__numero')
    ).map(n => n.textContent?.trim());

    expect(numeros).toEqual(['1', '2', '3', '4']);
  });

  it('should anchor the section with the id used by the hero CTA', () => {
    const fixture = TestBed.createComponent(LandingComoFuncionaComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('section')?.id).toBe('como-funciona');
  });
});
