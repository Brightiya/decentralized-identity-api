import { bootstrapApplication } from '@angular/platform-browser';
// Bootstraps a standalone Angular application (no NgModule required)

import { provideServerRendering } from '@angular/platform-server';
// Enables server-side rendering (SSR)

import { provideClientHydration } from '@angular/platform-browser';
// Enables hydration (reusing SSR-rendered DOM on client)

import { provideRouter, withDebugTracing } from '@angular/router';
// provideRouter: sets up routing
// withDebugTracing: optional debugging tool for router events (not used here)

import { provideHttpClient, withFetch } from '@angular/common/http';
// provideHttpClient: registers HttpClient
// withFetch: uses Fetch API instead of XMLHttpRequest

import { importProvidersFrom } from '@angular/core';
// Allows importing providers from Angular modules

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Forms modules for template-driven and reactive forms

import { AppComponent } from './app/app.component';
// Root application component

// Reuse the shared client routes (single source of truth, avoids duplication)
import { routes } from './app/app.routes';
// Application route definitions

export default async function bootstrap() {
  // Entry point for bootstrapping the Angular app

  return bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering(),
      // Enables SSR support

      provideClientHydration(),           
      // Enables hydration for SSR-rendered content

      provideRouter(routes),                 
      // Registers application routes

      provideHttpClient(withFetch()),
      // Registers HttpClient using Fetch API

      importProvidersFrom(FormsModule, ReactiveFormsModule),
      // Imports Angular form modules into the provider tree

    ]
  });
}