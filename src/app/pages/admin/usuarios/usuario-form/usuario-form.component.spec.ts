import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
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
    serviceSpy.listarRoles.and.returnValue(of(['ADMIN', 'USER']));
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

  it('should not call service when creating with invalid form', async () => {
    const { component, serviceSpy } = await setup(null);

    component.salvar();

    expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should set erro on cadastrar failure', async () => {
    const { component, serviceSpy } = await setup(null);
    serviceSpy.cadastrar.and.returnValue(throwError(() => new Error('fail')));
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
    serviceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

    component.salvar();

    expect(component.erro).toBe('Erro ao salvar usuário.');
    expect(component.salvando).toBeFalse();
  });

  it('should set erro when buscar fails', async () => {
    const serviceSpy = jasmine.createSpyObj<UsuarioAdminService>(
      'UsuarioAdminService',
      ['buscar', 'cadastrar', 'atualizar', 'listarRoles']
    );
    serviceSpy.listarRoles.and.returnValue(of(['ADMIN', 'USER']));
    serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
    serviceSpy.cadastrar.and.returnValue(of(mockUsuario));
    serviceSpy.atualizar.and.returnValue(of(mockUsuario));

    const { component } = await setup('42', serviceSpy);

    expect(component.erro).toBe('Erro ao carregar usuário.');
    expect(component.loading).toBeFalse();
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
