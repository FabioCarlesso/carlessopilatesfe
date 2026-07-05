import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';
import { ResetPasswordComponent } from './reset-password.component';

async function setup(token: string | null = 'valid-token') {
  const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
  authSpy.resetPassword.and.returnValue(of(undefined as unknown as void));

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

  const activatedRoute = {
    snapshot: {
      queryParamMap: convertToParamMap(token === null ? {} : { token })
    }
  };

  await TestBed.configureTestingModule({
    imports: [ResetPasswordComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: authSpy },
      { provide: StylePreferencesService, useValue: stylePreferencesSpy },
      { provide: ActivatedRoute, useValue: activatedRoute }
    ]
  }).compileComponents();

  const router = TestBed.inject(Router);
  spyOn(router, 'navigate');

  const fixture = TestBed.createComponent(ResetPasswordComponent);
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance, authSpy, router };
}

function preencher(component: ResetPasswordComponent, novaSenha = 'novaSenha123', confirmacao = 'novaSenha123'): void {
  component.form.patchValue({ novaSenha, confirmacaoNovaSenha: confirmacao });
}

describe('ResetPasswordComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create with the two password controls', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
    ['novaSenha', 'confirmacaoNovaSenha'].forEach(name => {
      expect(component.form.contains(name)).toBeTrue();
    });
    expect(component.tokenInvalido).toBeFalse();
  });

  it('should mark the token as invalid when it is missing from the query string', async () => {
    const { component, fixture } = await setup(null);
    expect(component.tokenInvalido).toBeTrue();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-erro')).toBeTruthy();
    expect(el.textContent).toContain('Solicitar novo e-mail');
  });

  it('should enforce minimum length of 8 on the new password', async () => {
    const { component } = await setup();
    preencher(component, 'short', 'short');
    expect(component.form.get('novaSenha')?.errors?.['minlength']).toBeTruthy();
  });

  it('should flag mismatch between new password and confirmation', async () => {
    const { component } = await setup();
    preencher(component, 'novaSenha123', 'outraSenha999');
    expect(component.form.get('confirmacaoNovaSenha')?.errors?.['naoConfere']).toBeTruthy();
    expect(component.form.invalid).toBeTrue();
  });

  it('should not call the service when the form is invalid', async () => {
    const { component, authSpy } = await setup();
    component.salvar();
    expect(authSpy.resetPassword).not.toHaveBeenCalled();
  });

  it('should submit token and passwords on valid submit', async () => {
    const { component, authSpy } = await setup('the-token');
    preencher(component);

    component.salvar();

    expect(authSpy.resetPassword).toHaveBeenCalledWith({
      token: 'the-token',
      novaSenha: 'novaSenha123',
      confirmacaoNovaSenha: 'novaSenha123'
    });
  });

  it('should redirect to /login with confirmation flag after success', fakeAsync(async () => {
    const { component, router } = await setup();
    preencher(component);

    component.salvar();
    expect(component.sucesso).toContain('sucesso');
    tick(1500);

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redefinicao: 'sucesso' } });
  }));

  it('should show a token-invalid message and action on expired/used token', async () => {
    const { component, authSpy, fixture } = await setup();
    authSpy.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { code: 'TOKEN_EXPIRED' }
    })));
    preencher(component);

    component.salvar();
    fixture.detectChanges();

    expect(component.tokenInvalido).toBeTrue();
    expect(component.erro).toContain('inválido ou expirou');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Solicitar novo e-mail');
  });

  it('should treat 410 responses as an invalid token', async () => {
    const { component, authSpy } = await setup();
    authSpy.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
    preencher(component);

    component.salvar();

    expect(component.tokenInvalido).toBeTrue();
  });

  it('should surface the backend message on a 400 password-policy error', async () => {
    const { component, authSpy } = await setup();
    authSpy.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Nova senha não atende à política mínima.' }
    })));
    preencher(component);

    component.salvar();

    expect(component.tokenInvalido).toBeFalse();
    expect(component.erro).toBe('Nova senha não atende à política mínima.');
  });

  it('should show a rate-limit message on 429', async () => {
    const { component, authSpy } = await setup();
    authSpy.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    preencher(component);

    component.salvar();

    expect(component.erro).toContain('Muitas tentativas');
  });

  it('should fall back to a generic message on unexpected errors', async () => {
    const { component, authSpy } = await setup();
    authSpy.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    preencher(component);

    component.salvar();

    expect(component.erro).toBe('Erro ao redefinir a senha. Tente novamente.');
  });

  it('should not call the service twice on rapid double-submit', async () => {
    const { component, authSpy } = await setup();
    const subject = new Subject<void>();
    authSpy.resetPassword.and.returnValue(subject.asObservable());
    preencher(component);

    component.salvar();
    component.salvar();

    expect(authSpy.resetPassword).toHaveBeenCalledTimes(1);
    subject.complete();
  });
});
