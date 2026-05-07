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
    tokenType: 'Bearer',
    user: {
      id: 1,
      name: 'Admin',
      email: 'admin@carlessopilates.com',
      role: 'ADMIN' as const,
      active: true
    }
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

    const stored = JSON.parse(localStorage.getItem('currentUser')!);
    expect(stored.id).toBe(1);
    expect(stored.name).toBe('Admin');
    expect(stored.email).toBe('admin@carlessopilates.com');
    expect(stored.role).toBe('ADMIN');
    expect(stored.active).toBeTrue();
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
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN' }));
    const spy = spyOn(router, 'navigate');
    service.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('clearSession() should remove token and user data without navigation', () => {
    localStorage.setItem('accessToken', 'abc');
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN' }));
    const spy = spyOn(router, 'navigate');

    service.clearSession();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('getCurrentUser() should return parsed user from localStorage', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN' }));
    const user = service.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.id).toBe(1);
    expect(user!.name).toBe('Admin');
    expect(user!.email).toBe('admin@carlessopilates.com');
    expect(user!.role).toBe('ADMIN');
  });

  it('getCurrentUser() should return null when no user stored', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('getCurrentUser() should return null when stored value is invalid JSON', () => {
    localStorage.setItem('currentUser', 'invalid-json');
    expect(service.getCurrentUser()).toBeNull();
  });

  it('getCurrentUser() should return null when stored value has invalid shape', () => {
    localStorage.setItem('currentUser', JSON.stringify({ role: 'ADMIN' }));
    expect(service.getCurrentUser()).toBeNull();

    localStorage.setItem('currentUser', JSON.stringify([]));
    expect(service.getCurrentUser()).toBeNull();
  });

  it('getCurrentUserRole() should return the current user role', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN' }));
    expect(service.getCurrentUserRole()).toBe('ADMIN');
  });

  it('getCurrentUserRole() should return null when no valid user is stored', () => {
    expect(service.getCurrentUserRole()).toBeNull();
  });

  it('isAdmin() should return true only for ADMIN users', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN' }));
    expect(service.isAdmin()).toBeTrue();

    localStorage.setItem('currentUser', JSON.stringify({ id: 2, name: 'User', email: 'user@carlessopilates.com', role: 'USER' }));
    expect(service.isAdmin()).toBeFalse();
  });

  it('hasRole() should validate the current user role', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 2, name: 'User', email: 'user@carlessopilates.com', role: 'USER' }));
    expect(service.hasRole('USER')).toBeTrue();
    expect(service.hasRole('ADMIN')).toBeFalse();
  });
});
