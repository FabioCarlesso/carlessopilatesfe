import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';
import { isOnPush } from '../../../../testing/onpush';

describe('LandingComponent', () => {
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;

  // O `app-landing-topo` montado aqui dentro injeta o serviço de estilo, e o
  // `toggleTheme()` real escreve `data-theme` no `documentElement` e no
  // localStorage compartilhados pelo Karma, sem desfazer no fim do spec. Daí o
  // dublê: sem ele, o documento fica tingido de escuro e derruba, na ordem
  // aleatória do Jasmine, specs posteriores que dependem do tema claro.
  function setup(theme: StyleTheme = 'light') {
    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme, density: 'default' } }
    );

    return TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideRouter([]),
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => TestBed.resetTestingModule());

  function renderizar(): HTMLElement {
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(LandingComponent)).toBeTrue();
  });

  it('should render a single h1 with the product headline', () => {
    const el = renderizar();
    const titulos = el.querySelectorAll('h1');
    expect(titulos.length).toBe(1);
    expect(titulos[0].textContent).toContain('O estúdio inteiro em uma tela');
  });

  it('should point every access CTA to the login screen', () => {
    const el = renderizar();
    const ctas = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.btn-primary'));

    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const cta of ctas) {
      expect(cta.getAttribute('href')).toBe('/login');
    }
  });

  it('should render the hero secondary CTA as an anchor to the how-it-works section', () => {
    const el = renderizar();
    const link = el.querySelector<HTMLAnchorElement>('.hero__acoes a.btn-secondary');
    expect(link?.getAttribute('href')).toBe('#como-funciona');
    expect(el.querySelector('#como-funciona')).toBeTruthy();
  });

  it('should render all landing sections in order', () => {
    const el = renderizar();
    const secoes = Array.from(el.querySelectorAll('section')).map(secao =>
      secao.getAttribute('aria-labelledby')
    );

    expect(secoes).toEqual([
      'hero-titulo',
      'sobre-titulo',
      'como-funciona-titulo',
      'funcionalidades-titulo',
      'prints-titulo',
      'fechamento-titulo'
    ]);
  });

  it('should give every section an existing heading as accessible name', () => {
    const el = renderizar();
    for (const secao of Array.from(el.querySelectorAll('section'))) {
      const id = secao.getAttribute('aria-labelledby');
      expect(id).withContext('seção sem aria-labelledby').toBeTruthy();
      expect(el.querySelector(`#${id}`))
        .withContext(`nenhum título com id ${id}`)
        .toBeTruthy();
    }
  });

  it('should render the reach numbers', () => {
    const el = renderizar();
    const valores = Array.from(el.querySelectorAll('.numero__valor')).map(n => n.textContent?.trim());
    expect(valores).toEqual(['15', '56', '2']);
  });

  it('should not promise self-signup or free trial anywhere on the page', () => {
    const texto = (renderizar().textContent ?? '').toLowerCase();

    for (const proibido of ['criar conta', 'cadastre-se', 'grátis', 'gratis', 'teste grátis', 'assinar']) {
      expect(texto).withContext(`texto proibido na landing: ${proibido}`).not.toContain(proibido);
    }
  });

  it('should state that accounts are created by an administrator', () => {
    const el = renderizar();
    expect(el.querySelector('.fechamento__texto')?.textContent).toContain('administrador');
  });

  it('should render the public top bar', () => {
    expect(renderizar().querySelector('app-landing-topo')).toBeTruthy();
  });

  it('should render the current year in the footer', () => {
    const el = renderizar();
    expect(el.querySelector('.rodape__inner')?.textContent).toContain(String(new Date().getFullYear()));
  });
});
