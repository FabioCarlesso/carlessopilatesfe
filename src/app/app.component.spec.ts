import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StylePreferencesService, StyleTheme } from './core/services/style-preferences.service';

describe('AppComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;

  function setup(authenticated: boolean, admin = false, theme: StyleTheme = 'light') {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isAdmin', 'logout']);
    authServiceSpy.isAuthenticated.and.returnValue(authenticated);
    authServiceSpy.isAdmin.and.returnValue(admin);

    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme, density: 'default' } }
    );

    TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();
  }

  it('should create the app', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router-outlet', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should hide navbar when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeNull();
  });

  it('should show navbar when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeTruthy();
  });

  it('should display "Carlesso Pilates" in the navbar brand when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar-brand')?.textContent).toContain('Carlesso Pilates');
  });

  it('should render admin navigation links when authenticated user is admin', async () => {
    await setup(true, true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')?.textContent).toContain('Profissionais');
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
    expect(el.querySelector('a[href="/admin"]')?.textContent).toContain('Administração');
  });

  it('should hide admin navigation links when authenticated user is not admin', async () => {
    await setup(true, false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios"]')).toBeNull();
    expect(el.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('should render dashboard navigation link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/"]')?.textContent).toContain('Carlesso Pilates');
    expect(el.querySelector('.navbar-menu a[href="/"]')?.textContent).toContain('Início');
  });

  it('should render the alterar senha link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/perfil/alterar-senha"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Alterar senha');
  });

  it('should hide the alterar senha link when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/perfil/alterar-senha"]')).toBeNull();
  });

  it('should show logout button when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-sair')).toBeTruthy();
  });

  it('should call logout on sair button click', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-sair') as HTMLButtonElement;
    btn.click();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should render the theme toggle in the navbar when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar .btn-tema')).toBeTruthy();
  });

  it('should hide the theme toggle when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-tema')).toBeNull();
  });

  it('should call toggleTheme when the theme toggle is clicked', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-tema') as HTMLButtonElement;
    btn.click();
    expect(stylePreferencesSpy.toggleTheme).toHaveBeenCalled();
  });

  it('should render the collapsed menu toggle wired to the collapse region', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle');
    const collapse = el.querySelector('.navbar-collapse');
    expect(toggle).toBeTruthy();
    expect(collapse).toBeTruthy();
    expect(toggle?.getAttribute('aria-controls')).toBe('navbar-collapse');
    expect(collapse?.getAttribute('id')).toBe('navbar-collapse');
  });

  it('should start with the menu closed and aria-expanded false', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle');
    expect(el.querySelector('.navbar.is-open')).toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe('Abrir menu');
  });

  it('should toggle the menu open and closed on toggle button click', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu');

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('should close the menu when a navigation link is clicked', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    (el.querySelector('.navbar-menu a[href="/pacientes"]') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
  });

  it('should expose the menu, theme, alterar senha and logout inside the collapse region', async () => {
    await setup(true, true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const collapse = fixture.nativeElement.querySelector('.navbar-collapse') as HTMLElement;
    expect(collapse.querySelector('.navbar-menu a[href="/admin"]')).toBeTruthy();
    expect(collapse.querySelector('.btn-alterar-senha')).toBeTruthy();
    expect(collapse.querySelector('.btn-tema')).toBeTruthy();
    expect(collapse.querySelector('.btn-sair')).toBeTruthy();
  });

  it('should close the menu when logging out', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    (el.querySelector('.btn-sair') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should label the theme toggle to switch to dark while the light theme is active', async () => {
    await setup(true, false, 'light');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-tema') as HTMLButtonElement;
    expect(btn.textContent).toContain('Tema escuro');
    expect(btn.getAttribute('aria-label')).toBe('Mudar para tema escuro');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('should label the theme toggle to switch to light while the dark theme is active', async () => {
    await setup(true, false, 'dark');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-tema') as HTMLButtonElement;
    expect(btn.textContent).toContain('Tema claro');
    expect(btn.getAttribute('aria-label')).toBe('Mudar para tema claro');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});
