import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
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
      imports: [UsuarioListComponent],
      providers: [
        provideRouter([]),
        { provide: UsuarioAdminService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load usuarios on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10);
    expect(component.usuarios).toEqual([mockUsuario, mockUsuarioInativo]);
    expect(component.totalElements).toBe(2);
    expect(component.totalPages).toBe(1);
    expect(component.currentPage).toBe(0);
    expect(component.loading).toBeFalse();
  });

  it('should reset to first page and reload when page size changes', () => {
    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of({
      content: [mockUsuario, mockUsuarioInativo],
      page: { totalElements: 2, totalPages: 1, size: 20, number: 0 }
    }));
    component.currentPage = 2;

    component.alterarTamanhoPagina(20);

    expect(component.pageSize).toBe(20);
    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 20);
  });

  it('should ignore unsupported or unchanged page size', () => {
    serviceSpy.listar.calls.reset();

    component.alterarTamanhoPagina(10);
    component.alterarTamanhoPagina(15);

    expect(component.pageSize).toBe(10);
    expect(serviceSpy.listar).not.toHaveBeenCalled();
  });

  it('should render the pagination summary with total and page-size selector', () => {
    const summary = fixture.nativeElement.querySelector('app-pagination-summary');
    expect(summary).withContext('pagination summary must be present').toBeTruthy();

    const text = fixture.nativeElement.querySelector('.pagination-summary span');
    expect(text.textContent?.trim()).toBe('Exibindo 1-2 de 2 usuários');

    const select = fixture.nativeElement.querySelector('.pagination-summary select') as HTMLSelectElement;
    expect(select).withContext('page size select must be present').toBeTruthy();
    expect(select.value).toBe('10');
  });

  it('should wrap the table in a scroll container to keep overflow inside the card', () => {
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table.table');
    expect(table).toBeTruthy();
    expect(table.parentElement?.classList.contains('table-wrap')).toBeTrue();
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

  it('should ignore unsupported page sizes returned by the API', () => {
    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of({
      content: [mockUsuario],
      page: { totalElements: 1, totalPages: 1, size: 17, number: 0 }
    }));
    component.pageSize = 10;

    component.carregar();

    expect(component.pageSize).toBe(10);
    expect(component.pageSizeOptions).toContain(component.pageSize);
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

  it('should show sucesso with role status after inativar and clear it after timeout', fakeAsync(() => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.confirmacao = { acao: 'inativar', usuario: mockUsuario };
    component.executarConfirmacao();
    expect(component.sucesso).toBe('Usuário inativado com sucesso.');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert-success');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('role')).toBe('status');
    tick(4000);
    expect(component.sucesso).toBeNull();
  }));

  it('should show sucesso after ativar', fakeAsync(() => {
    serviceSpy.ativar.and.returnValue(of(undefined));
    component.confirmacao = { acao: 'ativar', usuario: mockUsuarioInativo };
    component.executarConfirmacao();
    expect(component.sucesso).toBe('Usuário reativado com sucesso.');
    tick(4000);
    expect(component.sucesso).toBeNull();
  }));

  it('should show sucesso after excluir', fakeAsync(() => {
    serviceSpy.excluir.and.returnValue(of(undefined));
    component.confirmacao = { acao: 'excluir', usuario: mockUsuario };
    component.executarConfirmacao();
    expect(component.sucesso).toBe('Usuário excluído com sucesso.');
    tick(4000);
    expect(component.sucesso).toBeNull();
  }));

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

    fixture = TestBed.createComponent(UsuarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const firstRow = el.querySelectorAll('tbody tr')[0];
    const buttons = firstRow.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => expect(btn.hasAttribute('disabled')).toBeTrue());
  });

  it('should keep the status text on a single line (no line wrapping)', () => {
    document.body.appendChild(fixture.nativeElement);
    try {
      const statuses = fixture.nativeElement.querySelectorAll('.status') as NodeListOf<HTMLElement>;
      expect(statuses.length).toBeGreaterThan(0);
      statuses.forEach(status => {
        expect(getComputedStyle(status).whiteSpace).toBe('nowrap');
      });
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
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

    const buttons = fixture.nativeElement.querySelectorAll('.pagination .page-number');
    expect(buttons.length).toBe(5);
  });

  it('should trigger executarConfirmacao when the dialog Confirmar button is clicked', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    serviceSpy.listar.calls.reset();

    component.confirmarAcao('inativar', mockUsuario);
    fixture.detectChanges();

    const confirmBtn = fixture.nativeElement.querySelector('.dialog .btn-danger') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();

    expect(serviceSpy.inativar).toHaveBeenCalledWith(mockUsuario.id);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.confirmacao).toBeNull();
  });

  it('should close the dialog when the Cancelar button is clicked', () => {
    component.confirmarAcao('excluir', mockUsuario);
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.dialog .btn-outline') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();

    expect(component.confirmacao).toBeNull();
    expect(serviceSpy.excluir).not.toHaveBeenCalled();
  });

  it('should close the dialog when the overlay is clicked', () => {
    component.confirmarAcao('excluir', mockUsuario);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.dialog-overlay') as HTMLElement;
    overlay.click();

    expect(component.confirmacao).toBeNull();
  });

  it('should not close the dialog when clicking inside the dialog content', () => {
    component.confirmarAcao('excluir', mockUsuario);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.dialog') as HTMLElement;
    dialog.click();

    expect(component.confirmacao).not.toBeNull();
  });

  it('should close the dialog when Escape is pressed', () => {
    component.confirmarAcao('excluir', mockUsuario);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.confirmacao).toBeNull();
  });

  it('should disable confirmar/cancelar buttons while a destructive action is in flight', () => {
    const inativarSubject = new Subject<void>();
    serviceSpy.inativar.and.returnValue(inativarSubject.asObservable());

    component.confirmarAcao('inativar', mockUsuario);
    fixture.detectChanges();

    component.executarConfirmacao();
    fixture.detectChanges();

    expect(component.acaoEmAndamento).toBeTrue();
    const buttons = fixture.nativeElement.querySelectorAll('.dialog button') as NodeListOf<HTMLButtonElement>;
    buttons.forEach(btn => expect(btn.disabled).toBeTrue());

    inativarSubject.next();
    inativarSubject.complete();
    expect(component.acaoEmAndamento).toBeFalse();
  });

  it('should ignore double-clicks on Confirmar while a request is in flight', () => {
    const inativarSubject = new Subject<void>();
    serviceSpy.inativar.and.returnValue(inativarSubject.asObservable());

    component.confirmarAcao('inativar', mockUsuario);
    component.executarConfirmacao();
    component.executarConfirmacao();
    component.executarConfirmacao();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    inativarSubject.next();
    inativarSubject.complete();
  });

  it('should ignore cancelarConfirmacao while a request is in flight', () => {
    const inativarSubject = new Subject<void>();
    serviceSpy.inativar.and.returnValue(inativarSubject.asObservable());

    component.confirmarAcao('inativar', mockUsuario);
    component.executarConfirmacao();
    component.cancelarConfirmacao();

    expect(component.confirmacao).not.toBeNull();
    inativarSubject.next();
    inativarSubject.complete();
  });

  it('should reset erro when opening a new confirmation dialog', () => {
    component.erro = 'Erro anterior';
    component.confirmarAcao('inativar', mockUsuario);
    expect(component.erro).toBeNull();
  });

  it('should not render Inativar/Reativar/Excluir buttons when active is undefined', () => {
    const usuarioDesconhecido: UsuarioAdminResponseDTO = {
      id: 3,
      name: 'Estado Desconhecido',
      email: 'desconhecido@carlessopilates.com',
      role: 'USER'
    };
    serviceSpy.listar.and.returnValue(of({
      content: [usuarioDesconhecido],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));
    component.carregar();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(row.textContent).toContain('—');
    expect(row.textContent).not.toContain('Inativar');
    expect(row.textContent).not.toContain('Reativar');
    expect(row.textContent).not.toContain('Excluir');
  });

  it('should not disable the Reativar button for the currently logged-in user', () => {
    authSpy.getCurrentUser.and.returnValue({
      id: mockUsuarioInativo.id,
      name: mockUsuarioInativo.name,
      email: mockUsuarioInativo.email,
      role: 'USER'
    });

    fixture = TestBed.createComponent(UsuarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const reativarRow = rows[1] as HTMLElement;
    const reativarBtn = Array.from(reativarRow.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Reativar')) as HTMLButtonElement;
    expect(reativarBtn).toBeTruthy();
    expect(reativarBtn.disabled).toBeFalse();
  });

  it('should expose aria attributes on the pagination buttons', () => {
    component.totalPages = 4;
    component.currentPage = 1;
    component.visiblePages = component.pages();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pagination .page-number') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-label')).toBe('Página 1');
    expect(buttons[1].getAttribute('aria-current')).toBe('page');
    expect(buttons[0].getAttribute('aria-current')).toBeNull();
  });
});
