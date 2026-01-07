// src/main.server.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/platform-server';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withDebugTracing } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app/app.component';

// Reuse the shared client routes (single source of truth, avoids duplication)
import { routes } from './app/app.routes';

const isDevMode = process.env['NODE_ENV'] !== 'production';

export default async function bootstrap() {
  return bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering(),
      provideClientHydration(),               // ← added: required for SSR hydration
      provideRouter(routes),                  // ← uses shared routes
      provideHttpClient(withFetch()),
      importProvidersFrom(FormsModule, ReactiveFormsModule),

      // Optional: only enable route tracing in development
      ...(isDevMode ? [provideRouter(routes, withDebugTracing())] : [])
    ]
  });
}