import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';


// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-gdpr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
  <div class="gdpr-container" [class.dark]="darkMode()">
    <div class="gdpr-header">
      <h1>GDPR – Right to Erasure</h1>
      <p class="subtitle">
        Exercise your <strong>Right to be Forgotten</strong> (GDPR Article 17).<br />
        Permanently erase your decentralized identity profile and all associated credentials.
      </p>
    </div>

    <!-- Wallet Connection -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>account_balance_wallet</mat-icon>
        <mat-card-title>Identity Verification</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <ng-container *ngIf="wallet.address; else connectPrompt">
          <div class="connected-state">
            <div class="did-display">
              <strong>Your DID:</strong>
              <code>did:ethr:{{ wallet.address }}</code>
              <button mat-icon-button (click)="copyDid()" matTooltip="Copy DID">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <p class="status success">
              <mat-icon inline>verified_user</mat-icon>
              Wallet connected — ready for erasure request
            </p>
          </div>
        </ng-container>

        <ng-template #connectPrompt>
          <p class="muted">
            Connect your wallet to initiate a GDPR erasure request.
          </p>
          <button mat-raised-button color="primary" (click)="connect()" [disabled]="connecting">
            <mat-icon *ngIf="!connecting">wallet</mat-icon>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <!-- Erasure Request Form -->
    <mat-card class="card elevated warning-card" appearance="outlined" *ngIf="wallet.address">
      <mat-card-header>
        <mat-icon class="header-icon" color="warn" mat-card-avatar>warning_amber</mat-icon>
        <mat-card-title>Irreversible Erasure Request</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <div class="warning-box">
          <mat-icon inline color="warn">error_outline</mat-icon>
          <div>
            <strong>This action cannot be undone.</strong><br />
            Your entire identity profile, credentials, and disclosure history will be permanently replaced with a cryptographically verifiable <em>erasure tombstone</em> on-chain.
            <br /><br />
            After erasure:
            <ul>
              <li>No verifier will be able to access your data</li>
              <li>Your DID will remain, but point to an "erased" state</li>
              <li>Compliance with GDPR Art. 17 is proven on-chain</li>
            </ul>
          </div>
        </div>

        <mat-checkbox [(ngModel)]="confirmed" color="warn" class="confirmation-checkbox">
          <strong>I fully understand the consequences</strong> and request permanent erasure of my decentralized identity profile.
        </mat-checkbox>

        <div class="actions">
          <button
            mat-raised-button
            color="warn"
            class="erase-btn"
            [disabled]="!confirmed || loading"
            (click)="erase()">
            <mat-icon *ngIf="!loading">delete_forever</mat-icon>
            <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
            <span>{{ loading ? 'Processing Erasure...' : 'Erase My Profile' }}</span>
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Success State -->
    <mat-card class="card elevated success-card" appearance="outlined" *ngIf="result">
      <mat-card-header>
        <mat-icon class="header-icon" color="primary" mat-card-avatar>task_alt</mat-icon>
        <mat-card-title>Erasure Completed Successfully</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <p>
          Your identity profile has been permanently erased and replaced with a GDPR-compliant tombstone.
        </p>
        <p class="small muted">
          Transaction details:
        </p>
        <pre class="result-pre">{{ result | json }}</pre>
      </mat-card-content>
    </mat-card>

    <!-- Error State -->
    <mat-card class="card elevated error-card" appearance="outlined" *ngIf="error">
      <mat-card-header>
        <mat-icon class="header-icon" color="warn" mat-card-avatar>error</mat-icon>
        <mat-card-title>Erasure Failed</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <p>{{ error }}</p>
        <p class="small muted">Please try again or contact support if the issue persists.</p>
      </mat-card-content>
    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100%;
  }

  .gdpr-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .gdpr-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .gdpr-header {
    text-align: center;
    margin-bottom: 48px;
  }

  h1 {
    font-size: 2.8rem;
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 16px;
    letter-spacing: -0.6px;
  }

  .subtitle {
    font-size: 1.15rem;
    color: var(--text-secondary, #94a3b8);
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Cards */
  .card {
    background: var(--card-bg, white);
    border-radius: 20px;
    margin-bottom: 32px;
    border: 1px solid var(--card-border, #e2e8f0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gdpr-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .gdpr-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .gdpr-container.dark .card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
  }

  mat-card-header {
    align-items: center;
    margin-bottom: 24px;
  }

  .header-icon {
    font-size: 32px;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--icon-bg, rgba(99,102,241,0.12));
    border-radius: 14px;
    color: #6366f1;
  }

  .gdpr-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  /* Connected State */
  .did-display {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    padding: 14px 18px;
    background: var(--code-bg, #f1f5f9);
    border-radius: 14px;
    font-size: 1rem;
  }

  .gdpr-container.dark .did-display {
    background: rgba(30,41,59,0.6);
  }

  .did-display code {
    flex: 1;
    color: #1d4ed8;
    font-family: 'Courier New', monospace;
  }

  .gdpr-container.dark .did-display code {
    color: #c7d2fe;
  }

  .status.success {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--success-bg, #f0fdf4);
    border: 1px solid #bbf7d0;
    color: var(--success-text, #166534);
    padding: 14px;
    border-radius: 12px;
    margin: 16px 0;
  }

  .gdpr-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  /* Warning Card */
  .warning-card {
    border-left: 5px solid #f59e0b;
  }

  .gdpr-container.dark .warning-card {
    border-left-color: #fbbf24;
  }

  .warning-box {
    display: flex;
    gap: 16px;
    background: var(--warning-bg, #fffbeb);
    border: 1px solid #fed7aa;
    padding: 20px;
    border-radius: 14px;
    margin-bottom: 28px;
    font-size: 1rem;
    color: var(--warning-text, #9a3412);
  }

  .gdpr-container.dark .warning-box {
    background: rgba(245,158,11,0.15);
    border-color: rgba(245,158,11,0.45);
    color: #fcd34d;
  }

  .warning-box ul {
    margin: 12px 0 0 24px;
    padding-left: 0;
  }

  .warning-box li {
    margin-bottom: 8px;
  }

  .confirmation-checkbox {
    display: block;
    margin: 28px 0;
    padding: 16px;
    background: var(--warning-bg, #fffbeb);
    border-radius: 14px;
    border: 1px solid #fed7aa;
    font-size: 1.05rem;
  }

  .gdpr-container.dark .confirmation-checkbox {
    background: rgba(245,158,11,0.15);
    border-color: rgba(245,158,11,0.45);
    color: #fcd34d;
  }

  .actions {
    text-align: right;
    margin-top: 28px;
  }

  .erase-btn {
    padding: 14px 40px;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    transition: all 0.25s ease;
  }

  .erase-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(239,68,68,0.4);
  }

  /* Success & Error Cards */
  .success-card {
    border-left: 5px solid #16a34a;
  }

  .gdpr-container.dark .success-card {
    border-left-color: #22c55e;
  }

  .error-card {
    border-left: 5px solid #dc2626;
  }

  .gdpr-container.dark .error-card {
    border-left-color: #ef4444;
  }

  .result-pre {
    background: var(--code-bg, #1e1e1e);
    color: #9cdcfe;
    padding: 20px;
    border-radius: 14px;
    overflow-x: auto;
    font-size: 0.95rem;
    margin-top: 16px;
  }

  .gdpr-container.dark .result-pre {
    background: #0d1117;
    color: #c9d1d9;
  }

  /* Misc */
  .muted { color: var(--text-secondary); }
  .small { font-size: 0.9rem; }

  /* Dark mode Material fixes (labels, inputs, checkboxes) */
  .gdpr-container.dark {
    .mat-mdc-form-field-label,
    .mat-mdc-form-field-hint,
    .mat-mdc-input-element::placeholder {
      color: #94a3b8 !important;
      opacity: 1 !important;
    }

    .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: #a5b4fc !important;
    }

    .mat-mdc-input-element,
    .mat-mdc-checkbox-label,
    .mat-mdc-checkbox-label span {
      color: #f1f5f9 !important;
    }

    .mat-mdc-form-field-underline,
    .mat-mdc-form-field-ripple {
      background-color: #6366f1 !important;
    }

    .mat-mdc-checkbox-checked .mat-mdc-checkbox-background,
    .mat-mdc-checkbox-indeterminate .mat-mdc-checkbox-background {
      background-color: #6366f1 !important;
    }

    .mat-mdc-form-field-disabled .mat-mdc-form-field-label,
    .mat-mdc-form-field-disabled .mat-mdc-input-element {
      color: #6b7280 !important;
    }
  }
`]
})

export class GdprComponent {
  confirmed = false;
  connecting = false;
  loading = false;
  copied = false;

  result: any = null;
  error: string | null = null;
  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  constructor(
    public wallet: WalletService,
    private api: ApiService,
   // private router: Router
  ) {}

  async connect() {
    this.connecting = true;
    try {
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || 'Wallet connection failed');
    } finally {
      this.connecting = false;
    }
  }

  copyDid() {
    if (!this.wallet.address) return;
    const did = `did:ethr:${this.wallet.address}`;
    navigator.clipboard.writeText(did);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  erase() {
    if (!this.wallet.address || !this.confirmed) return;

    this.loading = true;
    this.result = null;
    this.error = null;

    // FIXED: payload now matches ApiService signature
    const payload = { did: `did:ethr:${this.wallet.address}` };

    this.api.eraseProfile(payload).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
        this.confirmed = false;
        // ✅ Remember erased DID for Vault display
        sessionStorage.setItem(
          'erasedDid',
          `did:ethr:${this.wallet.address}`
        );
        sessionStorage.setItem(
          'erasedAt',
          new Date().toISOString()
        );
        // ✅ GDPR-compliant cleanup
        this.wallet.disconnect();
        // ✅ Leave identity-related views
       // this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.error = err?.error?.message || err?.message || 'Erasure request failed';
        this.loading = false;
      }
    });
  }
}

export default GdprComponent;
