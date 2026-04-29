import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  erro = '';
  carregando = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  entrar(): void {
    if (this.form.invalid || this.carregando) return;

    this.carregando = true;
    this.erro = '';

    this.authService.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.carregando = false;
        if (err.status === 401) {
          this.erro = 'E-mail ou senha inválidos.';
        } else if (err.status === 429) {
          this.erro = 'Muitas tentativas. Tente novamente em 15 minutos.';
        } else {
          this.erro = 'Erro ao realizar login. Tente novamente.';
        }
      }
    });
  }
}
