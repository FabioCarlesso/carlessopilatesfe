import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacaoService } from '../services/notificacao.service';

/**
 * Marca requisições cujo `403` já é tratado pela própria tela (mensagem local).
 * Use `new HttpContext().set(TRATA_403_LOCALMENTE, true)` na chamada do serviço
 * para evitar mensagem duplicada ou redirecionamento indesejado.
 */
export const TRATA_403_LOCALMENTE = new HttpContextToken<boolean>(() => false);

export const MENSAGEM_ACESSO_NEGADO =
  'Acesso negado: você não tem permissão para realizar esta ação.';

/**
 * Trata `403` (usuário autenticado, sem permissão) de forma global, sem derrubar
 * a sessão — o `401` continua sendo responsabilidade do `authInterceptor`.
 *
 * - `GET`: considerado carregamento de dados de uma tela; leva o usuário para `/403`.
 * - Demais métodos: ação pontual; exibe mensagem padrão e mantém o usuário na tela.
 *
 * Sem sessão ativa (login, esqueci/redefinir senha) um `403` não significa "sem
 * permissão", e sim "sem login": o erro é propagado para a própria tela tratar.
 */
export const forbiddenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificacoes = inject(NotificacaoService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        authService.isAuthenticated() &&
        !req.context.get(TRATA_403_LOCALMENTE)
      ) {
        if (req.method === 'GET') {
          router.navigate(['/403']);
        } else {
          notificacoes.erro(MENSAGEM_ACESSO_NEGADO);
        }
      }

      return throwError(() => error);
    })
  );
};
