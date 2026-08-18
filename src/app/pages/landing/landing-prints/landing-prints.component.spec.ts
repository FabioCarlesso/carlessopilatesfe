import { TestBed } from '@angular/core/testing';
import { LandingPrintsComponent } from './landing-prints.component';
import { isOnPush } from '../../../../testing/onpush';

describe('LandingPrintsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPrintsComponent]
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  function renderizarImagens(): HTMLImageElement[] {
    const fixture = TestBed.createComponent(LandingPrintsComponent);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('img'));
  }

  it('should create', () => {
    const fixture = TestBed.createComponent(LandingPrintsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(LandingPrintsComponent)).toBeTrue();
  });

  it('should render one figure per screenshot', () => {
    const fixture = TestBed.createComponent(LandingPrintsComponent);
    fixture.detectChanges();

    const figuras = (fixture.nativeElement as HTMLElement).querySelectorAll('figure');
    expect(figuras.length).toBe(fixture.componentInstance.prints.length);
  });

  // O print é conteúdo da página, não decoração: sem `alt` a galeria inteira
  // desaparece para quem usa leitor de tela.
  it('should give every screenshot a descriptive alt text', () => {
    for (const img of renderizarImagens()) {
      expect(img.getAttribute('alt')?.trim().length).toBeGreaterThan(20);
    }
  });

  // `width`/`height` reservam o espaço antes do download e evitam o pulo de
  // layout quando a galeria entra na viewport; `lazy` mantém os arquivos fora
  // do carregamento inicial, já que a seção fica abaixo da dobra.
  it('should lazy-load every screenshot with explicit dimensions', () => {
    for (const img of renderizarImagens()) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('decoding')).toBe('async');
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
  });

  it('should serve the screenshots as webp from the landing asset folder', () => {
    for (const img of renderizarImagens()) {
      expect(img.getAttribute('src')).toMatch(/^landing\/[a-z-]+\.webp$/);
    }
  });

  it('should caption every screenshot', () => {
    const fixture = TestBed.createComponent(LandingPrintsComponent);
    fixture.detectChanges();

    const legendas = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('figcaption')
    );
    expect(legendas.length).toBe(fixture.componentInstance.prints.length);
    for (const legenda of legendas) {
      expect(legenda.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('should state that the screenshots use fictional data', () => {
    const fixture = TestBed.createComponent(LandingPrintsComponent);
    fixture.detectChanges();

    const intro = (fixture.nativeElement as HTMLElement).querySelector('.prints__intro');
    expect(intro?.textContent).toContain('fictícios');
  });
});
