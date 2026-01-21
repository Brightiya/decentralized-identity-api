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
    FormsModule,
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
              <svg width="72" height="72" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
                   class="custom-shield">
                <path d="M16 2C8.5 2 3 7.5 3 15C3 25 16 30 16 30C16 30 29 25 29 15C29 7.5 23.5 2 16 2Z"
                      fill="#6366f1" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.5"/>
                <rect x="14" y="19" width="4" height="9" rx="2" fill="#ffffff"/>
                <circle cx="16" cy="16" r="3" fill="#ffffff" opacity="0.4"/>
              </svg>
            </div>
            <mat-card-title>PIMV Identity Vault</mat-card-title>
            <mat-card-subtitle>Secure • Decentralized • Self-Sovereign</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content class="card-content">
            <!-- Step 0: Custom RPC (Optional) -->
            <div class="step-section rpc-section">
              <h3>Optional: Local Development RPC</h3>
              <p class="step-desc">
                For local testing with Hardhat — enter your node URL (default: <code>http://127.0.0.1:8545</code>)
              </p>

              <mat-form-field appearance="outline" class="full-width rpc-input">
                <mat-label>Hardhat RPC URL</mat-label>
                <input matInput
                       [(ngModel)]="customRpcUrl"
                       placeholder="http://127.0.0.1:8545"
                       (blur)="saveCustomRpc()" />
                <mat-hint>Leave blank to use default local node</mat-hint>
              </mat-form-field>

              <div class="status-pill" *ngIf="customRpcUrl()">
                <mat-icon color="primary">check_circle</mat-icon>
                Using custom RPC: <code>{{ customRpcUrl() }}</code>
              </div>
              <div class="status-pill neutral" *ngIf="!customRpcUrl()">
                <mat-icon>info</mat-icon>
                Using default: <code>http://127.0.0.1:8545</code>
              </div>
            </div>

            <!-- Step 1: Connect Wallet -->
            <div class="step-section" *ngIf="!(wallet.address$ | async)">
              <h3>1. Connect Your Wallet</h3>
              <p class="step-desc">
                Link your Ethereum wallet to access your decentralized identity vault.
              </p>

              <button mat-flat-button color="primary"
                      class="action-btn connect-btn"
                      (click)="connectWallet()"
                      [disabled]="connecting()">
                <mat-icon *ngIf="!connecting()">wallet</mat-icon>
                <mat-spinner diameter="24" *ngIf="connecting()"></mat-spinner>
                {{ connecting() ? 'Connecting...' : 'Connect Wallet' }}
              </button>
            </div>

            <!-- Wallet Connected → Steps 2 & 3 -->
            <ng-container *ngIf="wallet.address$ | async as addr">
              <!-- Step 2: Choose Role -->
              <div class="step-section role-section" *ngIf="!auth.isAuthenticated()">
                <h3>2. Select Access Mode</h3>
                <p class="step-desc">Choose your role for this session</p>

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

                <div class="role-description" *ngIf="selectedRole()">
                  {{ roleDescription[selectedRole()!] }}
                </div>
              </div>

              <!-- Step 3: Sign & Login -->
              <div class="step-section sign-section" *ngIf="selectedRole() && !auth.isAuthenticated()">
                <h3>3. Authenticate</h3>

                <div class="wallet-info-card">
                  <div class="wallet-label">Connected Wallet</div>
                  <div class="wallet-address">
                    {{ addr | slice:0:8 }}…{{ addr | slice:-6 }}
                  </div>
                  <div class="full-address">{{ addr }}</div>
                </div>

                <button mat-flat-button color="primary"
                        class="action-btn sign-btn"
                        (click)="signIn()"
                        [disabled]="signing()">
                  <mat-icon *ngIf="!signing()">draw</mat-icon>
                  <mat-spinner diameter="24" *ngIf="signing()"></mat-spinner>
                  {{ signing() ? 'Signing...' : 'Sign & Login' }}
                </button>

                <button mat-stroked-button class="switch-wallet-btn"
                        (click)="wallet.disconnect()">
                  <mat-icon>swap_horiz</mat-icon> Switch Wallet
                </button>
              </div>

              <!-- Hint when role not selected -->
              <div class="hint-box" *ngIf="!selectedRole() && !auth.isAuthenticated()">
                <mat-icon>info</mat-icon>
                Please select an access mode to continue
              </div>
            </ng-container>

            <!-- Error Message -->
            <div class="error-message" *ngIf="error()">
              <mat-icon>error_outline</mat-icon>
              {{ error() }}
            </div>
          </mat-card-content>

          <mat-card-actions class="card-footer">
            <p class="session-note">
              Role selection is stored only for this browser session
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
      padding: 32px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transition: background 0.6s ease;
    }

    .login-page.dark {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .bg-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 70%, rgba(99,102,241,0.18), transparent 70%);
      pointer-events: none;
    }

    .login-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 540px;
      max-height: 95vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 20px 0;
    }

    .glass-card {
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 32px;
      box-shadow: 0 30px 90px rgba(0,0,0,0.25);
      overflow: hidden;
      transition: all 0.4s ease;
    }

    .login-page.dark .glass-card {
      background: rgba(30,41,59,0.78);
      border-color: rgba(100,116,139,0.45);
      box-shadow: 0 40px 100px rgba(0,0,0,0.6);
    }

    /* Header */
    .card-header {
      text-align: center;
      padding: 56px 40px 40px;
      background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.1));
    }

    .login-page.dark .card-header {
      background: linear-gradient(135deg, rgba(99,102,241,0.22), rgba(167,139,250,0.15));
    }

    .header-icon-wrapper {
      width: 96px;
      height: 96px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 40px rgba(99,102,241,0.5);
      transition: transform 0.3s ease;
    }

    .header-icon-wrapper:hover {
      transform: scale(1.08);
    }

    .custom-shield {
      width: 68px;
      height: 68px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
    }

    mat-card-title {
      font-size: clamp(2rem, 5.5vw, 2.8rem);
      font-weight: 800;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px;
    }

    mat-card-subtitle {
      font-size: 1.15rem;
      color: #64748b;
      margin: 0;
    }

    .login-page.dark mat-card-subtitle {
      color: #94a3b8;
    }

    /* Content */
    .card-content {
      padding: 40px 48px 56px;
    }

    .step-section {
      text-align: center;
      margin-bottom: 48px;
    }

    h3 {
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0 0 12px;
      color: #1e293b;
    }

    .login-page.dark h3 {
      color: #f1f5f9;
    }

    .step-desc {
      font-size: 1.05rem;
      color: #64748b;
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .login-page.dark .step-desc {
      color: #cbd5e1;
    }

    /* RPC Section */
    .rpc-section {
      background: rgba(99,102,241,0.06);
      border-radius: 20px;
      padding: 28px 32px;
      margin-bottom: 40px;
    }

    .login-page.dark .rpc-section {
      background: rgba(99,102,241,0.18);
    }

    .rpc-input {
      margin: 24px 0;
    }

    /* Buttons */
    .action-btn {
      min-width: 280px;
      height: 60px;
      font-size: 1.12rem;
      font-weight: 600;
      border-radius: 16px;
      margin: 32px auto 20px;
      display: block;
      transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(99,102,241,0.35);
    }

    .action-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(99,102,241,0.45);
    }

    .connect-btn, .sign-btn {
      background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%) !important;
    }

    .switch-wallet-btn {
      margin-top: 16px;
      color: #64748b;
      font-weight: 500;
    }

    .login-page.dark .switch-wallet-btn {
      color: #94a3b8;
    }

    /* Wallet Info */
    .wallet-info-card {
      background: rgba(226,232,240,0.45);
      border-radius: 16px;
      padding: 20px;
      margin: 32px auto;
      max-width: 420px;
      text-align: center;
      border: 1px solid rgba(226,232,240,0.8);
    }

    .login-page.dark .wallet-info-card {
      background: rgba(30,41,59,0.6);
      border-color: rgba(100,116,139,0.5);
    }

    .wallet-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }

    .login-page.dark .wallet-label {
      color: #94a3b8;
    }

    .wallet-address {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.15rem;
      color: #1d4ed8;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .login-page.dark .wallet-address {
      color: #c7d2fe;
    }

    .full-address {
      font-size: 0.85rem;
      color: #64748b;
      word-break: break-all;
      opacity: 0.8;
    }

    .login-page.dark .full-address {
      color: #94a3b8;
    }

    /* Role Selection */
    .role-group {
      width: 100%;
      max-width: 460px;
      margin: 32px auto;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 10px;
      display: flex;
    }

    .login-page.dark .role-group {
      background: rgba(30,41,59,0.5);
    }

    ::ng-deep .role-btn {
      flex: 1;
      border-radius: 14px !important;
      padding: 18px 16px !important;
      height: auto !important;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    ::ng-deep .role-btn.mat-button-toggle-checked {
      background: linear-gradient(135deg, #6366f1, #a78bfa) !important;
      color: white !important;
      box-shadow: 0 6px 20px rgba(99,102,241,0.4);
    }

    ::ng-deep .role-btn mat-icon {
      margin-right: 12px;
      font-size: 26px;
      height: 26px;
      width: 26px;
    }

    .role-description {
      margin-top: 24px;
      padding: 16px 24px;
      background: rgba(99,102,241,0.1);
      border-radius: 16px;
      font-size: 1rem;
      line-height: 1.6;
      color: #1e293b;
    }

    .login-page.dark .role-description {
      background: rgba(99,102,241,0.2);
      color: #e2e8f0;
    }

    /* Status Pill */
    .status-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 20px auto 0;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 500;
      font-size: 0.95rem;
      max-width: fit-content;
    }

    .status-pill[color="primary"] {
      background: rgba(99,102,241,0.15);
      color: #1e40af;
    }

    .status-pill.neutral {
      background: rgba(100,116,139,0.15);
      color: #475569;
    }

    .login-page.dark .status-pill.neutral {
      background: rgba(100,116,139,0.25);
      color: #cbd5e1;
    }

    /* Hint & Error */
    .hint-box {
      margin: 32px 0;
      padding: 16px 24px;
      background: rgba(99,102,241,0.1);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #4f46e5;
      font-weight: 500;
    }

    .login-page.dark .hint-box {
      background: rgba(99,102,241,0.2);
      color: #a5b4fc;
    }

    .error-message {
      margin: 32px 0;
      padding: 16px 24px;
      background: rgba(239,68,68,0.15);
      color: #c62828;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-weight: 500;
    }

    .login-page.dark .error-message {
      background: rgba(239,68,68,0.22);
      color: #fca5a5;
    }

    /* Footer */
    .card-footer {
      padding: 32px 40px;
      text-align: center;
      background: rgba(0,0,0,0.03);
    }

    .login-page.dark .card-footer {
      background: rgba(255,255,255,0.04);
    }

    .session-note {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
    }

    .login-page.dark .session-note {
      color: #94a3b8;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .card-content { padding: 32px 28px 64px; }
      .action-btn { width: 100%; min-width: unset; }
      .role-group { flex-direction: column; }
      ::ng-deep .role-btn { margin: 8px 0; }
    }

    @media (max-width: 420px) {
      .card-header { padding: 48px 24px 32px; }
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
