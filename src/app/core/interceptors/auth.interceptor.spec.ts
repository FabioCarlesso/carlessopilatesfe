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

  it('should logout when 401 response indicates invalid token via WWW-Authenticate header', () => {
    localStorage.setItem('accessToken', 'expired-token');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/pacientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer expired-token');
    req.flush(
      { message: 'Token expired' },
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' }
      }
    );

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should logout when 401 response body has token-invalid code', () => {
    localStorage.setItem('accessToken', 'expired-token');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/pacientes');
    req.flush(
      { code: 'TOKEN_EXPIRED', message: 'Token expired' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should NOT logout when 401 has no token-invalid hint (e.g. unknown route)', () => {
    localStorage.setItem('accessToken', 'valid-token');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.patch('/api/sessoes/1/realizar', {}).subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/sessoes/1/realizar');
    req.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBe('valid-token');
    expect(navigateSpy).not.toHaveBeenCalled();
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
    req.flush(
      { message: 'Invalid credentials' },
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' }
      }
    );

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBe('old-token');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not logout when there is no active session (no token in storage)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('/api/pacientes');
    req.flush(
      { code: 'TOKEN_EXPIRED' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(errorStatus).toBe(401);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
