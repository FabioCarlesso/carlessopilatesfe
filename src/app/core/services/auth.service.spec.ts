import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const loginResponse = {
    accessToken: 'token123',
    nome: 'Admin',
    email: 'admin@carlessopilates.com',
    perfil: 'ADMIN'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store token on successful login', () => {
    service.login({ email: 'admin@carlessopilates.com', password: 'senha1234' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(loginResponse);

    expect(localStorage.getItem('accessToken')).toBe('token123');
  });

  it('should store user data on successful login', () => {
    service.login({ email: 'admin@carlessopilates.com', password: 'senha1234' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(loginResponse);

    const stored = JSON.parse(localStorage.getItem('usuarioLogado')!);
    expect(stored.nome).toBe('Admin');
    expect(stored.email).toBe('admin@carlessopilates.com');
    expect(stored.perfil).toBe('ADMIN');
  });

  it('should return token from localStorage', () => {
    localStorage.setItem('accessToken', 'abc');
    expect(service.getToken()).toBe('abc');
  });

  it('should return null when no token', () => {
    expect(service.getToken()).toBeNull();
  });

  it('isAuthenticated() should return true when token exists', () => {
    localStorage.setItem('accessToken', 'abc');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('isAuthenticated() should return false when no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logout() should remove token and user data and navigate to /login', () => {
    localStorage.setItem('accessToken', 'abc');
    localStorage.setItem('usuarioLogado', JSON.stringify({ nome: 'Admin', email: 'admin@carlessopilates.com', perfil: 'ADMIN' }));
    const spy = spyOn(router, 'navigate');
    service.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('usuarioLogado')).toBeNull();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('getUsuario() should return parsed user from localStorage', () => {
    localStorage.setItem('usuarioLogado', JSON.stringify({ nome: 'Admin', email: 'admin@carlessopilates.com', perfil: 'ADMIN' }));
    const usuario = service.getUsuario();
    expect(usuario).not.toBeNull();
    expect(usuario!.nome).toBe('Admin');
    expect(usuario!.email).toBe('admin@carlessopilates.com');
    expect(usuario!.perfil).toBe('ADMIN');
  });

  it('getUsuario() should return null when no user stored', () => {
    expect(service.getUsuario()).toBeNull();
  });

  it('getUsuario() should return null when stored value is invalid JSON', () => {
    localStorage.setItem('usuarioLogado', 'invalid-json');
    expect(service.getUsuario()).toBeNull();
  });
});
