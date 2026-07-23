import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService } from '../../../core/services/style-preferences.service';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

const TOKEN_INVALIDO_CODES = [
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'INVALID_TOKEN',
  'TOKEN_USED',
  'TOKEN_ALREADY_USED',
  'RESET_TOKEN_INVALID',
  'RESET_TOKEN_EXPIRED',
  'RESET_TOKEN_USED'
];

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stylePreferences = inject(StylePreferencesService);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly token: string;

  form: FormGroup;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  tokenInvalido = false;
  mostrarNovaSenha = false;
  mostrarConfirmacao = false;

  constructor() {
    this.token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
    this.tokenInvalido = this.token.length === 0;

    this.form = this.fb.group(
      {
        novaSenha: ['', [Validators.required, Validators.minLength(8)]],
        confirmacaoNovaSenha: ['', [Validators.required]]
      },
      {
        validators: [this.matchValidator('novaSenha', 'confirmacaoNovaSenha')]
      }
    );
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  toggleNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  toggleConfirmacao(): void {
    this.mostrarConfirmacao = !this.mostrarConfirmacao;
  }

  salvar(): void {
    if (this.salvando) return;

    if (this.tokenInvalido) {
      this.erro = 'O link de redefinição é inválido. Solicite um novo e-mail.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const { novaSenha, confirmacaoNovaSenha } = this.form.getRawValue();

    this.authService
      .resetPassword({ token: this.token, novaSenha, confirmacaoNovaSenha })
      .subscribe({
        next: () => {
          this.sucesso = 'Senha redefinida com sucesso. Redirecionando para o login...';
          this.form.reset();
          setTimeout(
            () => this.router.navigate(['/login'], { queryParams: { redefinicao: 'sucesso' } }),
            1500
          );
        },
        error: (err: HttpErrorResponse) => {
          this.aplicarErro(err);
          this.salvando = false;
        }
      });
  }

  private aplicarErro(err: HttpErrorResponse): void {
    if (err?.status === 429) {
      this.erro = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      return;
    }

    if (this.isTokenInvalido(err)) {
      this.tokenInvalido = true;
      this.erro = 'O link de redefinição é inválido ou expirou. Solicite um novo e-mail.';
      return;
    }

    if (err?.status === 400) {
      const mensagem = typeof err.error?.message === 'string' ? err.error.message : null;
      this.erro = mensagem ?? 'Não foi possível redefinir a senha. Verifique os dados e tente novamente.';
      return;
    }

    this.erro = 'Erro ao redefinir a senha. Tente novamente.';
  }

  private isTokenInvalido(err: HttpErrorResponse): boolean {
    if (err?.status === 404 || err?.status === 410) {
      return true;
    }

    const body = err?.error;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return false;
    }

    const code = (body as { code?: unknown }).code;
    if (typeof code === 'string' && TOKEN_INVALIDO_CODES.includes(code.toUpperCase())) {
      return true;
    }

    if ((body as { field?: unknown }).field === 'token') {
      return true;
    }

    return false;
  }

  private matchValidator(controlName: string, matchingName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const control = group.get(controlName);
      const matching = group.get(matchingName);
      if (!control || !matching) return null;
      if (!matching.value) return null;
      if (control.value !== matching.value) {
        const existing = matching.errors ?? {};
        matching.setErrors({ ...existing, naoConfere: true });
        return { naoConfere: true };
      }
      if (matching.errors?.['naoConfere']) {
        const { naoConfere, ...rest } = matching.errors;
        matching.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    };
  }
}
