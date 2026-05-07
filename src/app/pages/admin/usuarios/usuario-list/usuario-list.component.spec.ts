import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { UsuarioListComponent } from './usuario-list.component';
import { UsuarioAdminService } from '../../../../core/services/usuario-admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioAdminPage, UsuarioAdminResponseDTO } from '../../../../core/models/usuario-admin';

const mockUsuario: UsuarioAdminResponseDTO = {
  id: 1,
  name: 'Maria Admin',
  email: 'maria@carlessopilates.com',
  role: 'ADMIN',
  active: true
};

const mockUsuarioInativo: UsuarioAdminResponseDTO = {
  id: 2,
  name: 'João Inativo',
  email: 'joao@carlessopilates.com',
  role: 'USER',
  active: false
};

const mockPage: UsuarioAdminPage = {
  content: [mockUsuario, mockUsuarioInativo],
  page: { totalElements: 2, totalPages: 1, size: 10, number: 0 }
};

describe('UsuarioListComponent', () => {
  let component: UsuarioListComponent;
  let fixture: ComponentFixture<UsuarioListComponent>;
  let serviceSpy: jasmine.SpyObj<UsuarioAdminService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('UsuarioAdminService', [
      'listar',
      'inativar',
      'ativar',
      'excluir'
    ]);
    serviceSpy.listar.and.returnValue(of(mockPage));

    authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({
      id: 99,
      name: 'Logado',
      email: 'logado@carlessopilates.com',
      role: 'ADMIN'
    });

    await TestBed.configureTestingModule({
      imports: [UsuarioListComponent, RouterTestingModule],
      providers: [
        { provide: UsuarioAdminService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load usuarios on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10);
    expect(component.usuarios).toEqual([mockUsuario, mockUsuarioInativo]);
    expect(component.totalPages).toBe(1);
    expect(component.currentPage).toBe(0);
    expect(component.loading).toBeFalse();
  });

  it('should render the new user button linking to /admin/usuarios/novo', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/admin/usuarios/novo"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Novo Usuário');
  });

  it('should render edit link for each user using /admin/usuarios/:id/editar', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/admin/usuarios/1/editar"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Editar');
  });

  it('should render name, email, role label and status', () => {
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Maria Admin');
    expect(rows[0].textContent).toContain('maria@carlessopilates.com');
    expect(rows[0].textContent).toContain('Administrador');
    expect(rows[0].textContent).toContain('Ativo');

    expect(rows[1].textContent).toContain('João Inativo');
    expect(rows[1].textContent).toContain('Usuário');
    expect(rows[1].textContent).toContain('Inativo');
  });

  it('should show loading state during request', () => {
    serviceSpy.listar.and.returnValue(of(mockPage));
    component.loading = true;
    component.usuarios = [];
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.loading')?.textContent).toContain('Carregando');
  });

  it('should show empty state when no usuarios are returned', () => {
    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of({
      content: [],
      page: { totalElements: 0, totalPages: 0, size: 10, number: 0 }
    }));

    component.carregar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')?.textContent).toContain('Nenhum usuário cadastrado');
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar usuários.');
    expect(component.loading).toBeFalse();
  });

  it('should sync currentPage and pageSize with API metadata', () => {
    const response: UsuarioAdminPage = {
      content: [mockUsuario],
      page: { totalElements: 41, totalPages: 3, size: 20, number: 2 }
    };

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of(response));

    component.currentPage = 1;
    component.pageSize = 10;
    component.carregar();

    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10);
    expect(component.currentPage).toBe(2);
    expect(component.pageSize).toBe(20);
    expect(component.totalPages).toBe(3);
  });

  it('should backtrack one page when currentPage exceeds totalPages', () => {
    const overflow: UsuarioAdminPage = {
      content: [],
      page: { totalElements: 10, totalPages: 1, size: 10, number: 5 }
    };
    const recovered: UsuarioAdminPage = {
      content: [mockUsuario],
      page: { totalElements: 10, totalPages: 1, size: 10, number: 0 }
    };

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValues(of(overflow), of(recovered));

    component.currentPage = 5;
    component.carregar();

    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should change currentPage and reload when pagina is called with a valid page', () => {
    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of({
      content: [mockUsuario],
      page: { totalElements: 21, totalPages: 3, size: 10, number: 1 }
    }));

    component.totalPages = 3;
    component.pagina(1);

    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10);
  });

  it('should ignore invalid or current page when pagina is called', () => {
    serviceSpy.listar.calls.reset();
    component.totalPages = 3;
    component.currentPage = 1;

    component.pagina(-1);
    component.pagina(1);
    component.pagina(3);

    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).not.toHaveBeenCalled();
  });

  it('should return a sliding window of up to five page indices', () => {
    component.totalPages = 10;

    component.currentPage = 0;
    expect(component.pages()).toEqual([0, 1, 2, 3, 4]);

    component.currentPage = 4;
    expect(component.pages()).toEqual([2, 3, 4, 5, 6]);

    component.currentPage = 9;
    expect(component.pages()).toEqual([5, 6, 7, 8, 9]);
  });

  it('should ask for confirmation before inativar', () => {
    component.confirmarAcao('inativar', mockUsuario);
    expect(component.confirmacao).toEqual({ acao: 'inativar', usuario: mockUsuario });
    expect(component.mensagemConfirmacao()).toContain('inativação');
    expect(component.mensagemConfirmacao()).toContain('Maria Admin');
  });

  it('should clear confirmacao when cancelarConfirmacao is called', () => {
    component.confirmacao = { acao: 'inativar', usuario: mockUsuario };
    component.cancelarConfirmacao();
    expect(component.confirmacao).toBeNull();
  });

  it('should call inativar and reload when executarConfirmacao runs for inativar', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    serviceSpy.listar.calls.reset();

    component.confirmacao = { acao: 'inativar', usuario: mockUsuario };
    component.executarConfirmacao();

    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.confirmacao).toBeNull();
  });

  it('should call ativar and reload when executarConfirmacao runs for ativar', () => {
    serviceSpy.ativar.and.returnValue(of(undefined));
    serviceSpy.listar.calls.reset();

    component.confirmacao = { acao: 'ativar', usuario: mockUsuarioInativo };
    component.executarConfirmacao();

    expect(serviceSpy.ativar).toHaveBeenCalledWith(2);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.confirmacao).toBeNull();
  });

  it('should call excluir and reload when executarConfirmacao runs for excluir', () => {
    serviceSpy.excluir.and.returnValue(of(undefined));
    serviceSpy.listar.calls.reset();

    component.confirmacao = { acao: 'excluir', usuario: mockUsuario };
    component.executarConfirmacao();

    expect(serviceSpy.excluir).toHaveBeenCalledWith(1);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.confirmacao).toBeNull();
  });

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmacao = { acao: 'inativar', usuario: mockUsuario };
    component.executarConfirmacao();
    expect(component.erro).toBe('Erro ao inativar usuário.');
    expect(component.confirmacao).toBeNull();
  });

  it('should set erro when ativar fails', () => {
    serviceSpy.ativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmacao = { acao: 'ativar', usuario: mockUsuarioInativo };
    component.executarConfirmacao();
    expect(component.erro).toBe('Erro ao reativar usuário.');
  });

  it('should set erro when excluir fails', () => {
    serviceSpy.excluir.and.returnValue(throwError(() => new Error('fail')));
    component.confirmacao = { acao: 'excluir', usuario: mockUsuario };
    component.executarConfirmacao();
    expect(component.erro).toBe('Erro ao excluir usuário.');
  });

  it('should not call any service when executarConfirmacao runs with no confirmacao set', () => {
    serviceSpy.inativar.calls.reset();
    serviceSpy.ativar.calls.reset();
    serviceSpy.excluir.calls.reset();
    component.confirmacao = null;
    component.executarConfirmacao();
    expect(serviceSpy.inativar).not.toHaveBeenCalled();
    expect(serviceSpy.ativar).not.toHaveBeenCalled();
    expect(serviceSpy.excluir).not.toHaveBeenCalled();
  });

  it('should disable inativar/excluir buttons for the currently logged-in user', () => {
    authSpy.getCurrentUser.and.returnValue({
      id: mockUsuario.id,
      name: mockUsuario.name,
      email: mockUsuario.email,
      role: 'ADMIN'
    });

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const firstRow = el.querySelectorAll('tbody tr')[0];
    const buttons = firstRow.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => expect(btn.hasAttribute('disabled')).toBeTrue());
  });

  it('should render a Reativar button for inactive users and an Inativar button for active users', () => {
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('tbody tr');

    expect(rows[0].textContent).toContain('Inativar');
    expect(rows[0].textContent).not.toContain('Reativar');
    expect(rows[1].textContent).toContain('Reativar');
    expect(rows[1].textContent).not.toContain('Inativar');
  });

  it('should render a back link to /admin', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/admin"]');
    expect(link).toBeTruthy();
  });

  it('should render only visible page buttons in the DOM', () => {
    component.totalPages = 500;
    component.currentPage = 250;
    component.visiblePages = component.pages();

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    expect(buttons.length).toBe(5);
  });
});
