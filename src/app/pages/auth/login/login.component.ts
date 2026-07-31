import { AfterViewInit, Component, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService } from '../../../core/services/style-preferences.service';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  form: FormGroup;
  erro = '';
  aviso = '';
  carregando = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private stylePreferences: StylePreferencesService,
    private host: ElementRef<HTMLElement>
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    if (this.route.snapshot.queryParamMap.get('redefinicao') === 'sucesso') {
      this.aviso = 'Senha redefinida com sucesso. Faça login com a nova senha.';
    }
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  // O tema é só preferência visual em localStorage (data-theme), sem dado
  // sensível nem chamada ao backend — pode ser alternado sem estar logado.
  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }

  entrar(): void {
    if (this.carregando) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

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
