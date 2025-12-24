
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
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; 
/** 
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
*/

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

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    importProvidersFrom(FormsModule, ReactiveFormsModule), provideAnimationsAsync()
  ]
}).catch(err => console.error(err));

/** 
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// NEW PAGES (hybrid)
import { VaultComponent } from './app/pages/vault.component';
import { ContextsComponent } from './app/pages/contexts.component';
import { ConsentComponent } from './app/pages/consent.component';
import { CredentialsComponent } from './app/pages/credentials.component';
import { GdprComponent } from './app/pages/gdpr.component';
import { AdvancedComponent } from './app/pages/advanced/advanced.component';

const routes = [
  { path: '', redirectTo: 'vault', pathMatch: 'full' },

  { path: 'vault', component: VaultComponent },
  { path: 'contexts', component: ContextsComponent },
  { path: 'consent', component: ConsentComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'gdpr', component: GdprComponent },
  { path: 'advanced', component: AdvancedComponent },

  { path: '**', redirectTo: 'vault' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(FormsModule, ReactiveFormsModule)
  ]
}).catch(err => console.error(err));
*/
