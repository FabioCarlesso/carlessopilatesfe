import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header when token is present', () => {
    localStorage.setItem('accessToken', 'token123');

    http.get('/api/pacientes').subscribe();

    const req = httpMock.expectOne('/api/pacientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token123');
    req.flush([]);
  });

  it('should not add Authorization header when no token', () => {
    http.get('/api/pacientes').subscribe();

    const req = httpMock.expectOne('/api/pacientes');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('should not add Authorization header for /auth/login', () => {
    localStorage.setItem('accessToken', 'token123');

    http.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ accessToken: 'new-token' });
  });

  it('should logout and redirect to /login when an authenticated request returns 401', () => {
    localStorage.setItem('accessToken', 'expired-token');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/pacientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer expired-token');
    req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should not logout when login returns 401', () => {
    localStorage.setItem('accessToken', 'old-token');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.post('/api/auth/login', {}).subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBe('old-token');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
