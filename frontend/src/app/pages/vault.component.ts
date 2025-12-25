/** 
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <h2>Identity Vault</h2>

    <!-- Wallet / DID -->
    <section class="card">
      <label class="muted">Connected identity</label>

      <div class="row">
        <input
          class="input"
          [value]="wallet.address || ''"
          placeholder="0xAAA111"
          disabled
        />
        <button
          class="btn"
          (click)="connect()"
          [disabled]="loading || wallet.address">
          {{ wallet.address ? 'Connected' : 'Connect' }}
        </button>
      </div>

      <div class="small muted">
        DID:
        <strong *ngIf="wallet.address">
          did:ethr:{{ wallet.address }}
        </strong>
        <span *ngIf="!wallet.address">—</span>
      </div>
    </section>

    <!-- Profile state -->
    <section class="card" *ngIf="wallet.address">
      <h3>Profile status</h3>

      <ng-container *ngIf="loading">
        <p class="small muted">Checking profile…</p>
      </ng-container>

      <ng-container *ngIf="!loading">
        <p class="small">
          {{ profileExists
            ? 'Your identity vault is active.'
            : 'No profile found. A new vault will be created.' }}
        </p>

        <button
          class="btn-secondary"
          *ngIf="!profileExists"
          (click)="createProfile()">
          Create Vault Profile
        </button>

        <a
          *ngIf="profileExists"
          routerLink="/contexts"
          class="btn-secondary">
          Manage Contexts
        </a>
      </ng-container>
    </section>
  `,
  styles: [`
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,.05);
      max-width: 520px;
    }
    .row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .input {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .btn {
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: #1976d2;
      color: #fff;
      cursor: pointer;
    }
    .btn-secondary {
      display: inline-block;
      padding: 8px 12px;
      border-radius: 8px;
      background: #e3f2fd;
      color: #1976d2;
      border: none;
      cursor: pointer;
      margin-top: 8px;
      text-decoration: none;
    }
    .muted { color: #666; }
    .small { font-size: 0.9em; }
  `]
})
export class VaultComponent implements OnInit, OnDestroy {
  loading = false;
  profileExists = false;

  private sub?: Subscription;

  constructor(
    public wallet: WalletService,
    private api: ApiService
  ) {}

  ngOnInit() {
    // ✅ React to wallet state (SSR-safe)
    this.sub = this.wallet.address$.subscribe(address => {
      if (address) {
        this.checkProfile();
      } else {
        this.profileExists = false;
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
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

  async checkProfile() {
    const address = this.wallet.address!;
    this.loading = true;

    try {
      await firstValueFrom(this.api.getProfile(address));
      this.profileExists = true;
    } catch {
      this.profileExists = false;
    } finally {
      this.loading = false;
    }
  }

  createProfile() {
    const payload = { owner: this.wallet.address };

    this.loading = true;
    this.api.createProfile(payload).subscribe({
      next: () => {
        this.profileExists = true;
        this.loading = false;
      },
      error: () => {
        alert('Failed to create profile');
        this.loading = false;
      }
    });
  }
}
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
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
  `,
  styles: [`
    .vault-header {
      margin-bottom: 32px;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 12px 0;
    }

    .subtitle {
      color: #64748b;
      font-size: 1.1rem;
      max-width: 640px;
      margin: 0 auto;
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      max-width: 680px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .elevated {
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }

    .card:hover {
      transform: translateY(-4px);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .header-icon {
      font-size: 28px;
      color: #6366f1;
      width: 40px;
      height: 40px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #1e293b;
    }

    .address-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .address-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
    }

    .copy-btn {
      color: #64748b;
    }

    .copy-btn:hover {
      color: #6366f1;
    }

    .did-display {
      margin: 16px 0;
    }

    .label {
      font-size: 0.9rem;
      color: #64748b;
      margin-bottom: 4px;
      display: block;
    }

    .did {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      color: #1e40af;
      word-break: break-all;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      margin: 16px 0;
    }

    .status.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .status.warning {
      background: #fffbeb;
      border: 1px solid #fed7aa;
      color: #9a3412;
    }

    .status mat-icon {
      font-size: 28px;
      width: 36px;
      height: 36px;
    }

    .connect-btn,
    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .connect-btn:hover,
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.3);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #f8fafc;
      color: #6366f1;
      border: 1px solid #e0e7ff;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #eef2ff;
      border-color: #c7d2fe;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 0;
      color: #64748b;
    }

    .muted {
      color: #64748b;
    }

    .small {
      margin: 4px 0 0 0;
      font-size: 0.9rem;
    }

    .status.erased {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
      background: #fffbeb;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      color: #9a3412;
      margin: 16px 0;
    }

    .status.erased mat-icon {
      font-size: 36px;
      width: 44px;
      height: 44px;
      margin-top: 4px;
    }

    .status.erased strong {
      font-size: 1.2rem;
      display: block;
      margin-bottom: 8px;
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