import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store token on successful login', () => {
    service.login({ email: 'admin@carlessopilates.com', password: 'senha1234' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: 'token123' });

    expect(localStorage.getItem('accessToken')).toBe('token123');
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

  it('logout() should remove token and navigate to /login', () => {
    localStorage.setItem('accessToken', 'abc');
    const spy = spyOn(router, 'navigate');
    service.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });
});
