import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/auth';
import { AuthService } from '../services/auth.service';

/**
 * Libera a rota quando o usuário tem ao menos um papel de **cada** grupo
 * informado. Um grupo só é o caso comum (`roleGuard(PAPEIS.clinica)`); vários
 * cobrem a tela que lê de duas áreas, como as aulas de um pagamento, que
 * precisam de agenda e de cobrança — e que `PROFISSIONAL` + `FINANCEIRO` abre.
 */
export function roleGuard(...grupos: (readonly UserRole[])[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (authService.getCurrentUserRoles().length === 0) {
      authService.clearSession();
      return router.createUrlTree(['/login']);
    }

    if (grupos.every(grupo => authService.hasAnyRole(grupo))) {
      return true;
    }

    return router.createUrlTree(['/403']);
  };
}
