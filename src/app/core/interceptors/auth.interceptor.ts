import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Endpoints de autenticação: não recebem `Authorization` e um `401` neles é
 * resposta do próprio fluxo (credencial ou refresh token inválido), nunca
 * motivo para tentar renovar a sessão.
 */
const ROTAS_DE_AUTENTICACAO = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password'
];

/** Respostas do refresh que significam "a sessão acabou" (e não falha transitória). */
const STATUS_REFRESH_REJEITADO = [400, 401];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isRotaDeAutenticacao(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const tokenEnviado = authService.getToken();

  return next(comToken(req, tokenEnviado)).pipe(
    catchError((error: unknown) => {
      if (!tokenEnviado || !(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return obterNovoToken(authService, tokenEnviado).pipe(
        catchError((refreshError: unknown) => {
          if (isRefreshRejeitado(refreshError)) {
            authService.logout();
            return throwError(() => error);
          }
          return throwError(() => refreshError);
        }),
        // A retentativa vai direto para `next`, sem passar de novo por este
        // interceptor: se ela também receber `401`, o erro sobe sem outro refresh.
        switchMap(novoToken => next(comToken(req, novoToken)))
      );
    })
  );
};

/**
 * Se outra requisição já renovou a sessão depois que esta saiu, reaproveita o
 * token novo em vez de rotacionar o refresh token mais uma vez.
 */
function obterNovoToken(authService: AuthService, tokenEnviado: string): Observable<string> {
  const tokenAtual = authService.getToken();
  if (tokenAtual && tokenAtual !== tokenEnviado) {
    return of(tokenAtual);
  }
  return authService.refresh().pipe(map(res => res.accessToken));
}

function comToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function isRotaDeAutenticacao(url: string): boolean {
  const caminho = url.split('?')[0];
  return ROTAS_DE_AUTENTICACAO.some(rota => caminho.endsWith(rota));
}

/** Refresh recusado pela API ou impossível (sem refresh token guardado). */
function isRefreshRejeitado(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return STATUS_REFRESH_REJEITADO.includes(error.status);
  }
  return true;
}
