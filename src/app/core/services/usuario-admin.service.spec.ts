import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsuarioAdminService } from './usuario-admin.service';
import {
  RoleOption,
  UsuarioAdminCreateRequestDTO,
  UsuarioAdminPage,
  UsuarioAdminResponseDTO,
  UsuarioAdminUpdateRequestDTO
} from '../models/usuario-admin';

const mockUsuario: UsuarioAdminResponseDTO = {
  id: 1,
  name: 'Maria Admin',
  email: 'maria@carlessopilates.com',
  role: 'ADMIN',
  active: true
};

const mockPage: UsuarioAdminPage = {
  content: [mockUsuario],
  page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
};

describe('UsuarioAdminService', () => {
  let service: UsuarioAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsuarioAdminService]
    });
    service = TestBed.inject(UsuarioAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/users with default params', () => {
    service.listar().subscribe(page => expect(page.content).toEqual([mockUsuario]));

    const req = httpMock.expectOne(r => r.url === '/api/users');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('name');
    req.flush(mockPage);
  });

  it('should GET /api/users with custom page and size', () => {
    service.listar(2, 20).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/users');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('name');
    req.flush(mockPage);
  });

  it('should GET /api/users with custom sort', () => {
    service.listar(0, 10, 'email').subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/users');
    expect(req.request.params.get('sort')).toBe('email');
    req.flush(mockPage);
  });

  it('should GET /api/users/:id', () => {
    service.buscar(1).subscribe(usuario => expect(usuario).toEqual(mockUsuario));

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsuario);
  });

  it('should GET /api/users/me', () => {
    service.buscarPerfil().subscribe(usuario => expect(usuario).toEqual(mockUsuario));

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsuario);
  });

  it('should POST /api/users', () => {
    const dto: UsuarioAdminCreateRequestDTO = {
      name: 'Maria Admin',
      email: 'maria@carlessopilates.com',
      password: 'senhaSegura123',
      role: 'ADMIN'
    };

    service.cadastrar(dto).subscribe(usuario => expect(usuario).toEqual(mockUsuario));

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockUsuario);
  });

  it('should PUT /api/users/:id', () => {
    const dto: UsuarioAdminUpdateRequestDTO = { name: 'Maria Atualizada', role: 'USER' };

    service.atualizar(1, dto).subscribe(usuario => expect(usuario).toEqual(mockUsuario));

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockUsuario);
  });

  it('should DELETE /api/users/:id', () => {
    service.excluir(1).subscribe();

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should PATCH /api/users/:id/ativar', () => {
    service.ativar(1).subscribe();

    const req = httpMock.expectOne('/api/users/1/ativar');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('should PATCH /api/users/:id/inativar', () => {
    service.inativar(1).subscribe();

    const req = httpMock.expectOne('/api/users/1/inativar');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('should GET /api/users/roles', () => {
    const mockRoles: RoleOption[] = [
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'USER', label: 'Usuário' }
    ];

    service.listarRoles().subscribe(roles => expect(roles).toEqual(mockRoles));

    const req = httpMock.expectOne('/api/users/roles');
    expect(req.request.method).toBe('GET');
    req.flush(mockRoles);
  });
});
