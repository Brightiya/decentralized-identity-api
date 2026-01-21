// src/app/pages/login.component.ts
import { ChangeDetectorRef, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ← NEW: for ngModel
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, AppRole } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';
import { StorageService } from '../services/storage.service'; // ← NEW: for saving RPC

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ThemeService } from '../services/theme.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // ← Added for ngModel
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="login-page" [class.dark]="darkMode()">
      <div class="bg-overlay"></div>

      <div class="login-wrapper">
        <mat-card class="login-card glass-card" appearance="outlined">
          <!-- Header -->
          <mat-card-header class="card-header">
            <div class="header-icon-wrapper">
              <!-- Custom SVG Keyhole Shield -->
              <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
                  class="custom-shield">
                <path d="M16 2C8.5 2 3 7.5 3 15C3 25 16 30 16 30C16 30 29 25 29 15C29 7.5 23.5 2 16 2Z"
                      fill="#6366f1" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.5"/>
                <rect x="14" y="19" width="4" height="9" rx="2" fill="#ffffff"/>
                <circle cx="16" cy="16" r="3" fill="#ffffff" opacity="0.4"/>
              </svg>
            </div>
            <mat-card-title>PIMV Identity Vault</mat-card-title>
            <mat-card-subtitle>Secure • Decentralized • Role-Based</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content class="card-content">
            <!-- NEW: Custom Hardhat RPC Input (Step 0 - before connect) -->
            <div class="step-section rpc-section">
              <h3>0. Local Hardhat RPC (Optional)</h3>
              <p class="step-desc">
                For local development/testing — enter your Hardhat node URL.<br>
                Default: http://127.0.0.1:8545
              </p>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Custom Hardhat RPC URL</mat-label>
                <input matInput
                       [(ngModel)]="customRpcUrl"
                       placeholder="http://127.0.0.1:8545"
                       (blur)="saveCustomRpc()" />

             <!-- Status messages - moved ABOVE the hint for better flow -->
              <div class="status mt-2 flex items-center gap-2" *ngIf="customRpcUrl()">
                <mat-icon color="primary" class="text-lg">check_circle</mat-icon>
                <span class="text-sm font-medium text-primary-700">
                  Custom RPC active: <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{{ customRpcUrl() }}</code>
                </span>
              </div>

              <div class="status mt-2 flex items-center gap-2 text-gray-600" *ngIf="!customRpcUrl()">
                <mat-icon class="text-lg">info</mat-icon>
                <span class="text-sm">Using default: <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">http://127.0.0.1:8545</code></span>
              </div>
                      
               <mat-hint class="mt-3 text-sm text-gray-500">
                Leave empty to use default (local Hardhat node).
              </mat-hint>
              </mat-form-field>
            
            </div>

            <!-- Step 1: Connect Wallet -->
            <div class="step-section" *ngIf="!(wallet.address$ | async)">
              <h3>1. Connect Your Wallet</h3>
              <p class="step-desc">
                Link your Ethereum wallet to access your decentralized identity.
              </p>

              <button mat-raised-button color="primary" 
                      class="action-btn large-btn"
                      (click)="connectWallet()"
                      [disabled]="connecting()">
                <mat-icon *ngIf="!connecting()">wallet</mat-icon>
                <mat-spinner diameter="22" *ngIf="connecting()"></mat-spinner>
                {{ connecting() ? 'Connecting...' : 'Connect Wallet' }}
              </button>
            </div>

            <!-- Wallet Connected -->
            <ng-container *ngIf="wallet.address$ | async as addr">
              <!-- Step 2: Choose Role -->
              <div class="step-section" *ngIf="!auth.isAuthenticated()">
                <h3>2. Choose Access Mode</h3>
                <p class="step-desc">Select your role to proceed</p>

                <mat-button-toggle-group class="role-group"
                                        [value]="selectedRole()"
                                        (change)="selectRole($event.value)"
                                        exclusive>
                  <mat-button-toggle value="USER" class="role-btn">
                    <mat-icon>person</mat-icon>
                    <span>User</span>
                  </mat-button-toggle>

                  <mat-button-toggle value="ADMIN" class="role-btn">
                    <mat-icon>admin_panel_settings</mat-icon>
                    <span>Admin</span>
                  </mat-button-toggle>

                  <mat-button-toggle value="VERIFIER" class="role-btn">
                    <mat-icon>verified</mat-icon>
                    <span>Verifier</span>
                  </mat-button-toggle>
                </mat-button-toggle-group>

                <div class="role-info" *ngIf="selectedRole()">
                  {{ roleDescription[selectedRole()!] }}
                </div>
              </div>

              <!-- Step 3: Sign Message -->
              <div class="step-section sign-step" *ngIf="selectedRole() && !auth.isAuthenticated()">
                <h3>3. Authenticate</h3>

                <div class="wallet-preview">
                  <div class="label">Connected Wallet</div>
                  <code class="address">{{ addr | slice:0:8 }}…{{ addr | slice:-6 }}</code>
                </div>

                <button mat-raised-button color="primary"
                        class="action-btn large-btn sign-btn"
                        (click)="signIn()"
                        [disabled]="signing()">
                  <mat-icon *ngIf="!signing()">draw</mat-icon>
                  <mat-spinner diameter="22" *ngIf="signing()"></mat-spinner>
                  {{ signing() ? 'Signing...' : 'Sign & Login' }}
                </button>

                <button mat-stroked-button class="switch-btn"
                        (click)="wallet.disconnect()">
                  Switch Wallet
                </button>
              </div>

              <div class="hint-box" *ngIf="!selectedRole() && !auth.isAuthenticated()">
                <mat-icon>info_outline</mat-icon>
                Please choose an access mode above
              </div>
            </ng-container>

            <!-- Error -->
            <div class="error-message" *ngIf="error()">
              <mat-icon>error_outline</mat-icon>
              {{ error() }}
            </div>
          </mat-card-content>

          <mat-card-actions class="card-footer">
            <p class="session-info">
              Role selection applies only to this browser session
            </p>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,

  styles: [`
  :host {
    display: block;
    height: 100vh;
    overflow: hidden;
  }

  .login-page {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 32px 16px 80px;               /* ← extra bottom padding for safety */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: background 0.6s ease;
  }

  .login-page.dark {
    background: linear-gradient(135deg, #1a1f35 0%, #0f1421 100%);
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 70%, rgba(99,102,241,0.12), transparent 60%);
    pointer-events: none;
  }

  .login-wrapper {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 520px;
    max-height: 100vh;
    overflow-y: auto;                       /* ← allows scrolling if needed */
    -webkit-overflow-scrolling: touch;     /* smooth on iOS */
    padding-bottom: 40px;                   /* extra space at bottom */
  }

  .glass-card {
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 28px;
    box-shadow: 0 25px 70px rgba(0,0,0,0.22);
    overflow: visible;                      /* crucial for button visibility */
    transition: all 0.4s ease;
  }

  .login-page.dark .glass-card {
    background: rgba(30,41,59,0.72);
    border-color: rgba(100,116,139,0.4);
    box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  }

  /* Header */
  .card-header {
    text-align: center;
    padding: 48px 40px 32px;
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.08));
  }

  .login-page.dark .card-header {
    background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(167,139,250,0.12));
  }

  .header-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(99,102,241,0.4);
  }

  .header-icon {
    font-size: 42px;
    color: white;
  }

  mat-card-title {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    font-weight: 800;
    background: linear-gradient(90deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  mat-card-subtitle {
    font-size: 1.1rem;
    color: #64748b;
  }

  .login-page.dark mat-card-subtitle {
    color: #94a3b8;
  }

  /* Content */
  .card-content {
    padding: 32px 40px 48px;                /* ← more bottom padding */
    min-height: 300px;                      /* prevents collapse */
  }

  .step-section {
    text-align: center;
    margin-bottom: 40px;                    /* more space between sections */
  }

  .sign-step {
    padding-bottom: 60px !important;        /* extra breathing room for sign button */
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 12px;
    color: #1e293b;
  }

  .login-page.dark h3 {
    color: #f1f5f9;
  }

  .step-desc {
    font-size: 1rem;
    color: #64748b;
    margin-bottom: 28px;
    line-height: 1.5;
  }

  .login-page.dark .step-desc {
    color: #cbd5e1;
  }

  /* Buttons */
  .action-btn.large-btn {
    min-width: 260px;
    height: 58px;
    font-size: 1.08rem;
    font-weight: 600;
    border-radius: 16px;
    margin: 28px auto 20px;
    display: block;
    transition: all 0.3s ease;
  }

  .action-btn.large-btn.sign-btn {
    min-width: 280px;                       /* slightly wider for prominence */
    box-shadow: 0 6px 20px rgba(99,102,241,0.3);
  }

  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(99,102,241,0.35);
  }

  .switch-btn {
    margin-top: 16px;
    color: #64748b;
  }

  .login-page.dark .switch-btn {
    color: #94a3b8;
  }

  /* Wallet Preview */
  .wallet-preview {
    margin: 28px auto;
    padding: 16px 20px;
    background: rgba(226,232,240,0.4);
    border-radius: 16px;
    max-width: 360px;
    text-align: center;
  }

  .login-page.dark .wallet-preview {
    background: rgba(30,41,59,0.55);
  }

  .wallet-preview .label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 6px;
  }

  .login-page.dark .wallet-preview .label {
    color: #94a3b8;
  }

  .wallet-preview code {
    font-family: 'JetBrains Mono', monospace;
    color: #1d4ed8;
    font-size: 1rem;
  }

  .login-page.dark .wallet-preview code {
    color: #c7d2fe;
  }

  /* Role Selection */
  .role-group {
    width: 100%;
    max-width: 420px;
    margin: 24px auto;
    background: rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 8px;
  }

  .login-page.dark .role-group {
    background: rgba(30,41,59,0.45);
  }

  ::ng-deep .role-btn {
    flex: 1;
    border-radius: 12px !important;
    padding: 16px 12px !important;
    height: auto !important;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  ::ng-deep .role-btn.mat-button-toggle-checked {
    background: #6366f1 !important;
    color: white !important;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }

  ::ng-deep .role-btn mat-icon {
    margin-right: 10px;
    font-size: 24px;
    height: 24px;
    width: 24px;
  }

  .role-info {
    margin-top: 20px;
    padding: 14px 20px;
    background: rgba(99,102,241,0.08);
    border-radius: 12px;
    font-size: 0.98rem;
    line-height: 1.5;
    color: #1e293b;
  }

  .login-page.dark .role-info {
    background: rgba(99,102,241,0.15);
    color: #e2e8f0;
  }

  /* Inside your component's styles array */
:host ::ng-deep .mat-mdc-form-field {
  margin-bottom: 24px; /* more space below each field */
}

.status {
  font-size: 0.875rem;
  line-height: 1.4;
}

.status mat-icon {
  font-size: 1.125rem;
  height: 1.125rem;
  width: 1.125rem;
}

mat-hint {
  font-size: 0.8125rem !important;
  line-height: 1.4;
  color: #6b7280 !important;
  opacity: 1 !important;
  margin-top: 8px !important;
}

.login-page.dark mat-hint {
  color: #9ca3af !important;
}

code {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  background: rgba(0,0,0,0.05);
  padding: 2px 5px;
  border-radius: 4px;
}

.login-page.dark code {
  background: rgba(255,255,255,0.1);
}

  /* Error & Hints */
  .error-message {
    margin: 28px 0;
    padding: 16px 20px;
    background: rgba(239,68,68,0.12);
    color: #c62828;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .login-page.dark .error-message {
    background: rgba(239,68,68,0.18);
    color: #fca5a5;
  }

  .hint-box {
    margin-top: 28px;
    padding: 14px;
    background: rgba(99,102,241,0.08);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #4f46e5;
    font-size: 0.95rem;
  }

  .login-page.dark .hint-box {
    background: rgba(99,102,241,0.15);
    color: #a5b4fc;
  }

  /* Footer */
  .card-footer {
    padding: 28px 40px;
    text-align: center;
    background: rgba(0,0,0,0.02);
  }

  .login-page.dark .card-footer {
    background: rgba(255,255,255,0.03);
  }

  .session-info {
    margin: 0;
    font-size: 0.88rem;
    color: #64748b;
  }

  .login-page.dark .session-info {
    color: #94a3b8;
  }

  .header-icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(99,102,241,0.45);
  overflow: hidden;                    /* keeps SVG clean */
  transition: transform 0.3s ease;
}

  .header-icon-wrapper:hover {
    transform: scale(1.08);
  }

  .custom-shield {
    width: 56px;                         /* adjust size as needed */
    height: 56px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
  }

  /* Responsive */
  @media (max-width: 600px) {
    .login-card { max-width: 100%; }
    .card-header { padding: 40px 28px 28px; }
    .card-content { padding: 32px 24px 60px; }  /* more bottom space */
    .action-btn.large-btn { width: 100%; min-width: unset; }
    .sign-step { padding-bottom: 80px !important; }
  }

  @media (max-width: 420px) {
    .role-group { flex-direction: column; }
    ::ng-deep .role-btn { width: 100%; margin: 8px 0; }
  }

  /* Ensure button is always reachable */
  .login-wrapper {
    padding-bottom: 100px;                    /* safety buffer */
  }

  .rpc-section {
      background: rgba(99, 102, 241, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 32px;
    }

    .login-page.dark .rpc-section {
      background: rgba(99, 102, 241, 0.15);
    }

    .rpc-section h3 {
      margin-top: 0;
    }

    .rpc-section .status {
      font-size: 0.95rem;
    }

    .rpc-section code {
      font-family: 'Courier New', monospace;
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .login-page.dark .rpc-section code {
      background: rgba(255,255,255,0.1);
    }
`]
})

export class LoginComponent {
  auth = inject(AuthService);
  wallet = inject(WalletService);
  storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID); // ← NEW: for platform checks

  connecting = signal(false);
  signing = signal(false);
  error = signal<string | null>(null);

  selectedRole = signal<AppRole | null>(null);
  customRpcUrl = signal<string>('');

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  roleDescription: Record<AppRole, string> = {
    USER: 'Access your personal identity vault, create secured profiles and manage credentials.',
    ADMIN: 'Access advanced identity tools and administrative features.',
    VERIFIER: 'Access verifier dashboards and credential verification tools.'
  };

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.redirectByRole(this.auth.role());
    }
  }

  async ngOnInit() {
    // Only run browser-specific code (IndexedDB) in browser
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedRpc = await this.storage.getItem('custom_hardhat_rpc');
        if (savedRpc) {
          this.customRpcUrl.set(savedRpc);
          this.wallet.setCustomRpc(savedRpc);
        }
      } catch (err) {
        console.warn('Failed to load custom RPC (browser-only):', err);
      }
    }
  }

  // Save custom Hardhat RPC (browser-only)
  async saveCustomRpc() {
    if (!isPlatformBrowser(this.platformId)) return;

    let url = this.customRpcUrl().trim();

    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.snackBar.open('RPC URL must start with http:// or https://', 'Close', { duration: 5000 });
        return;
      }

      try {
        await this.storage.setItem('custom_hardhat_rpc', url);
        this.wallet.setCustomRpc(url);
        this.snackBar.open('Custom Hardhat RPC saved — will be used on next connect', 'Close', { duration: 5000 });
      } catch (err) {
        this.snackBar.open('Failed to save RPC URL', 'Close', { duration: 5000 });
      }
    } else {
      try {
        await this.storage.removeItem('custom_hardhat_rpc');
        this.wallet.setCustomRpc('http://127.0.0.1:8545');
        this.snackBar.open('Reverted to default Hardhat RPC', 'Close', { duration: 4000 });
      } catch (err) {
        console.warn('Failed to clear custom RPC:', err);
      }
    }
  }

  async connectWallet() {
  this.connecting.set(true);
  this.error.set(null);

  try {
    // Apply custom RPC first (if set)
    if (isPlatformBrowser(this.platformId)) {
      const savedRpc = await this.storage.getItem('custom_hardhat_rpc');
      if (savedRpc) {
        this.wallet.setCustomRpc(savedRpc);
      } else {
        this.wallet.setCustomRpc('http://127.0.0.1:8545');
      }
    }

    // Connect wallet
    await this.wallet.connect();
    this.cdr.detectChanges();

    // Wait for address to be available (reliable way using observable)
    const address = await firstValueFrom(this.wallet.address$);
    if (!address) {
      throw new Error('Wallet connected but no address received');
    }

    console.log('Wallet connected with address:', address);

    // Now safe to init encryption
    if (isPlatformBrowser(this.platformId)) {
      const success = await this.storage.initEncryption();
      if (success) {
        this.snackBar.open('Wallet connected & secure storage ready!', 'Close', { duration: 4000 });
      } else {
        this.snackBar.open(
          'Secure storage failed (signature issue). You can try again later.',
          'Close',
          { duration: 8000, panelClass: ['warn-snackbar'] }
        );
      }
    }

    // Reset role on new connection
    this.selectedRole.set(null);
  } catch (err: any) {
    console.error('Wallet connect failed:', err);
    this.error.set(err.message || 'Failed to connect wallet');
    this.snackBar.open(err.message || 'Wallet connection failed', 'Close', { duration: 5000 });
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
    // Step 1: Ensure wallet is connected at all
    if (!this.wallet.address) {
      throw new Error('Wallet not connected - please connect first');
    }

    // Step 2: Wait for signer with progressive retries + longer total time
    let signerReady = false;
    const maxRetries = 20; // ~10 seconds total (500ms × 20)
    for (let i = 0; i < maxRetries; i++) {
      if (this.wallet.signer) {
        signerReady = true;
        break;
      }
      console.log(`Waiting for signer... attempt ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!signerReady) {
      console.error('Signer failed to initialize after retries');
      throw new Error('Wallet signer not ready - please logout, reconnect wallet and sign again');
    }

    console.log('Signer ready! Proceeding with sign-in');

    // Step 3: Now safe to sign (MetaMask will pop up)
    await this.auth.login(role);

    this.redirectByRole(role);
  } catch (err: any) {
    console.error('Sign-in failed:', err);
    this.error.set(err.message || 'Authentication failed');
    this.snackBar.open(
      err.message || 'Sign-in failed - logout, reconnect wallet and try again',
      'Close',
      { duration: 9000 }
    );
  } finally {
    this.signing.set(false);
  }
}

  private redirectByRole(role: AppRole) {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

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

  // NEW: Method to fix the template binding error
  selectRole(role: AppRole) {
    this.selectedRole.set(role);
    this.error.set(null);
  }
}
