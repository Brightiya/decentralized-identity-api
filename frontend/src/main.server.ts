/** 
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/platform-server';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/pages/home.component';
import { DidRegisterComponent } from './app/pages/did-register.component';
import { DidResolveComponent } from './app/pages/did-resolve.component';
import { DidVerifyComponent } from './app/pages/did-verify.component';
import { VcIssueComponent } from './app/pages/vc-issue.component';
import { VcVerifyComponent } from './app/pages/vc-verify.component';
import { ClaimComponent } from './app/pages/claim.component';
import { ProfileComponent } from './app/pages/profile.component';

const routes = [
  { path: '', component: HomeComponent },
  { path: 'did/register', component: DidRegisterComponent },
  { path: 'did/resolve', component: DidResolveComponent },
  { path: 'did/verify', component: DidVerifyComponent },
  { path: 'vc/issue', component: VcIssueComponent },
  { path: 'vc/verify', component: VcVerifyComponent },
  { path: 'claims', component: ClaimComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '**', redirectTo: '' }
];

export default async function bootstrap() {
  return bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering(),
      provideRouter(routes),
      provideHttpClient(),
      importProvidersFrom(FormsModule, ReactiveFormsModule)
    ]
  });
}
  */


import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering } from '@angular/platform-server';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app/app.component';

// SAME pages as client
import { VaultComponent } from './app/pages/vault.component';
import { ContextsComponent } from './app/pages/contexts.component';
import { ConsentComponent } from './app/pages/consent.component';
import { CredentialsComponent } from './app/pages/credentials.component';
import { GdprComponent } from './app/pages/gdpr.component';
import { AdvancedComponent } from './app/pages/advanced/advanced.component';
import { DisclosuresComponent } from './app/pages/disclosures.component';

const routes: Routes = [
  { path: '', redirectTo: 'vault', pathMatch: 'full' },

  { path: 'vault', component: VaultComponent },
  { path: 'contexts', component: ContextsComponent },
  { path: 'consent', component: ConsentComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'gdpr', component: GdprComponent },
  { path: 'advanced', component: AdvancedComponent },
  { path: 'disclosures', component: DisclosuresComponent },
  {
  path: 'profile',
  loadComponent: () => import('./app/pages/profile.component').then(m => m.ProfileComponent)
  },

  { path: '**', redirectTo: 'vault' }
];

export default async function bootstrap() {
  return bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering(),
      provideRouter(routes),
      provideHttpClient(withFetch()),
      importProvidersFrom(FormsModule, ReactiveFormsModule)
    ]
  });
}