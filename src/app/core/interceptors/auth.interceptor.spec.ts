import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withXhr
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
        provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
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

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  function refreshResponse(accessToken: string, refreshToken: string) {
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: { id: 1, name: 'Admin', email: 'admin@carlessopilates.com', roles: ['ADMIN'] }
    };
  }

  function iniciarSessao(accessToken = 'old-access', refreshToken = 'old-refresh'): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  it('should refresh the session on 401 and retry the request once with the new token', () => {
    iniciarSessao();
    const navigateSpy = spyOn(router, 'navigate');
    let body: unknown;
    let failed = false;

    http.get('/api/pacientes').subscribe({ next: res => body = res, error: () => failed = true });

    const original = httpMock.expectOne('/api/pacientes');
    expect(original.request.headers.get('Authorization')).toBe('Bearer old-access');
    original.flush(null, unauthorized);

    const refresh = httpMock.expectOne('/api/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'old-refresh' });
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    refresh.flush(refreshResponse('new-access', 'new-refresh'));

    const retry = httpMock.expectOne('/api/pacientes');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush([{ id: 1 }]);

    expect(body).toEqual([{ id: 1 }]);
    expect(failed).toBeFalse();
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should fire a single refresh for concurrent 401 responses and retry all of them', () => {
    iniciarSessao();
    const urls = ['/api/pacientes', '/api/aulas', '/api/pagamentos'];
    const results: unknown[] = [];

    urls.forEach(url => http.get(url).subscribe(res => results.push(res)));
    urls.forEach(url => httpMock.expectOne(url).flush(null, unauthorized));

    httpMock.expectOne('/api/auth/refresh').flush(refreshResponse('new-access', 'new-refresh'));

    urls.forEach(url => {
      const retry = httpMock.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      retry.flush(url);
    });

    expect(results).toEqual(urls);
  });

  it('should reuse a token renewed meanwhile instead of refreshing again', () => {
    iniciarSessao();
    let result: unknown;

    http.get('/api/pacientes').subscribe();
    http.get('/api/aulas').subscribe(res => result = res);
    const aulas = httpMock.expectOne('/api/aulas');

    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh').flush(refreshResponse('new-access', 'new-refresh'));
    httpMock.expectOne('/api/pacientes').flush([]);

    // A resposta de /aulas, enviada com o token antigo, chega depois do refresh.
    aulas.flush(null, unauthorized);
    httpMock.expectNone('/api/auth/refresh');

    const retry = httpMock.expectOne('/api/aulas');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush('ok');
    expect(result).toBe('ok');
  });

  it('should logout and propagate the original error when the refresh is rejected', () => {
    iniciarSessao();
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });

    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh')
      .flush({ erro: 'Refresh token inválido ou expirado' }, unauthorized);
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    httpMock.expectNone('/api/pacientes');
  });

  it('should logout when the refresh answers 400', () => {
    iniciarSessao();
    const navigateSpy = spyOn(router, 'navigate');

    http.get('/api/pacientes').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 400, statusText: 'Bad Request' });
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should logout without calling the API when there is no refresh token stored', () => {
    localStorage.setItem('accessToken', 'old-access');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });
    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);

    httpMock.expectNone('/api/auth/refresh');
    expect(errorStatus).toBe(401);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should keep the session and propagate the refresh error when it is transient', () => {
    iniciarSessao();
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });

    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 503, statusText: 'Unavailable' });

    expect(errorStatus).toBe(503);
    expect(localStorage.getItem('refreshToken')).toBe('old-refresh');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not refresh again when the retried request also gets 401', () => {
    iniciarSessao();
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });

    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh').flush(refreshResponse('new-access', 'new-refresh'));
    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);

    httpMock.expectNone('/api/auth/refresh');
    httpMock.expectNone('/api/pacientes');
    expect(errorStatus).toBe(401);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not refresh on 403', () => {
    iniciarSessao();
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });
    httpMock.expectOne('/api/pacientes').flush(null, { status: 403, statusText: 'Forbidden' });

    httpMock.expectNone('/api/auth/refresh');
    expect(errorStatus).toBe(403);
    expect(localStorage.getItem('accessToken')).toBe('old-access');
  });

  ['login', 'refresh', 'logout', 'forgot-password', 'reset-password'].forEach(rota => {
    it(`should neither add Authorization nor refresh on /auth/${rota}`, () => {
      iniciarSessao();
      const navigateSpy = spyOn(router, 'navigate');
      let errorStatus: number | undefined;

      http.post(`/api/auth/${rota}`, {}).subscribe({ error: err => errorStatus = err.status });

      const req = httpMock.expectOne(`/api/auth/${rota}`);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush(null, unauthorized);

      expect(errorStatus).toBe(401);
      httpMock.expectNone('/api/auth/refresh');
      expect(localStorage.getItem('accessToken')).toBe('old-access');
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  it('should not refresh when there is no active session', () => {
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/pacientes').subscribe({ error: err => errorStatus = err.status });
    httpMock.expectOne('/api/pacientes').flush(null, unauthorized);

    httpMock.expectNone('/api/auth/refresh');
    expect(errorStatus).toBe(401);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
