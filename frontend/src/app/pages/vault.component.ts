// src/app/pages/vault/vault.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { ProfileStateService } from '../services/profile-state.service';

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
  <div class="vault-container" [class.dark]="darkMode()">
    <div class="vault-header">
      <h1>Identity Vault</h1>
      <p class="subtitle">
        Your sovereign digital identity starts here. Connect your wallet to manage credentials, contexts, and consents.
      </p>
    </div>

    <!-- Wallet Connection Card -->
    <section class="card elevated">
      <div class="card-header">
        <mat-icon class="header-icon">account_balance_wallet</mat-icon>
        <h3>Wallet Connection</h3>
      </div>

      <div class="wallet-info" *ngIf="wallet.address$ | async as address; else connectPrompt">
        <div class="address-row">
          <input class="address-input" [value]="address" disabled />
          <button mat-icon-button class="copy-btn" (click)="copyAddress(address)">
            <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
          </button>
        </div>

        <div class="did-display">
          <span class="label">Decentralized Identifier (DID)</span>
          <code class="did">did:ethr:{{ address }}</code>
        </div>

        <p class="status success">
          <mat-icon inline>check_circle</mat-icon>
          Wallet connected successfully
        </p>
      </div>

      <ng-template #connectPrompt>
        <p class="muted">
          Connect your Ethereum wallet to access your personal identity vault.
        </p>
        <button class="connect-btn" (click)="connect()" [disabled]="loading()">
          <mat-icon *ngIf="!loading()">wallet</mat-icon>
          <span>{{ loading() ? 'Connecting...' : 'Connect Wallet' }}</span>
        </button>
      </ng-template>
    </section>

    <!-- Profile Status Card -->
    <section class="card elevated" *ngIf="wallet.address$ | async">
      <div class="card-header">
        <mat-icon class="header-icon">shield</mat-icon>
        <h3>Vault Profile</h3>
      </div>

      <div class="profile-content">
        <!-- Pinata JWT Section -->
        <section class="card elevated mt-6">
          <div class="card-header">
            <mat-icon class="header-icon">vpn_key</mat-icon>
            <h3>Your Pinata JWT (for pinning)</h3>
          </div>

          <div class="content p-4">
            <p class="muted mb-4">
              Provide your own Pinata JWT so uploads use <strong>your account</strong> instead of the shared test key.<br>
              <strong>Security note:</strong> Create a dedicated key in Pinata with Admin permissions only.
            </p>

            <!-- Wrap in form to silence password warning -->
            <form (ngSubmit)="saveUserPinataJwt()" #jwtForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Pinata JWT</mat-label>
                <input matInput
                       type="password"
                       name="jwt"
                       [(ngModel)]="userPinataJwt"
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                       required
                       autocomplete="new-password" />
                <mat-hint>
                  Get it from: 
                  <a href="https://app.pinata.cloud/keys" target="_blank" class="text-primary underline">
                    Pinata Dashboard → API Keys → New Key (Admin)
                  </a>
                </mat-hint>
              </mat-form-field>

              <div class="actions mt-4 flex gap-4">
                <button mat-raised-button 
                        color="primary" 
                        type="submit"
                        [disabled]="!userPinataJwt().trim() || jwtForm.invalid">
                  Save My JWT
                </button>

                <button mat-stroked-button 
                        color="warn" 
                        type="button"
                        *ngIf="hasUserJwt()" 
                        (click)="clearUserPinataJwt()">
                  Remove / Use Shared Key
                </button>
              </div>
            </form>

            <div class="status mt-4 flex items-center gap-2" 
                 *ngIf="hasUserJwt()" 
                 [ngClass]="{'text-success-600 dark:text-success-400': true}">
              <mat-icon>check_circle</mat-icon>
              <span>Using <strong>your own Pinata account</strong> for uploads</span>
            </div>

            <div class="status mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400" 
                 *ngIf="!hasUserJwt()">
              <mat-icon>warning</mat-icon>
              <span>Using shared app key — <strong>only for testing</strong></span>
            </div>
          </div>
        </section>

        <!-- Existing Profile Status -->
        <ng-container *ngIf="loading(); else profileLoaded">
          <div class="loading-state">
            <mat-spinner diameter="32"></mat-spinner>
            <p class="muted">Checking vault status...</p>
          </div>
        </ng-container>

        <ng-template #profileLoaded>
          <!-- Erased State -->
          <ng-container *ngIf="isErased()">
            <div class="status erased">
              <mat-icon inline color="warn">privacy_tip</mat-icon>
              <div>
                <strong>Your identity has been permanently erased</strong>
                <p class="muted small">
                  You exercised your Right to be Forgotten on {{ erasedAt() | date:'medium' }}.
                </p>
                <p class="muted small">
                  No credentials or personal data are accessible. This is cryptographically proven on-chain.
                </p>
              </div>
            </div>
          </ng-container>

          <!-- Active Profile -->
          <ng-container *ngIf="!isErased() && profileExists()">
            <div class="status success">
              <mat-icon>verified</mat-icon>
              <div>
                <strong>Your identity vault is active</strong>
                <p class="muted small">All credentials and contexts are ready.</p>
              </div>
            </div>

            <div class="actions">
              <a routerLink="/contexts" class="btn-primary">
                <mat-icon>layers</mat-icon>
                Manage Contexts
              </a>
              <a routerLink="/credentials" class="btn-secondary">
                <mat-icon>badge</mat-icon>
                Issue Credential
              </a>
            </div>
          </ng-container>

          <!-- No Profile -->
          <ng-container *ngIf="!isErased() && !profileExists()">
            <div class="status warning">
              <mat-icon>info</mat-icon>
              <div>
                <strong>No vault profile found</strong>
                <p class="muted small">Create one to start issuing and managing credentials.</p>
              </div>
            </div>

            <button class="btn-primary" (click)="createProfile()" [disabled]="loading()">
              <mat-icon *ngIf="!loading()">add_box</mat-icon>
              <span>{{ loading() ? 'Creating...' : 'Create Vault Profile' }}</span>
            </button>
          </ng-container>

          <!-- Refresh Button -->
          <div class="refresh">
            <button mat-stroked-button (click)="checkProfile()" [disabled]="loading()">
              <mat-icon>refresh</mat-icon> Refresh Status
            </button>
          </div>
        </ng-template>
      </div>
    </section>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .vault-container {
    padding: 24px 32px 64px;
    max-width: 900px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .vault-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .vault-header {
    margin: 0 0 48px;
    text-align: center;
  }

  h1 {
    font-size: clamp(1.3rem, 4vw + 1rem, 2.8rem);
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 16px;
    letter-spacing: -0.8px;
  }

  .subtitle {
    font-size: 1.15rem;
    color: var(--text-secondary, #94a3b8);
    max-width: 720px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Cards */
  .card {
    background: var(--card-bg, white);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 32px;
    border: 1px solid var(--card-border, #e2e8f0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .vault-container.dark .card {
    background: rgba(30, 41, 59, 0.6);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  }

  .vault-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  }

  .vault-container.dark .card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .header-icon {
    font-size: 32px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--icon-bg, rgba(99,102,241,0.12));
    border-radius: 14px;
    color: #6366f1;
  }

  .vault-container.dark .header-icon {
    background: rgba(99,102,241,0.25);
    color: #a5b4fc;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
  }

  .vault-container.dark .card-header h3 {
    color: #f1f5f9;
  }

  /* Wallet Info */
  .address-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .address-input {
    flex: 1;
    padding: 14px 18px;
    border: 1px solid var(--input-border, #cbd5e1);
    border-radius: 14px;
    background: var(--input-bg, #f8fafc);
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .vault-container.dark .address-input {
    background: rgba(30,41,59,0.5);
    border-color: #4b5563;
    color: #f1f5f9;
  }

  .copy-btn {
    color: var(--text-secondary);
  }

  .vault-container.dark .copy-btn {
    color: #cbd5e1;
  }

  .did-display {
    margin: 20px 0;
  }

  .label {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    display: block;
    font-weight: 500;
  }

  .did {
    background: var(--code-bg, #f1f5f9);
    padding: 10px 14px;
    border-radius: 10px;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    color: #1d4ed8;
    word-break: break-all;
    display: block;
  }

  .vault-container.dark .did {
    background: rgba(30,41,59,0.6);
    color: #c7d2fe;
  }

  /* Status blocks */
  .status {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-radius: 14px;
    margin: 20px 0;
    border: 1px solid transparent;
  }

  .status.success {
    background: var(--success-bg, #f0fdf4);
    border-color: #bbf7d0;
    color: var(--success-text, #166534);
  }

  .vault-container.dark .status.success {
    background: rgba(34,197,94,0.15);
    border-color: rgba(34,197,94,0.4);
    color: #86efac;
  }

  .status.warning {
    background: var(--warning-bg, #fffbeb);
    border-color: #fed7aa;
    color: var(--warning-text, #9a3412);
  }

  .vault-container.dark .status.warning {
    background: rgba(249,115,22,0.15);
    border-color: rgba(249,115,22,0.4);
    color: #fdba74;
  }

  .status.erased {
    background: var(--warning-bg, #fffbeb);
    border-color: #fed7aa;
    color: var(--warning-text, #9a3412);
  }

  .vault-container.dark .status.erased {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.4);
    color: #fca5a5;
  }

  .status mat-icon {
    font-size: 32px;
    width: 40px;
    height: 40px;
  }

  /* Buttons */
  .connect-btn,
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .connect-btn:hover,
  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(99,102,241,0.35);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px;
    background: var(--btn-secondary-bg, #f8fafc);
    color: #6366f1;
    border: 1px solid #e0e7ff;
    border-radius: 14px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.25s ease;
  }

  .vault-container.dark .btn-secondary {
    background: rgba(30,41,59,0.6);
    border-color: #4b5563;
    color: #a5b4fc;
  }

  .btn-secondary:hover {
    background: var(--btn-secondary-hover, #eef2ff);
    border-color: #c7d2fe;
    transform: translateY(-2px);
  }

  .vault-container.dark .btn-secondary:hover {
    background: rgba(99,102,241,0.2);
    border-color: #818cf8;
  }

  .actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  /* Loading & Muted */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 0;
    color: var(--text-secondary);
  }

  .muted {
    color: var(--text-secondary);
  }

  .small {
    font-size: 0.95rem;
    margin: 6px 0 0;
  }
    .refresh {
      text-align: center;
      margin-top: 24px;
    }

.content.p-4 {
      padding: 16px;
    }

    .flex {
      display: flex;
    }

    .gap-4 {
      gap: 16px;
    }

    .gap-2 {
      gap: 8px;
    }

    .items-center {
      align-items: center;
    }

    .text-success-600 {
      color: #16a34a;
    }

    .dark .text-success-600 {
      color: #86efac;
    }

    .text-amber-600 {
      color: #d97706;
    }

    .dark .text-amber-600 {
      color: #fbbf24;
    }

    /* ==========================================
   Tablet (≤ 960px)
   ========================================== */
@media (max-width: 960px) {
  .vault-container {
    padding: 20px 24px 48px;
  }

  .vault-header {
    margin-bottom: 36px;
  }

  h1 {
    font-size: clamp(1.8rem, 3vw + 1rem, 2.4rem);
  }

  .subtitle {
    font-size: 1.05rem;
    max-width: 600px;
  }

  .card {
    padding: 28px;
  }

  .card-header h3 {
    font-size: 1.35rem;
  }

  .actions {
    gap: 12px;
  }
}

/* ==========================================
   Phones (≤ 480px)
   ========================================== */
@media (max-width: 480px) {
  .vault-container {
    padding: 16px 16px 48px;
  }

  .vault-header {
    margin-bottom: 28px;
  }

  h1 {
    font-size: clamp(1.4rem, 4vw + 1rem, 2rem);
    text-align: center;
  }

  .subtitle {
    font-size: 1rem;
    max-width: 100%;
    line-height: 1.5;
    text-align: center;
  }

  .card {
    padding: 22px;
    border-radius: 16px;
  }

  .card:hover {
    transform: none; /* avoid jumpiness on touch */
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .card-header h3 {
    font-size: 1.2rem;
    text-align: left;
  }

  .address-row {
    flex-direction: column;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .actions button,
  .btn-primary,
  .btn-secondary,
  .connect-btn {
    width: 100%;
    justify-content: center;
  }

  .status {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
  }

  .status mat-icon {
    font-size: 28px;
    width: 32px;
    height: 32px;
  }
}

/* ==========================================
   Very Small Phones (≤ 320px)
   ========================================== */
@media (max-width: 320px) {
  h1 {
    font-size: 1.3rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .card {
    padding: 18px;
  }

  .btn-primary,
  .btn-secondary,
  .connect-btn {
    padding: 10px 14px;
    font-size: 0.9rem;
  }

  .status {
    padding: 10px;
  }

  .status mat-icon {
    font-size: 24px;
    width: 28px;
    height: 28px;
  }

  .address-input,
  .did {
    font-size: 0.9rem;
  }
}

`]
})
export class VaultComponent implements OnInit, OnDestroy {
  loading = signal(false);
  copied = signal(false);
  private lastErrorShown: number | null = null;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  public wallet = inject(WalletService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private profileState = inject(ProfileStateService);

  profileExists = this.profileState.profileExists;
  isErased = this.profileState.isErased;
  erasedAt = this.profileState.erasedAt;

  private sub?: Subscription;

  // Pinata JWT fields
  userPinataJwt = signal<string>('');
  hasUserJwt = signal<boolean>(false);

  private readonly USER_PINATA_JWT_KEY = 'user_pinata_jwt';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      const erasedDid = sessionStorage.getItem('erasedDid');
      const erasedAt = sessionStorage.getItem('erasedAt');

      if (erasedDid) {
        this.profileState.setProfileStatus(false, true, erasedAt);
      }

      // Load saved JWT
      const savedJwt = localStorage.getItem(this.USER_PINATA_JWT_KEY);
      if (savedJwt) {
        this.userPinataJwt.set(savedJwt);
        this.hasUserJwt.set(true);
      }
    }

    this.sub = this.wallet.address$.subscribe(address => {
      if (address) {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.removeItem('erasedDid');
          sessionStorage.removeItem('erasedAt');
        }
        this.checkProfile();
      } else {
        this.profileState.reset();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ────────────────────────────────────────────────
  // All your existing methods remain unchanged
  // ────────────────────────────────────────────────

  async checkProfile() {
    const address = this.wallet.address;
    if (!address) {
      this.profileState.reset();
      return;
    }

    if (this.profileExists() || this.isErased()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    try {
      const profile: any = await firstValueFrom(
        this.api.getProfile(address)
      );
      this.profileState.setProfileStatus(true, false, null);
    } catch (err: any) {
      if (err.status === 410) {
        this.profileState.setProfileStatus(false, true, err.error?.erasedAt || null);
      } else if (err.status === 404) {
        this.profileState.setProfileStatus(false, false, null);
      } else {
        console.error('Unexpected profile check failed', err);
        if (!this.lastErrorShown || Date.now() - this.lastErrorShown > 10000) {
          this.snackBar.open('Failed to check vault status', 'Close', { duration: 5000 });
          this.lastErrorShown = Date.now();
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  createProfile() {
    const address = this.wallet.address;
    if (!address || this.isErased()) return;

    this.loading.set(true);

    this.api.createProfile({ owner: address }).subscribe({
      next: () => {
        this.profileState.setProfileStatus(true, false, null);
        this.loading.set(false);
        this.snackBar.open('Vault profile created successfully!', 'Close', { duration: 4000 });
      },
      error: () => {
        this.snackBar.open('Failed to create vault profile', 'Close', { duration: 5000 });
        this.loading.set(false);
      }
    });
  }

  async connect() {
    try {
      this.loading.set(true);
      await this.wallet.connect();
    } catch (e: any) {
      this.snackBar.open(e.message || 'Wallet connection failed', 'Close', { duration: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  // ────────────────────────────────────────────────
  // Pinata JWT methods
  // ────────────────────────────────────────────────

  saveUserPinataJwt() {
    const jwt = this.userPinataJwt().trim();
    if (!jwt) {
      this.snackBar.open('Please enter a JWT', 'Close', { duration: 4000 });
      return;
    }

    // Basic JWT format validation
    if (!jwt.startsWith('eyJ') || jwt.split('.').length !== 3) {
      this.snackBar.open('Invalid JWT format', 'Close', { duration: 5000 });
      return;
    }

    localStorage.setItem(this.USER_PINATA_JWT_KEY, jwt);
    this.hasUserJwt.set(true);
    this.snackBar.open('Your Pinata JWT saved — uploads will use your account', 'Close', { duration: 6000 });
  }

  clearUserPinataJwt() {
    localStorage.removeItem(this.USER_PINATA_JWT_KEY);
    this.userPinataJwt.set('');
    this.hasUserJwt.set(false);
    this.snackBar.open('Removed — now using shared test key', 'Close', { duration: 5000 });
  }
}