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
