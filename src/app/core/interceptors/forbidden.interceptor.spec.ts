import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import {
  forbiddenInterceptor,
  MENSAGEM_ACESSO_NEGADO,
  TRATA_403_LOCALMENTE
} from './forbidden.interceptor';
import { authInterceptor } from './auth.interceptor';
import { NotificacaoService } from '../services/notificacao.service';

describe('forbiddenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let notificacoes: NotificacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, forbiddenInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notificacoes = TestBed.inject(NotificacaoService);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should redirect to /403 when a GET (route data load) is forbidden', () => {
    localStorage.setItem('accessToken', 'token123');
    localStorage.setItem('currentUser', '{"id":1}');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.get('/api/relatorios/nfse').subscribe({
      error: err => errorStatus = err.status
    });

    httpMock.expectOne('/api/relatorios/nfse').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(errorStatus).toBe(403);
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
    expect(notificacoes.notificacao()).toBeNull();
  });

  it('should show the access denied message without navigating when an action is forbidden', () => {
    localStorage.setItem('accessToken', 'token123');
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.post('/api/pacientes', {}).subscribe({
      error: err => errorStatus = err.status
    });

    httpMock.expectOne('/api/pacientes').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(errorStatus).toBe(403);
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(notificacoes.notificacao()).toEqual({ tipo: 'erro', mensagem: MENSAGEM_ACESSO_NEGADO });
  });

  it('should keep the session (token and currentUser) on 403', () => {
    localStorage.setItem('accessToken', 'token123');
    localStorage.setItem('currentUser', '{"id":1}');
    spyOn(router, 'navigate');

    http.get('/api/pacientes').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/pacientes').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(localStorage.getItem('accessToken')).toBe('token123');
    expect(localStorage.getItem('currentUser')).toBe('{"id":1}');
  });

  it('should not handle 403 globally when the request opts out via HttpContext', () => {
    localStorage.setItem('accessToken', 'token123');
    const navigateSpy = spyOn(router, 'navigate');

    http
      .get('/api/api/nfse-emitidas/paciente/1', {
        context: new HttpContext().set(TRATA_403_LOCALMENTE, true)
      })
      .subscribe({ error: () => undefined });

    httpMock.expectOne('/api/api/nfse-emitidas/paciente/1').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(notificacoes.notificacao()).toBeNull();
  });

  it('should not handle 403 globally when there is no active session (e.g. login)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    let errorStatus: number | undefined;

    http.post('/api/auth/login', {}).subscribe({
      error: err => errorStatus = err.status
    });

    httpMock.expectOne('/api/auth/login').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(errorStatus).toBe(403);
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(notificacoes.notificacao()).toBeNull();
  });

  it('should ignore non-403 errors', () => {
    localStorage.setItem('accessToken', 'token123');
    const navigateSpy = spyOn(router, 'navigate');

    http.get('/api/pacientes').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/pacientes').flush(
      { message: 'Not found' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(notificacoes.notificacao()).toBeNull();
  });
});
