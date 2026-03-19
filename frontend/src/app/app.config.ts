import { ApplicationConfig } from '@angular/core';
// ApplicationConfig: defines configuration for Angular standalone applications

import { provideRouter } from '@angular/router';
// provideRouter: sets up application routing with defined routes

import { provideHttpClient, withInterceptors } from '@angular/common/http';
// provideHttpClient: registers HttpClient for dependency injection
// withInterceptors: allows attaching HTTP interceptors globally

import { authInterceptor } from './pages/interceptors/auth.interceptor';
// Custom HTTP interceptor for attaching authentication headers

import { routes } from './app.routes';
// Application route definitions

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Registers application routes

    provideHttpClient(withInterceptors([authInterceptor]))
    // Registers HttpClient with the auth interceptor applied globally
  ]
};