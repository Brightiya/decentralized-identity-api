// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

// Page components (direct imports for public/simple routes)
import { VaultComponent } from './pages/vault.component';
import { ContextsComponent } from './pages/contexts.component';
import { ConsentComponent } from './pages/consent.component';
import { CredentialsComponent } from './pages/credentials.component';
import { GdprComponent } from './pages/gdpr.component';
import { DisclosuresComponent } from './pages/disclosures.component';
import { AdvancedComponent } from './pages/advanced/advanced.component';
import { VerifierComponent } from './pages/verifier/verifier.component';
import { LoginComponent } from './pages/login.component';
// import { AdminUsersComponent } from './pages/admin-users/admin-users.component';

export const routes: Routes = [
  // =========================================
  // Default
  // =========================================
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  // =========================================
  // Public routes
  // =========================================
  {
    path: 'login',
    component: LoginComponent
  },

  // GDPR erasure — intentionally public
  {
    path: 'gdpr',
    component: GdprComponent
  },

  // =========================================
  // USER-only routes
  // =========================================
  {
    path: 'vault',
    component: VaultComponent,
    canActivate: [roleGuard('USER')]
  },
  {
    path: 'credentials',
    component: CredentialsComponent,
    canActivate: [roleGuard('USER')]
  },
  {
    path: 'contexts',
    component: ContextsComponent,
    canActivate: [roleGuard('USER')]
  },
  {
    path: 'consent',
    component: ConsentComponent,
    canActivate: [roleGuard('USER')]
  },
  {
    path: 'disclosures',
    component: DisclosuresComponent,
    canActivate: [roleGuard('USER')]
  },

  // =========================================
  // ADMIN-only routes
  // =========================================
  {
    path: 'advanced',
    component: AdvancedComponent,
    canActivate: [roleGuard('ADMIN')]
  },

  // =========================================
  // VERIFIER-only routes
  // =========================================
  {
    path: 'verifier',
    component: VerifierComponent,
    canActivate: [roleGuard('VERIFIER')]
  },

  // =========================================
  // Profile (all authenticated roles) + Child Routes
  // =========================================
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile.component').then(m => m.ProfileComponent),
    canActivate: [roleGuard('USER', 'ADMIN', 'VERIFIER')],
    children: [
      // Default child → Overview
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      // Overview tab
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/profile/profile-overview/profile-overview.component').then(m => m.ProfileOverviewComponent)
      },
      // Edit Profile tab
      {
        path: 'edit',
        loadComponent: () =>
          import('./pages/profile/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent)
      },
      // Privacy & Consents tab
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/profile/profile-privacy/profile-privacy.component').then(m => m.ProfilePrivacyComponent)
      }
    ]
  },

  // =========================================
  // Wildcard
  // =========================================
  {
    path: '**',
    redirectTo: '/login'
  }
];
