
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app/app.component';

// NEW PAGES (hybrid)
import { VaultComponent } from './app/pages/vault.component';
import { ContextsComponent } from './app/pages/contexts.component';
import { ConsentComponent } from './app/pages/consent.component';
import { CredentialsComponent } from './app/pages/credentials.component';
import { GdprComponent } from './app/pages/gdpr.component';
import { AdvancedComponent } from './app/pages/advanced/advanced.component';
import { DisclosuresComponent } from './app/pages/disclosures.component';
import { VerifierComponent } from './app/pages/verifier/verifier.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; 

const routes: Routes = [
  { path: '', redirectTo: 'vault', pathMatch: 'full' },

  { path: 'vault', component: VaultComponent },
  { path: 'contexts', component: ContextsComponent },
  { path: 'consent', component: ConsentComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'gdpr', component: GdprComponent },
  { path: 'advanced', component: AdvancedComponent },
  { path: 'disclosures', component: DisclosuresComponent },
  { path: 'verifier', component: VerifierComponent },
  {
  path: 'profile',
  loadComponent: () => import('./app/pages/profile.component').then(m => m.ProfileComponent)
  },

  { path: '**', redirectTo: 'vault' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    importProvidersFrom(FormsModule, ReactiveFormsModule), provideAnimationsAsync()
  ]
}).catch(err => console.error(err));

