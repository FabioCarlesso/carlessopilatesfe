import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';

describe('LoginComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;
  let router: Router;

  function setTheme(theme: StyleTheme): void {
    (stylePreferencesSpy as { current: { theme: StyleTheme; density: string } }).current = {
      theme,
      density: 'default'
    };
  }

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'isAuthenticated']);
    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>('StylePreferencesService', [
      'toggleTheme',
      'setTheme',
      'setDensity',
      'apply'
    ]);
    setTheme('light');

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render email and password fields', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[type="email"]')).toBeTruthy();
    expect(el.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should keep submit button enabled when form is invalid', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();
  });

  it('should mark fields as touched and focus the first invalid field on invalid submit', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.entrar();
    fixture.detectChanges();

    expect(comp.form.touched).toBeTrue();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
    const emailInput = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
    expect(document.activeElement).toBe(emailInput);
  });

  it('should focus the email field when the form is opened', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const emailInput = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
    expect(document.activeElement).toBe(emailInput);
  });

  it('should navigate to / on successful login', () => {
    authServiceSpy.login.and.returnValue(of({
      accessToken: 'token',
      tokenType: 'Bearer',
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@carlessopilates.com',
        role: 'ADMIN'
      }
    }));
    const spy = spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'admin@carlessopilates.com', password: 'senha1234' });
    comp.entrar();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'admin@carlessopilates.com', password: 'senha1234' });
    expect(spy).toHaveBeenCalledWith(['/inicio']);
  });

  it('should show 401 error message on invalid credentials', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('E-mail ou senha inválidos');
  });

  it('should show 429 error message when rate limited', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 429 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('15 minutos');
  });

  it('should show generic error on unknown error', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 500 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('Erro ao realizar login');
  });

  it('should render the theme toggle without being authenticated', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-theme-toggle')).toBeTruthy();
  });

  it('should call toggleTheme when the theme toggle is clicked', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.login-theme-toggle') as HTMLButtonElement;
    btn.click();
    expect(stylePreferencesSpy.toggleTheme).toHaveBeenCalled();
  });

  it('should label the theme toggle to switch to dark while the light theme is active', () => {
    setTheme('light');
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.login-theme-toggle') as HTMLButtonElement;
    expect(btn.textContent).toContain('Tema escuro');
    expect(btn.getAttribute('aria-label')).toBe('Mudar para tema escuro');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('should label the theme toggle to switch to light while the dark theme is active', () => {
    setTheme('dark');
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.login-theme-toggle') as HTMLButtonElement;
    expect(btn.textContent).toContain('Tema claro');
    expect(btn.getAttribute('aria-label')).toBe('Mudar para tema claro');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should render a link to the forgot-password page', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a.login-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Esqueci minha senha');
    expect(link.getAttribute('href')).toContain('/esqueci-senha');
  });

  it('should not show a reset confirmation banner without the query flag', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-aviso')).toBeNull();
  });
});

describe('LoginComponent with reset confirmation', () => {
  it('should show a confirmation banner when redefinicao=sucesso is present', async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'isAuthenticated']);
    const stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>('StylePreferencesService', [
      'toggleTheme',
      'setTheme',
      'setDensity',
      'apply'
    ]);
    (stylePreferencesSpy as { current: { theme: StyleTheme; density: string } }).current = {
      theme: 'light',
      density: 'default'
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ redefinicao: 'sucesso' }) } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-aviso')?.textContent).toContain('Senha redefinida com sucesso');
  });
});
