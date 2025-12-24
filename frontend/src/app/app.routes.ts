// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { VaultComponent } from './pages/vault.component';
import { ContextsComponent } from './pages/contexts.component';
import { ConsentComponent } from './pages/consent.component';
import { CredentialsComponent } from './pages/credentials.component';
import { GdprComponent } from './pages/gdpr.component';
import { DisclosuresComponent } from './pages/disclosures.component';
import { AdvancedComponent } from './pages/advanced/advanced.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'vault',
    pathMatch: 'full'
  },

  { path: 'vault', component: VaultComponent },
  { path: 'contexts', component: ContextsComponent },
  { path: 'consent', component: ConsentComponent },
  { path: 'disclosures', component: DisclosuresComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'gdpr', component: GdprComponent },
  { path: 'advanced', component: AdvancedComponent },
  {
  path: 'profile',
  loadComponent: () => import('./pages/profile.component').then(m => m.ProfileComponent)
  },

  {
    path: '**',
    redirectTo: 'vault'
  }
];
