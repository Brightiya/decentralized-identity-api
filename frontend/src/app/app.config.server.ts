import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
// mergeApplicationConfig: utility to combine multiple Angular application configs
// ApplicationConfig: type representing Angular app configuration

import { provideServerRendering } from '@angular/platform-server';
// Enables server-side rendering (SSR) providers

import { appConfig } from './app.config';
// Base (client-side) application configuration

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering()
    // Adds SSR-specific providers (Angular Universal)
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
// Merges client and server configurations into a single config export