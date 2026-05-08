import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_INVALID_BODY_CODES = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'TOKEN_INVALID'];
const TOKEN_INVALID_HEADER_HINTS = ['invalid_token', 'expired_token'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isLoginRequest = req.url.includes('/auth/login');

  if (token && !isLoginRequest) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        !isLoginRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.isAuthenticated() &&
        isTokenInvalidResponse(error)
      ) {
        authService.logout();
      }

      return throwError(() => error);
    })
  );
};

function isTokenInvalidResponse(error: HttpErrorResponse): boolean {
  const wwwAuthenticate = error.headers?.get('WWW-Authenticate') ?? '';
  if (wwwAuthenticate) {
    const lowered = wwwAuthenticate.toLowerCase();
    if (TOKEN_INVALID_HEADER_HINTS.some(hint => lowered.includes(hint))) {
      return true;
    }
  }

  const body = error.error;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const code = (body as { code?: unknown }).code;
    if (typeof code === 'string' && TOKEN_INVALID_BODY_CODES.includes(code.toUpperCase())) {
      return true;
    }
  }

  return false;
}
