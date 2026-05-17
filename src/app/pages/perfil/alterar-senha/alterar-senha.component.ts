import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioAdminService } from '../../../core/services/usuario-admin.service';

@Component({
  selector: 'app-alterar-senha',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './alterar-senha.component.html',
  styleUrl: './alterar-senha.component.scss'
})
export class AlterarSenhaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UsuarioAdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form: FormGroup;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  mostrarSenhaAtual = false;
  mostrarNovaSenha = false;
  mostrarConfirmacao = false;

  constructor() {
    this.form = this.fb.group(
      {
        senhaAtual: ['', [Validators.required]],
        novaSenha: ['', [Validators.required, Validators.minLength(8)]],
        confirmacaoNovaSenha: ['', [Validators.required]]
      },
      {
        validators: [
          this.matchValidator('novaSenha', 'confirmacaoNovaSenha'),
          this.differentValidator('senhaAtual', 'novaSenha')
        ]
      }
    );
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  toggleSenhaAtual(): void {
    this.mostrarSenhaAtual = !this.mostrarSenhaAtual;
  }

  toggleNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  toggleConfirmacao(): void {
    this.mostrarConfirmacao = !this.mostrarConfirmacao;
  }

  salvar(): void {
    if (this.salvando) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const { senhaAtual, novaSenha, confirmacaoNovaSenha } = this.form.getRawValue();

    this.service
      .alterarSenha({ senhaAtual, novaSenha, confirmacaoNovaSenha })
      .subscribe({
        next: () => {
          this.sucesso = 'Senha alterada com sucesso. Faça login novamente com a nova senha.';
          this.form.reset();
          this.authService.clearSession();
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (err: HttpErrorResponse) => {
          this.aplicarErro(err);
          this.salvando = false;
        }
      });
  }

  private aplicarErro(err: HttpErrorResponse): void {
    if (err?.status === 401 || err?.status === 403) {
      this.form.get('senhaAtual')?.setErrors({ incorreta: true });
      this.erro = 'Senha atual incorreta.';
      return;
    }

    if (err?.status === 400) {
      const mensagem = typeof err.error?.message === 'string' ? err.error.message : null;
      this.erro = mensagem ?? 'Dados inválidos para troca de senha.';
      return;
    }

    this.erro = 'Erro ao alterar a senha. Tente novamente.';
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

  private differentValidator(currentName: string, newName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const current = group.get(currentName);
      const novo = group.get(newName);
      if (!current || !novo) return null;
      if (!current.value || !novo.value) return null;
      if (current.value === novo.value) {
        const existing = novo.errors ?? {};
        novo.setErrors({ ...existing, igualAtual: true });
        return { igualAtual: true };
      }
      if (novo.errors?.['igualAtual']) {
        const { igualAtual, ...rest } = novo.errors;
        novo.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    };
  }
}
