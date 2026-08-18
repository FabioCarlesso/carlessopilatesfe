import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingTopoComponent } from './landing-topo.component';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';
import { isOnPush } from '../../../../testing/onpush';

describe('LandingTopoComponent', () => {
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;

  // O serviço real é dublê de propósito: `toggleTheme()` escreve `data-theme`
  // no `documentElement` e no localStorage compartilhados pelo Karma, sem
  // desfazer no fim do spec. Deixá-lo passar direto tinge de escuro o documento
  // e derruba, na ordem aleatória do Jasmine, qualquer spec posterior que
  // dependa do tema claro.
  function setup(theme: StyleTheme = 'light') {
    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme, density: 'default' } }
    );

    return TestBed.configureTestingModule({
      imports: [LandingTopoComponent],
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
    const fixture = TestBed.createComponent(LandingTopoComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    const fixture = TestBed.createComponent(LandingTopoComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(LandingTopoComponent)).toBeTrue();
  });

  it('should render the brand and the login entry point', () => {
    const el = renderizar();

    expect(el.querySelector('.topo__marca')?.textContent).toContain('Carlesso Pilates');
    expect(el.querySelector<HTMLAnchorElement>('a.btn-primary')?.getAttribute('href')).toBe('/login');
  });

  it('should toggle the theme through the style preferences service', () => {
    renderizar().querySelector<HTMLButtonElement>('.topo__acoes button')?.click();

    expect(stylePreferencesSpy.toggleTheme).toHaveBeenCalled();
  });

  it('should offer the dark theme while the light one is active', () => {
    const botao = renderizar().querySelector<HTMLButtonElement>('.topo__acoes button');

    expect(botao?.textContent?.trim()).toBe('Tema escuro');
    expect(botao?.getAttribute('aria-pressed')).toBe('false');
    expect(botao?.getAttribute('aria-label')).toBe('Mudar para tema escuro');
  });

  it('should offer the light theme while the dark one is active', async () => {
    TestBed.resetTestingModule();
    await setup('dark');

    const botao = renderizar().querySelector<HTMLButtonElement>('.topo__acoes button');

    expect(botao?.textContent?.trim()).toBe('Tema claro');
    expect(botao?.getAttribute('aria-pressed')).toBe('true');
    expect(botao?.getAttribute('aria-label')).toBe('Mudar para tema claro');
  });
});
