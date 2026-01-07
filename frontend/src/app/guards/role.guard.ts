// src/app/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, AppRole } from '../services/auth.service';

export function roleGuard(...allowedRoles: AppRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // Not authenticated → login
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const currentRole = auth.role();

    // Allowed → proceed
    if (allowedRoles.includes(currentRole)) {
      return true;
    }

    // Authenticated but wrong role → redirect to role home
    switch (currentRole) {
      case 'ADMIN':
        return router.createUrlTree(['/advanced']);
      case 'VERIFIER':
        return router.createUrlTree(['/verifier']);
      default:
        return router.createUrlTree(['/vault']);
    }
  };
}
