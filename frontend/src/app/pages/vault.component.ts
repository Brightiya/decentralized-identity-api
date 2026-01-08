import { Component, OnInit, OnDestroy, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';

interface ProfileResponse {
  did: string;
  context?: string;
  attributes: any;
  credentials: any[];
  // Tombstone fields
  erased?: boolean;
  erasedAt?: string;
  gdpr?: { article: string; action: string };
  credentialSubject?: { id: string };
}

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
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

      <div class="wallet-info" *ngIf="wallet.address; else connectPrompt">
        <div class="address-row">
          <input class="address-input" [value]="wallet.address!" disabled />
          <button mat-icon-button class="copy-btn" (click)="copyAddress()">
            <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
          </button>
        </div>

        <div class="did-display">
          <span class="label">Decentralized Identifier (DID)</span>
          <code class="did">did:ethr:{{ wallet.address }}</code>
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
        <button class="connect-btn" (click)="connect()" [disabled]="loading">
          <mat-icon *ngIf="!loading">wallet</mat-icon>
          <span>{{ loading ? 'Connecting...' : 'Connect Wallet' }}</span>
        </button>
      </ng-template>
    </section>

    <!-- Profile Status Card -->
    <section class="card elevated" *ngIf="wallet.address || isErased">
      <div class="card-header">
        <mat-icon class="header-icon">shield</mat-icon>
        <h3>Vault Profile</h3>
      </div>

      <div class="profile-content">
        <ng-container *ngIf="loading; else profileLoaded">
          <div class="loading-state">
            <mat-spinner diameter="32"></mat-spinner>
            <p class="muted">Checking vault status...</p>
          </div>
        </ng-container>

        <ng-template #profileLoaded>
          <!-- Erased State -->
          <ng-container *ngIf="isErased">
            <div class="status erased">
              <mat-icon inline color="warn">privacy_tip</mat-icon>
              <div>
                <strong>Your identity has been permanently erased</strong>
                <p class="muted small">
                  You exercised your Right to be Forgotten on {{ erasedAt | date:'medium' }}.
                </p>
                <p class="muted small">
                  No credentials or personal data are accessible. This is cryptographically proven on-chain.
                </p>
              </div>
            </div>
          </ng-container>

          <!-- Active Profile -->
          <ng-container *ngIf="!isErased && profileExists">
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
          <ng-container *ngIf="!isErased && !profileExists">
            <div class="status warning">
              <mat-icon>info</mat-icon>
              <div>
                <strong>No vault profile found</strong>
                <p class="muted small">Create one to start issuing and managing credentials.</p>
              </div>
            </div>

            <button class="btn-primary" (click)="createProfile()" [disabled]="loading">
              <mat-icon *ngIf="!loading">add_box</mat-icon>
              <span>{{ loading ? 'Creating...' : 'Create Vault Profile' }}</span>
            </button>
          </ng-container>
        </ng-template>
      </div>
    </section>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100%;
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
    font-size: 2.8rem;
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
`]
})
export class VaultComponent implements OnInit, OnDestroy {
  loading = false;
  profileExists = false;
  copied = false;
  isErased = false;
  erasedAt: string | null = null;
  currentProfile: any = null;
  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;  // ← readonly signal

  private sub?: Subscription;
 

  constructor(
    public wallet: WalletService,
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const isBrowser = isPlatformBrowser(this.platformId);
      
     if (isBrowser) {
    const erasedDid = sessionStorage.getItem('erasedDid');
    const erasedAt = sessionStorage.getItem('erasedAt');

      if (erasedDid) {
        this.isErased = true;
        this.profileExists = false;
        this.erasedAt = erasedAt;
        this.loading = false;
      }
    }
    this.sub = this.wallet.address$.subscribe(address => {
      if (address) {
         sessionStorage.removeItem('erasedDid');
          sessionStorage.removeItem('erasedAt');
          this.checkProfile();
      } 
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
/** 
  private resetState() {
    this.profileExists = false;
    this.isErased = false;
    this.erasedAt = null;
    this.currentProfile = null;
  }
  */

  async checkProfile() {
  if (!this.wallet.address) return;
  this.loading = true;

  try {
    const profile: any = await firstValueFrom(
      this.api.getProfile(this.wallet.address)
    );

    // If we get here, profile exists and is active
    this.isErased = false;
    this.profileExists = true;
    this.erasedAt = null;

  } catch (err: any) {
    if (err.status === 410) {
      // ✅ GDPR-erased
      this.isErased = true;
      this.profileExists = false;
      this.erasedAt = err.error?.erasedAt || null;
    } else if (err.status === 404) {
      // No profile ever created
      this.isErased = false;
      this.profileExists = false;
      this.erasedAt = null;
    } else {
      console.error('Profile check failed', err);
      this.isErased = false;
      this.profileExists = false;
    }
  } finally {
    this.loading = false;
  }
}

  createProfile() {
    if (!this.wallet.address || this.isErased) return;

    this.loading = true;
    this.api.createProfile({ owner: this.wallet.address }).subscribe({
      next: () => {
        this.profileExists = true;
        this.isErased = false;
        this.loading = false;
      },
      error: () => {
        alert('Failed to create vault profile');
        this.loading = false;
      }
    });
  }

  async connect() {
    try {
      this.loading = true;
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || 'Wallet connection failed');
    } finally {
      this.loading = false;
    }
  }

  copyAddress() {
    if (!this.wallet.address) return;
    navigator.clipboard.writeText(this.wallet.address);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }
}