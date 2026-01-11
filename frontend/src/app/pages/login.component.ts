// src/app/pages/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, AppRole } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDividerModule,
    MatButtonToggleModule
  ],
  template: `
  <div class="login-container" [class.dark]="darkMode()">
    <mat-card class="login-card" appearance="outlined">

      <!-- Header -->
      <mat-card-header>
        <mat-card-title>PIMV Identity Vault</mat-card-title>
        <mat-card-subtitle>
          Decentralized Identity • Role-based Access
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>

        <!-- STEP 1: Connect Wallet -->
        <section class="step" *ngIf="!wallet.address">
          <h3>Step 1 — Connect Wallet</h3>
          <p class="muted">Connect your Ethereum wallet to continue.</p>

          <button
            mat-raised-button
            color="primary"
            (click)="connectWallet()"
            [disabled]="connecting()"
            class="primary-btn">
            <mat-icon *ngIf="!connecting()">account_balance_wallet</mat-icon>
            <mat-spinner diameter="20" *ngIf="connecting()"></mat-spinner>
            {{ connecting() ? 'Connecting…' : 'Connect Wallet' }}
          </button>
        </section>

        <!-- STEP 2: Select Role -->
        <section
          class="step"
          *ngIf="wallet.address && !auth.isAuthenticated()">

          <h3>Step 2 — Select Login Mode</h3>
          <p class="muted">
            Choose how you want to access the platform.
          </p>

          <mat-button-toggle-group
            class="role-toggle"
            [value]="selectedRole()"
            (change)="selectRole($event.value)"
            exclusive>

            <mat-button-toggle value="USER">
              <mat-icon>person</mat-icon>
              User
            </mat-button-toggle>

            <mat-button-toggle value="ADMIN">
              <mat-icon>admin_panel_settings</mat-icon>
              Admin
            </mat-button-toggle>

            <mat-button-toggle value="VERIFIER">
              <mat-icon>verified</mat-icon>
              Verifier
            </mat-button-toggle>
          </mat-button-toggle-group>

          <div class="role-hint" *ngIf="selectedRole()">
            {{ roleDescription[selectedRole()!] }}
          </div>
        </section>

        <!-- STEP 3: Sign Message -->
        <section
          class="step"
          *ngIf="wallet.address && selectedRole() && !auth.isAuthenticated()">

          <h3>Step 3 — Sign to Authenticate</h3>

          <div class="wallet-info">
            <strong>Wallet:</strong>
            <code>
              {{ wallet.address | slice:0:6 }}…{{ wallet.address | slice:-4 }}
            </code>
          </div>

          <button
            mat-raised-button
            color="primary"
            class="primary-btn"
            (click)="signIn()"
            [disabled]="signing()">

            <mat-icon *ngIf="!signing()">draw</mat-icon>
            <mat-spinner diameter="20" *ngIf="signing()"></mat-spinner>
            {{ signing() ? 'Signing…' : 'Sign & Enter' }}
          </button>

          <button
            mat-stroked-button
            class="secondary-btn"
            (click)="wallet.disconnect()">
            Use different wallet
          </button>
        </section>

        <!-- ERROR -->
        <div class="error-box" *ngIf="error()">
          <mat-icon>error_outline</mat-icon>
          {{ error() }}
        </div>

      </mat-card-content>

      <mat-divider></mat-divider>

      <mat-card-actions class="footer">
        <p class="small muted">
          Login mode applies only to this session.
        </p>
      </mat-card-actions>

    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea, #764ba2);
    padding: 24px;
    transition: background 0.4s ease;
  }

  .login-container.dark {
    background: linear-gradient(135deg, #1e1e2d, #0f0f1a);
  }

  .login-card {
    width: 100%;
    max-width: 520px;
    border-radius: 20px;
    background: var(--card-bg, rgba(255,255,255,0.95));
    backdrop-filter: blur(12px);
    border: 1px solid var(--card-border, rgba(255,255,255,0.2));
    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .login-container.dark .login-card {
    background: rgba(30,41,59,0.75);
    border-color: #2d2d44;
    backdrop-filter: blur(16px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  }

  mat-card-header {
    text-align: center;
    padding: 40px 32px 24px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.1));
  }

  .login-container.dark mat-card-header {
    background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(167,139,250,0.15));
  }

  mat-card-title {
    font-size: clamp(1.4rem, 4vw + 0.5rem, 2.2rem);
    font-weight: 800;
    color: var(--text-primary, #255cb4ff);
    letter-spacing: -0.5px;
  }

  mat-card-subtitle {
    color: var(--text-primary, #255cb4ff);
    font-size: 1.05rem;
    margin-top: 8px;
  }

  .step {
    padding: 32px 40px;
    text-align: center;
  }

  h3 {
    font-size: clamp(1.05rem, 3vw + 0.4rem, 1.4rem);
    font-weight: 700;
    color: var(--text-primary, #255cb4ff);
    margin-bottom: 12px;
  }

  .login-container.dark h3 {
    color: #f1f5f9;
  }

  .muted {
    color: var(--text-secondary, #64748b);
    font-size: clamp(0.9rem, 2.5vw + 0.3rem, 1rem);
    margin-bottom: 24px;
  }

  .login-container.dark .muted {
    color: #cbd5e1;
  }

  .primary-btn {
    min-width: 220px;
    height: 56px;
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    transition: all 0.25s ease;
  }

  .primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(99,102,241,0.4);
  }

  .secondary-btn {
    margin-top: 16px;
    font-size: clamp(0.9rem, 2.5vw + 0.3rem, 1rem);
    color: var(--text-secondary);
  }

  .login-container.dark .secondary-btn {
    color: #cbd5e1;
  }

  .wallet-info {
    margin: 20px auto;
    padding: 14px 18px;
    background: var(--code-bg, #f8fafc);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    max-width: 320px;
  }

  .login-container.dark .wallet-info {
    background: rgba(30,41,59,0.6);
  }

  .wallet-info code {
    color: #1d4ed8;
    font-family: 'Courier New', monospace;
  }

  .login-container.dark .wallet-info code {
    color: #c7d2fe;
  }

  .role-toggle {
    display: flex;
    justify-content: center;
    margin: 24px 0;
    background: var(--toggle-bg, rgba(255,255,255,0.08));
    border-radius: 12px;
    padding: 8px;
  }

  .login-container.dark .role-toggle {
    background: rgba(30,41,59,0.6);
  }

  .role-toggle ::ng-deep .mat-mdc-button-toggle {
    background: transparent;
    color: var(--text-secondary);
    border: none;
    border-radius: 10px;
    padding: 12px 24px;
    transition: all 0.25s ease;
  }

  .login-container.dark .role-toggle ::ng-deep .mat-mdc-button-toggle {
    color: #cbd5e1;
  }

  .role-toggle ::ng-deep .mat-mdc-button-toggle.mat-mdc-button-toggle-checked {
    background: #6366f1;
    color: white !important;
    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
  }

  .role-toggle ::ng-deep .mat-mdc-button-toggle .mat-icon {
    margin-right: 8px;
  }

  .role-hint {
    margin-top: 20px;
    font-size: clamp(0.9rem, 2.5vw + 0.3rem, 1rem);
    color: var(--text-primary);
    padding: 12px 20px;
    background: var(--hint-bg, rgba(99,102,241,0.08));
    border-radius: 12px;
  }

  .login-container.dark .role-hint {
    background: rgba(99,102,241,0.18);
    color: #e2e8f0;
  }

  .error-box {
    margin: 24px 0;
    padding: 16px;
    background: var(--error-bg, #ffebee);
    color: #c62828;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;
  }

  .login-container.dark .error-box {
    background: rgba(239,68,68,0.15);
    color: #fca5a5;
  }

  .footer {
    justify-content: center;
    padding: 20px;
    background: var(--footer-bg, rgba(0,0,0,0.02));
    text-align: center;
  }

  .login-container.dark .footer {
    background: rgba(255,255,255,0.03);
  }

  .small.muted {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
    /* Universal scalable responsive layer */
@media (max-width: 960px) {
  .login-card {
    max-width: 440px;
  }
}

@media (max-width: 600px) {
  .login-card {
    max-width: 100%;
  }

  mat-card-header {
    padding: 32px 24px 20px;
  }

  .step {
    padding: 24px 28px;
  }

  .primary-btn {
    width: 100%;
    min-width: 0;
    height: 52px;
    font-size: 1rem;
  }

  .secondary-btn {
    display: block;
    width: 100%;
    margin-top: 12px;
    text-align: center;
  }

  .wallet-info {
    max-width: 100%;
  }

  .role-toggle {
    flex-wrap: wrap;
    padding: 6px;
  }
}

@media (max-width: 360px) {
  .primary-btn {
    height: 48px;
    font-size: 0.9rem;
  }

  .role-toggle ::ng-deep .mat-mdc-button-toggle {
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .step {
    padding: 20px 20px;
  }

  mat-card-header {
    padding: 24px 16px 16px;
  }
}

   
`]
})
export class LoginComponent {
  auth = inject(AuthService);
  wallet = inject(WalletService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  connecting = signal(false);
  signing = signal(false);
  error = signal<string | null>(null);

  selectedRole = signal<AppRole | null>(null);

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  roleDescription: Record<AppRole, string> = {
    USER: 'Access your personal identity vault and manage credentials.',
    ADMIN: 'Access advanced identity tools and administrative features.',
    VERIFIER: 'Access verifier dashboards and credential verification tools.'
  };

  constructor() {
    // Already authenticated → go to role home
    if (this.auth.isAuthenticated()) {
      this.redirectByRole(this.auth.role());
    }
  }

  selectRole(role: AppRole) {
    this.selectedRole.set(role);
    this.error.set(null);
  }

  async connectWallet() {
    this.connecting.set(true);
    this.error.set(null);

    try {
      await this.wallet.connect();

      // Reset role when wallet changes
      this.selectedRole.set(null);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to connect wallet');
    } finally {
      this.connecting.set(false);
    }
  }

  async signIn() {
    const role = this.selectedRole();

    if (!role) {
      this.error.set('Please select a login mode.');
      return;
    }

    this.signing.set(true);
    this.error.set(null);

    try {
      await this.auth.login(role);

      // Redirect safely after login
      this.redirectByRole(role);
    } catch (err: any) {
      this.error.set(err.message || 'Authentication failed');
    } finally {
      this.signing.set(false);
    }
  }

  private redirectByRole(role: AppRole) {
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    // Prevent cross-role navigation
    if (returnUrl && this.isReturnUrlAllowed(role, returnUrl)) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    switch (role) {
      case 'ADMIN':
        this.router.navigateByUrl('/advanced');
        break;
      case 'VERIFIER':
        this.router.navigateByUrl('/verifier');
        break;
      default:
        this.router.navigateByUrl('/vault');
    }
  }

  private isReturnUrlAllowed(role: AppRole, url: string): boolean {
    if (role === 'ADMIN') return url.startsWith('/advanced');
    if (role === 'VERIFIER') return url.startsWith('/verifier');
    return (
      url.startsWith('/vault') ||
      url.startsWith('/credentials') ||
      url.startsWith('/contexts') ||
      url.startsWith('/consent') ||
      url.startsWith('/disclosures') ||
      url.startsWith('/gdpr')
    );
  }
}
