import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService } from '../../../core/services/style-preferences.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly stylePreferences = inject(StylePreferencesService);

  // Mensagem genérica exibida sempre que a solicitação é aceita, independentemente
  // de o e-mail existir ou não — o backend retorna 200 por design para evitar
  // enumeração de usuários, então a UI não deve diferenciar os casos.
  readonly mensagemGenerica =
    'Se o e-mail existir em nossa base, você receberá instruções para redefinir sua senha.';

  form: FormGroup;
  enviando = false;
  enviado = false;
  erro: string | null = null;

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }

  enviar(): void {
    if (this.enviando) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.erro = null;

    const email = this.form.get('email')?.value as string;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        if (err?.status === 429) {
          this.erro = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
        } else {
          this.erro = 'Não foi possível concluir a solicitação. Tente novamente.';
        }
      }
    });
  }
}
