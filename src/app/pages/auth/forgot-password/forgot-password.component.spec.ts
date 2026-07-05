import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';
import { ForgotPasswordComponent } from './forgot-password.component';

async function setup() {
  const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
  authSpy.forgotPassword.and.returnValue(of(undefined as unknown as void));

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
    imports: [ForgotPasswordComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: authSpy },
      { provide: StylePreferencesService, useValue: stylePreferencesSpy }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(ForgotPasswordComponent);
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance, authSpy, stylePreferencesSpy };
}

describe('ForgotPasswordComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create with an email control', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
    expect(component.form.contains('email')).toBeTrue();
  });

  it('should keep the email field required and validated', async () => {
    const { component } = await setup();

    component.enviar();
    expect(component.form.get('email')?.errors?.['required']).toBeTruthy();

    component.form.get('email')?.setValue('nao-e-email');
    expect(component.form.get('email')?.errors?.['email']).toBeTruthy();
  });

  it('should not call the service when the form is invalid', async () => {
    const { component, authSpy } = await setup();

    component.enviar();

    expect(authSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should call forgotPassword with the email on valid submit', async () => {
    const { component, authSpy } = await setup();
    component.form.get('email')?.setValue('user@carlessopilates.com');

    component.enviar();

    expect(authSpy.forgotPassword).toHaveBeenCalledWith('user@carlessopilates.com');
  });

  it('should show the generic success message regardless of the email existing', async () => {
    const { component, fixture } = await setup();
    component.form.get('email')?.setValue('user@carlessopilates.com');

    component.enviar();
    fixture.detectChanges();

    expect(component.enviado).toBeTrue();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-info')?.textContent).toContain('Se o e-mail existir');
  });

  it('should show a specific message when rate limited (429)', async () => {
    const { component, authSpy } = await setup();
    authSpy.forgotPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.form.get('email')?.setValue('user@carlessopilates.com');

    component.enviar();

    expect(component.enviado).toBeFalse();
    expect(component.erro).toContain('Muitas tentativas');
  });

  it('should show a generic error on unexpected failures', async () => {
    const { component, authSpy } = await setup();
    authSpy.forgotPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.form.get('email')?.setValue('user@carlessopilates.com');

    component.enviar();

    expect(component.erro).toContain('Não foi possível concluir a solicitação');
  });

  it('should not call the service twice on rapid double-submit', async () => {
    const { component, authSpy } = await setup();
    const subject = new Subject<void>();
    authSpy.forgotPassword.and.returnValue(subject.asObservable());
    component.form.get('email')?.setValue('user@carlessopilates.com');

    component.enviar();
    component.enviar();

    expect(authSpy.forgotPassword).toHaveBeenCalledTimes(1);
    subject.complete();
  });

  it('should toggle the theme through the style preferences service', async () => {
    const { component, stylePreferencesSpy } = await setup();
    component.toggleTheme();
    expect(stylePreferencesSpy.toggleTheme).toHaveBeenCalled();
  });
});
