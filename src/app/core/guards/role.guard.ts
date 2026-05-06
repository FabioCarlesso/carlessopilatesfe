import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/auth';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const role = authService.getCurrentUserRole();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/403']);
  };
}
