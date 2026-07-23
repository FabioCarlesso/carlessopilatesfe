import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { UsuarioAdminResponseDTO } from '../../../../core/models/usuario-admin';
import { UsuarioAdminService } from '../../../../core/services/usuario-admin.service';
import { UsuarioFormComponent } from './usuario-form.component';

const mockUsuario: UsuarioAdminResponseDTO = {
  id: 42,
  name: 'Maria Admin',
  email: 'maria@carlessopilates.com',
  role: 'ADMIN',
  active: true
};

async function setup(idParam: string | null, service?: jasmine.SpyObj<UsuarioAdminService>) {
  const serviceSpy = service ?? jasmine.createSpyObj<UsuarioAdminService>(
    'UsuarioAdminService',
    ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
  );

  if (!service) {
    serviceSpy.listarRoles.and.returnValue(of([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]));
    serviceSpy.buscar.and.returnValue(of(mockUsuario));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));
  }

  await TestBed.configureTestingModule({
    imports: [UsuarioFormComponent],
    providers: [
      provideRouter([]),
      { provide: UsuarioAdminService, useValue: serviceSpy },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(idParam === null ? {} : { id: idParam })
          }
        }
      }
    ]
  }).compileComponents();

  const router = TestBed.inject(Router);
  spyOn(router, 'navigate');

  const fixture = TestBed.createComponent(UsuarioFormComponent);
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance, serviceSpy, router };
}

describe('UsuarioFormComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create in new mode when no id param is present', async () => {
    const { fixture, component } = await setup(null);

    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.parametroInvalido).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Novo Usuário');
  });

  it('should initialize form controls and load role options', async () => {
    const { component, serviceSpy } = await setup(null);

    ['name', 'email', 'password', 'role'].forEach(ctrl => {
      expect(component.form.contains(ctrl)).toBeTrue();
    });
    expect(serviceSpy.listarRoles).toHaveBeenCalled();
    expect(component.roles).toEqual([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]);
  });

  it('should keep local role options when role loading fails', async () => {
    const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>(
      'UsuarioAdminService',
      ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
    );
    serviceSpy.listarRoles.and.returnValue(throwError(() => new Error('fail')));
    serviceSpy.buscar.and.returnValue(of(mockUsuario));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));

    const { component } = await setup(null, serviceSpy);

    expect(component.roles).toEqual([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]);
  });

  it('should fall back to ROLE_OPTIONS when listarRoles returns an empty array', async () => {
    const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>(
      'UsuarioAdminService',
      ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
    );
    serviceSpy.listarRoles.and.returnValue(of([]));
    serviceSpy.buscar.and.returnValue(of(mockUsuario));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));

    const { component } = await setup(null, serviceSpy);

    expect(component.roles).toEqual([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]);
  });

  it('should not call listarRoles when route id is invalid', async () => {
    const { serviceSpy } = await setup('abc');

    expect(serviceSpy.listarRoles).not.toHaveBeenCalled();
  });

  it('should call cadastrar and navigate on valid submit', async () => {
    const { component, serviceSpy, router } = await setup(null);
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(serviceSpy.cadastrar).toHaveBeenCalledWith({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/admin/usuarios']);
  });

  it('should preserve whitespace in password instead of trimming it', async () => {
    const { component, serviceSpy } = await setup(null);
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha 12 ',
      role: 'USER'
    });

    component.salvar();

    expect(serviceSpy.cadastrar).toHaveBeenCalledWith(jasmine.objectContaining({
      password: 'senha 12 '
    }));
  });

  it('should not call service when creating with invalid form', async () => {
    const { component, serviceSpy } = await setup(null);

    component.salvar();

    expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should block submit when email is invalid', async () => {
    const { component, serviceSpy } = await setup(null);
    component.form.patchValue({
      name: 'João Usuário',
      email: 'nao-eh-email',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.form.get('email')?.errors?.['email']).toBeTruthy();
    expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
  });

  it('should block submit when name is shorter than minlength', async () => {
    const { component, serviceSpy } = await setup(null);
    component.form.patchValue({
      name: 'Jo',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.form.get('name')?.errors?.['minlength']).toBeTruthy();
    expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
  });

  it('should not call cadastrar twice on rapid double-submit', async () => {
    const { component, serviceSpy } = await setup(null);
    const cadastrarSubject = new Subject<UsuarioAdminResponseDTO>();
    serviceSpy.cadastrar.and.returnValue(cadastrarSubject.asObservable());
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();
    component.salvar();

    expect(serviceSpy.cadastrar).toHaveBeenCalledTimes(1);
    cadastrarSubject.complete();
  });

  it('should set erro on cadastrar failure', async () => {
    const { component, serviceSpy } = await setup(null);
    serviceSpy.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.erro).toBe('Erro ao salvar usuário.');
    expect(component.salvando).toBeFalse();
  });

  it('should map 409 conflict to a duplicate-email message', async () => {
    const { component, serviceSpy } = await setup(null);
    serviceSpy.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.erro).toBe('Já existe um usuário com este e-mail.');
  });

  it('should map 400 bad request using backend message when available', async () => {
    const { component, serviceSpy } = await setup(null);
    serviceSpy.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Senha fraca.' }
    })));
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.erro).toBe('Senha fraca.');
  });

  it('should switch to edit mode and load user data when a valid id param is present', async () => {
    const { fixture, component, serviceSpy } = await setup('42');

    expect(component.isEdit).toBeTrue();
    expect(component.usuarioId).toBe(42);
    expect(component.parametroInvalido).toBeFalse();
    expect(serviceSpy.buscar).toHaveBeenCalledWith(42);
    expect(component.form.get('name')?.value).toBe('Maria Admin');
    expect(component.form.get('email')?.value).toBe('maria@carlessopilates.com');
    expect(component.form.get('role')?.value).toBe('ADMIN');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Editar Usuário');
  });

  it('should keep password optional in edit mode', async () => {
    const { component } = await setup('42');

    component.form.patchValue({ password: '' });

    expect(component.form.get('password')?.valid).toBeTrue();
  });

  it('should still enforce password minlength in edit mode when filled', async () => {
    const { component } = await setup('42');

    component.form.patchValue({ password: '123' });

    expect(component.form.get('password')?.errors?.['minlength']).toBeTruthy();
  });

  it('should call atualizar without password when edit password is blank', async () => {
    const { component, serviceSpy, router } = await setup('42');

    component.salvar();

    expect(serviceSpy.atualizar).toHaveBeenCalledWith(42, {
      name: 'Maria Admin',
      email: 'maria@carlessopilates.com',
      role: 'ADMIN'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/admin/usuarios']);
  });

  it('should call atualizar with password when edit password is provided', async () => {
    const { component, serviceSpy } = await setup('42');
    component.form.patchValue({ password: 'novaSenha123' });

    component.salvar();

    expect(serviceSpy.atualizar).toHaveBeenCalledWith(42, jasmine.objectContaining({
      password: 'novaSenha123'
    }));
  });

  it('should set erro on atualizar failure', async () => {
    const { component, serviceSpy } = await setup('42');
    serviceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component.salvar();

    expect(component.erro).toBe('Erro ao salvar usuário.');
    expect(component.salvando).toBeFalse();
  });

  it('should set erro when buscar fails', async () => {
    const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>(
      'UsuarioAdminService',
      ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
    );
    serviceSpy.listarRoles.and.returnValue(of([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]));
    serviceSpy.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));

    const { component } = await setup('42', serviceSpy);

    expect(component.erro).toBe('Erro ao carregar usuário.');
    expect(component.loading).toBeFalse();
  });

  it('should map 404 on buscar to a not-found message', async () => {
    const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>(
      'UsuarioAdminService',
      ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
    );
    serviceSpy.listarRoles.and.returnValue(of([
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ]));
    serviceSpy.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));

    const { component } = await setup('42', serviceSpy);

    expect(component.erro).toBe('Usuário não encontrado.');
  });

  it('should flag invalid id parameters and show error message', async () => {
    const { fixture, component, serviceSpy } = await setup('abc');

    expect(component.parametroInvalido).toBeTrue();
    expect(component.isEdit).toBeFalse();
    expect(serviceSpy.buscar).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-danger')?.textContent)
      .toContain('Identificador inválido.');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('should not call cadastrar when saving with invalid route param', async () => {
    const { component, serviceSpy } = await setup('abc');
    component.form.patchValue({
      name: 'João Usuário',
      email: 'joao@carlessopilates.com',
      password: 'senha1234',
      role: 'USER'
    });

    component.salvar();

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    expect(serviceSpy.atualizar).not.toHaveBeenCalled();
  });

  // O SVG do data URI não tem tamanho intrínseco: sem `background-size` o CSS
  // ajusta a seta por *contain* à altura do campo e ela vira 60×40px (issue
  // #200). O guard falha com `Expected 'auto' to be '12px 8px'` no CSS antigo.
  it('should size the select chevron at 12x8px regardless of the field height (issue #200)', async () => {
    const { fixture } = await setup('42');
    document.body.appendChild(fixture.nativeElement);

    try {
      const select = (fixture.nativeElement as HTMLElement).querySelector('select#role') as HTMLElement;
      const estilo = getComputedStyle(select);

      expect(estilo.backgroundSize).toBe('12px 8px');
      expect(estilo.backgroundImage).not.toBe('none');
      expect(estilo.paddingRight).toBe('36px');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // A regra `:disabled` do campo global usava a shorthand `background`, que
  // redefine todas as propriedades de fundo e zerava o `background-image` —
  // com `appearance: none` já aplicado, o select desabilitado ficava sem seta
  // nenhuma (issue #200).
  it('should keep the chevron on a disabled select (issue #200)', async () => {
    const { fixture, component } = await setup('42');
    component.form.get('role')?.disable();
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    try {
      const select = (fixture.nativeElement as HTMLElement).querySelector('select#role') as HTMLSelectElement;
      const estilo = getComputedStyle(select);

      expect(select.disabled).toBeTrue();
      expect(estilo.backgroundImage).not.toBe('none');
      expect(estilo.backgroundSize).toBe('12px 8px');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // O stroke vive dentro do data URI e não aceita `var()`, então o tema escuro
  // troca o token inteiro: o grafite do tema claro rende ~2:1 sobre `--bg-elev`
  // escuro, abaixo dos 3:1 da WCAG 1.4.11 para componentes (issue #200).
  it('should swap the chevron token for the light stroke in dark theme (issue #200)', async () => {
    const { fixture } = await setup('42');
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const select = (fixture.nativeElement as HTMLElement).querySelector('select#role') as HTMLElement;

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(select).backgroundImage).toContain('455157');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(select).backgroundImage).toContain('b9bcc1');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('should render link back to user list', async () => {
    const { fixture } = await setup(null);

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/admin/usuarios"]');
    expect(link).toBeTruthy();
  });

  const invalidIds = ['0', '-1', '1.5', '9007199254740992'];
  for (const id of invalidIds) {
    it(`should flag '${id}' as an invalid id`, async () => {
      const { component } = await setup(id);

      expect(component.parametroInvalido).toBeTrue();
      expect(component.isEdit).toBeFalse();
    });
  }
});
