import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRole } from '../../../../core/models/auth';
import { ROLE_OPTIONS, RoleOption } from '../../../../core/models/usuario-admin';
import { UsuarioAdminService } from '../../../../core/services/usuario-admin.service';
import { parseRouteNumberParam } from '../../../../shared/utils/route-param';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss'
})
export class UsuarioFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  usuarioId: number | null = null;
  parametroInvalido = false;
  loading = false;
  salvando = false;
  erro: string | null = null;
  roles: RoleOption[] = ROLE_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private service: UsuarioAdminService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: ['', Validators.required]
    });

    this.carregarRoles();

    if (!this.route.snapshot.paramMap.has('id')) return;

    this.usuarioId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.usuarioId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.setValidators([Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity();
    this.carregarUsuario(this.usuarioId);
  }

  salvar(): void {
    if (this.parametroInvalido) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = null;
    const valor = this.form.getRawValue();
    const senha = (valor.password ?? '').trim();

    const request$ = this.isEdit && this.usuarioId !== null
      ? this.service.atualizar(this.usuarioId, {
          name: valor.name,
          email: valor.email,
          ...(senha ? { password: senha } : {}),
          role: valor.role
        })
      : this.service.cadastrar({
          name: valor.name,
          email: valor.email,
          password: senha,
          role: valor.role
        });

    request$.subscribe({
      next: () => this.router.navigate(['/admin/usuarios']),
      error: () => {
        this.erro = 'Erro ao salvar usuário.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  private carregarUsuario(id: number): void {
    this.loading = true;
    this.service.buscar(id).subscribe({
      next: usuario => {
        this.form.patchValue({
          name: usuario.name,
          email: usuario.email,
          role: usuario.role,
          password: ''
        });
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar usuário.';
        this.loading = false;
      }
    });
  }

  private carregarRoles(): void {
    this.service.listarRoles().subscribe({
      next: roles => {
        this.roles = roles.map(role => ({ value: role, label: this.labelRole(role) }));
      },
      error: () => {
        this.roles = ROLE_OPTIONS;
      }
    });
  }

  private labelRole(role: UserRole): string {
    return ROLE_OPTIONS.find(opt => opt.value === role)?.label ?? role;
  }
}
