import { NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserRole } from '../../../../core/models/auth';
import { ROLE_OPTIONS, RoleOption, UsuarioAdminResponseDTO } from '../../../../core/models/usuario-admin';
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

    if (!this.route.snapshot.paramMap.has('id')) {
      this.carregarRoles();
      return;
    }

    this.usuarioId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.usuarioId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.form.get('password')?.setValidators(Validators.minLength(8));
    this.form.get('password')?.updateValueAndValidity();
    this.carregarEdicao(this.usuarioId);
  }

  salvar(): void {
    if (this.parametroInvalido) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.salvando) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = null;
    const valor = this.form.getRawValue();
    const senha: string = valor.password ?? '';

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
      error: (err: HttpErrorResponse) => {
        this.erro = this.mensagemErroSalvar(err);
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  private carregarEdicao(id: number): void {
    this.loading = true;
    forkJoin({
      roles: this.rolesObservable(),
      usuario: this.service.buscar(id)
    }).subscribe({
      next: ({ roles, usuario }) => {
        this.roles = roles;
        this.preencherFormulario(usuario);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.erro = this.mensagemErroCarregar(err);
        this.loading = false;
      }
    });
  }

  private carregarRoles(): void {
    this.rolesObservable().subscribe(roles => {
      this.roles = roles;
    });
  }

  private rolesObservable(): Observable<RoleOption[]> {
    return this.service.listarRoles().pipe(
      map(roles => (roles?.length ? roles.map(role => this.toRoleOption(role)) : ROLE_OPTIONS)),
      catchError(() => of(ROLE_OPTIONS))
    );
  }

  private preencherFormulario(usuario: UsuarioAdminResponseDTO): void {
    this.form.patchValue({
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      password: ''
    });
  }

  private toRoleOption(role: UserRole): RoleOption {
    return { value: role, label: this.labelRole(role) };
  }

  private labelRole(role: UserRole): string {
    return ROLE_OPTIONS.find(opt => opt.value === role)?.label ?? role;
  }

  private mensagemErroSalvar(err: HttpErrorResponse): string {
    if (err?.status === 409) return 'Já existe um usuário com este e-mail.';
    if (err?.status === 400) return err.error?.message ?? 'Dados inválidos.';
    return 'Erro ao salvar usuário.';
  }

  private mensagemErroCarregar(err: HttpErrorResponse): string {
    if (err?.status === 404) return 'Usuário não encontrado.';
    return 'Erro ao carregar usuário.';
  }
}
