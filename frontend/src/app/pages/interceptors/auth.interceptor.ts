import { inject } from '@angular/core';
// Imports Angular's inject function for dependency injection in functional interceptors

import { HttpInterceptorFn } from '@angular/common/http';
// Imports the type definition for an HTTP interceptor function

import { AuthService } from '../../services/auth.service';
// Imports the authentication service used to retrieve auth headers


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Defines an HTTP interceptor function

  const authService = inject(AuthService);
  // Injects the AuthService instance

  const authHeader = authService.getAuthHeader();
  // Retrieves the authorization header object from the AuthService

  if (authHeader['Authorization']) {
    // Checks if an Authorization header exists

    const authReq = req.clone({
      setHeaders: authHeader
    });
    // Clones the original request and attaches the authorization headers

    return next(authReq);
    // Forwards the modified request to the next handler in the chain
  }

  return next(req);
  // If no Authorization header exists, forwards the original request unchanged
};