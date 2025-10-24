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