import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioAdminService } from '../../../core/services/usuario-admin.service';
import { AlterarSenhaComponent } from './alterar-senha.component';

async function setup() {
  const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>('UsuarioAdminService', ['alterarSenha']);
  serviceSpy.alterarSenha.and.returnValue(of(undefined as unknown as void));

  const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['clearSession']);

  await TestBed.configureTestingModule({
    imports: [AlterarSenhaComponent],
    providers: [
      provideRouter([]),
      { provide: UsuarioAdminService, useValue: serviceSpy },
      { provide: AuthService, useValue: authSpy }
    ]
  }).compileComponents();

  const router = TestBed.inject(Router);
  spyOn(router, 'navigate');

  const fixture = TestBed.createComponent(AlterarSenhaComponent);
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance, serviceSpy, authSpy, router };
}

function preencherFormulario(component: AlterarSenhaComponent, overrides: Partial<{
  senhaAtual: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
}> = {}): void {
  component.form.patchValue({
    senhaAtual: 'senhaAtual1',
    novaSenha: 'novaSenha123',
    confirmacaoNovaSenha: 'novaSenha123',
    ...overrides
  });
}

describe('AlterarSenhaComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create with the three password controls', async () => {
    const { component } = await setup();

    expect(component).toBeTruthy();
    ['senhaAtual', 'novaSenha', 'confirmacaoNovaSenha'].forEach(name => {
      expect(component.form.contains(name)).toBeTrue();
    });
  });

  it('should mark all fields as required', async () => {
    const { component } = await setup();

    component.salvar();

    expect(component.form.get('senhaAtual')?.errors?.['required']).toBeTruthy();
    expect(component.form.get('novaSenha')?.errors?.['required']).toBeTruthy();
    expect(component.form.get('confirmacaoNovaSenha')?.errors?.['required']).toBeTruthy();
    expect(component.form.touched).toBeTrue();
  });

  it('should enforce minimum length of 8 on new password', async () => {
    const { component } = await setup();
    preencherFormulario(component, { novaSenha: 'short', confirmacaoNovaSenha: 'short' });

    expect(component.form.get('novaSenha')?.errors?.['minlength']).toBeTruthy();
  });

  it('should flag mismatch between new password and confirmation', async () => {
    const { component } = await setup();
    preencherFormulario(component, { confirmacaoNovaSenha: 'outraSenha999' });

    expect(component.form.get('confirmacaoNovaSenha')?.errors?.['naoConfere']).toBeTruthy();
    expect(component.form.invalid).toBeTrue();
  });

  it('should flag new password equal to current password', async () => {
    const { component } = await setup();
    preencherFormulario(component, {
      senhaAtual: 'repetida123',
      novaSenha: 'repetida123',
      confirmacaoNovaSenha: 'repetida123'
    });

    expect(component.form.get('novaSenha')?.errors?.['igualAtual']).toBeTruthy();
    expect(component.form.invalid).toBeTrue();
  });

  it('should not call the service when the form is invalid', async () => {
    const { component, serviceSpy } = await setup();

    component.salvar();

    expect(serviceSpy.alterarSenha).not.toHaveBeenCalled();
  });

  it('should call the service with the form payload on valid submit', async () => {
    const { component, serviceSpy } = await setup();
    preencherFormulario(component);

    component.salvar();

    expect(serviceSpy.alterarSenha).toHaveBeenCalledWith({
      senhaAtual: 'senhaAtual1',
      novaSenha: 'novaSenha123',
      confirmacaoNovaSenha: 'novaSenha123'
    });
  });

  it('should clear session and redirect to /login after success', fakeAsync(async () => {
    const { component, authSpy, router } = await setup();
    preencherFormulario(component);

    component.salvar();
    tick(1500);

    expect(authSpy.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.sucesso).toContain('sucesso');
  }));

  it('should not call the service twice on rapid double-submit', async () => {
    const { component, serviceSpy } = await setup();
    const subject = new Subject<void>();
    serviceSpy.alterarSenha.and.returnValue(subject.asObservable());
    preencherFormulario(component);

    component.salvar();
    component.salvar();

    expect(serviceSpy.alterarSenha).toHaveBeenCalledTimes(1);
    subject.complete();
  });

  it('should map explicit senha atual errors to the field message', async () => {
    const { component, serviceSpy } = await setup();
    serviceSpy.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 401,
      error: { code: 'SENHA_ATUAL_INCORRETA' }
    })));
    preencherFormulario(component);

    component.salvar();

    expect(component.erro).toBe('Senha atual incorreta.');
    expect(component.form.get('senhaAtual')?.errors?.['incorreta']).toBeTruthy();
    expect(component.salvando).toBeFalse();
  });

  it('should map field validation errors for senhaAtual to the field message', async () => {
    const { component, serviceSpy } = await setup();
    serviceSpy.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { fieldErrors: [{ field: 'senhaAtual', message: 'Senha atual inválida.' }] }
    })));
    preencherFormulario(component);

    component.salvar();

    expect(component.erro).toBe('Senha atual incorreta.');
    expect(component.form.get('senhaAtual')?.errors?.['incorreta']).toBeTruthy();
  });

  it('should not map generic 401 or 403 responses to senha atual incorrect', async () => {
    const { component, serviceSpy } = await setup();
    serviceSpy.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    preencherFormulario(component);

    component.salvar();

    expect(component.erro).toBe('Não foi possível confirmar sua autorização. Faça login novamente e tente alterar a senha.');
    expect(component.form.get('senhaAtual')?.errors?.['incorreta']).toBeFalsy();
  });

  it('should map 400 to the backend message when available', async () => {
    const { component, serviceSpy } = await setup();
    serviceSpy.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Nova senha não atende à política mínima.' }
    })));
    preencherFormulario(component);

    component.salvar();

    expect(component.erro).toBe('Nova senha não atende à política mínima.');
  });

  it('should fall back to a generic message on unexpected errors', async () => {
    const { component, serviceSpy } = await setup();
    serviceSpy.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    preencherFormulario(component);

    component.salvar();

    expect(component.erro).toBe('Erro ao alterar a senha. Tente novamente.');
  });

  it('should toggle visibility of each password field independently', async () => {
    const { component } = await setup();

    expect(component.mostrarSenhaAtual).toBeFalse();
    component.toggleSenhaAtual();
    expect(component.mostrarSenhaAtual).toBeTrue();

    expect(component.mostrarNovaSenha).toBeFalse();
    component.toggleNovaSenha();
    expect(component.mostrarNovaSenha).toBeTrue();

    expect(component.mostrarConfirmacao).toBeFalse();
    component.toggleConfirmacao();
    expect(component.mostrarConfirmacao).toBeTrue();
  });

  // A tela usava `--space-md`, `--space-sm`, `--radius-sm`, `--text-default` e
  // `--surface-muted`, que nunca foram definidos em `_tokens.scss`: tudo vinha do
  // literal do fallback, fora do sistema de temas (issue #213). Diferente dos
  // guards das listagens do prontuário, este **não** falha contra o CSS antigo —
  // os literais rendiam os mesmos números e a cor herdada coincidia com
  // `--text-primary` nos dois temas. Quem pega a classe de erro ali é o
  // `npm run lint:tokens`; o papel do guard é travar os valores para que a
  // troca de nome não vire troca de desenho (`--r-sm` são 2px, não 4px).
  it('should size and color the password toggle from real tokens in both themes', async () => {
    const { fixture } = await setup();
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const el = fixture.nativeElement as HTMLElement;
      const hint = el.querySelector('.form-section-hint') as HTMLElement;
      const campo = el.querySelector('.password-field') as HTMLElement;
      const botao = el.querySelector('.btn-toggle-password') as HTMLElement;

      expect(getComputedStyle(hint).marginBottom).toBe('16px');
      expect(getComputedStyle(campo).columnGap).toBe('8px');
      expect(getComputedStyle(botao).borderRadius).toBe('4px');
      expect(getComputedStyle(botao).paddingLeft).toBe('16px');
      expect(getComputedStyle(botao).paddingRight).toBe('16px');

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(botao).color).toBe('rgb(20, 31, 45)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(botao).color).toBe('rgb(235, 232, 226)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });
});
