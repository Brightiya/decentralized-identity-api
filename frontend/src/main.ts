// src/main.ts (client-side bootstrap)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './app/pages/interceptors/auth.interceptor';


import { AppComponent } from './app/app.component';

// Reuse the shared routes (same as server, single source of truth)
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideClientHydration(),                      // ← added: enables hydration for SSR compatibility
    provideHttpClient(withFetch()),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(FormsModule, ReactiveFormsModule),
    provideAnimationsAsync()                       // keeps Material animations async-loaded
  ]
}).catch(err => console.error('Bootstrap failed:', err));