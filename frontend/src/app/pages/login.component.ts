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
    <div class="login-container">
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
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea, #764ba2);
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 520px;
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }

    mat-card-header {
      text-align: center;
      padding: 32px;
    }

    mat-card-title {
      font-size: 2rem;
      font-weight: 700;
      color: white;
    }

    mat-card-subtitle {
      color: rgba(255,255,255,0.8);
    }

    .step {
      padding: 24px;
      text-align: center;
    }

    .primary-btn {
      min-width: 220px;
      height: 52px;
      font-size: 1.1rem;
      margin-top: 16px;
    }

    .secondary-btn {
      margin-top: 12px;
    }

    .wallet-info {
      margin: 16px auto;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      width: fit-content;
    }

    .role-toggle {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    .role-hint {
      margin-top: 12px;
      font-size: 0.95rem;
      color: #374151;
    }

    .error-box {
      margin: 16px;
      padding: 14px;
      background: #ffebee;
      color: #c62828;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer {
      justify-content: center;
      padding: 16px;
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
