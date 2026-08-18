import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Espelho do `authGuard` para a rota pública `/`: a landing existe para quem
// ainda não entrou, então quem já tem sessão é mandado direto para `/inicio`.
// É o que preserva o bookmark da equipe, que apontava para a raiz quando ela
// ainda era o dashboard (issue #244).
export const visitanteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/inicio']);
  }

  return true;
};
