/**
 * @file role.guard.ts
 * @description Route guard factory that restricts access based on user roles.
 * It ensures that only authenticated users with permitted roles can activate a route.
 */

import { inject } from '@angular/core'; 
// Angular utility to retrieve dependencies in functional providers/guards

import { CanActivateFn, Router } from '@angular/router'; 
// CanActivateFn: type for route guard functions
// Router: used for navigation and URL tree creation

import { AuthService, AppRole } from '../services/auth.service'; 
// AuthService: handles authentication logic
// AppRole: type representing valid user roles

/**
 * @function roleGuard
 * @param {...AppRole[]} allowedRoles - List of roles permitted to access the route
 * @returns {CanActivateFn} A route guard function
 * 
 * @description
 * Factory function that creates a route guard enforcing role-based access control.
 * The returned guard checks:
 * 1. Whether the user is authenticated
 * 2. Whether the user's role is included in the allowed roles
 * 3. Redirects accordingly if access is denied
 */
export function roleGuard(...allowedRoles: AppRole[]): CanActivateFn {

  /**
   * @returns {boolean | UrlTree}
   * @description
   * Guard execution function invoked by Angular during route activation.
   * Returns:
   * - true if access is granted
   * - UrlTree to redirect if access is denied
   */
  return () => {

    const auth = inject(AuthService);
    // Injects the authentication service

    const router = inject(Router);
    // Injects the Angular router

    // Not authenticated → login
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
      // Redirects unauthenticated users to the login page
    }

    const currentRole = auth.role();
    // Retrieves the current user's role

    // Allowed → proceed
    if (allowedRoles.includes(currentRole)) {
      return true;
      // Grants access if the role is allowed
    }

    // Authenticated but wrong role → redirect to role home
    switch (currentRole) {
      case 'ADMIN':
        return router.createUrlTree(['/advanced']);
        // Redirects ADMIN users to their dashboard
      case 'VERIFIER':
        return router.createUrlTree(['/verifier']);
        // Redirects VERIFIER users to their dashboard
      default:
        return router.createUrlTree(['/vault']);
        // Redirects all other roles (e.g., USER) to a default page
    }
  };
}