/** 
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gdpr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>GDPR – Right to Erasure</h2>

    <p class="muted">
      Permanently revoke access to your decentralized identity profile and
      credentials (GDPR Art. 17).
    </p>

    <!-- Wallet connect -->
    <button class="btn" *ngIf="!wallet.address" (click)="connect()">
      Connect Wallet
    </button>

    <section *ngIf="wallet.address" class="card">
      <p class="small muted">
        Your DID:
        <strong>did:ethr:{{ wallet.address }}</strong>
      </p>

      <div class="warning">
        ⚠️ This action is irreversible.
        <br />
        Your profile will be replaced with an <em>erasure tombstone</em>.
      </div>

      <label class="checkbox">
        <input type="checkbox" [(ngModel)]="confirmed" />
        I understand and want to erase my profile
      </label>

      <button
        class="btn-danger"
        [disabled]="!confirmed || loading"
        (click)="erase()"
      >
        Erase My Profile
      </button>
    </section>

    <!-- Loading -->
    <p *ngIf="loading" class="muted small">
      Processing erasure…
    </p>

    <!-- Result -->
    <section *ngIf="result" class="card success">
      <h3>Erasure Completed</h3>
      <pre>{{ result | json }}</pre>
    </section>

    <!-- Error -->
    <section *ngIf="error" class="card error">
      {{ error }}
    </section>
  `,
  styles: [`
    .card {
      background: #fff;
      padding: 16px;
      border-radius: 12px;
      margin-top: 16px;
      max-width: 520px;
      box-shadow: 0 2px 6px rgba(0,0,0,.05);
    }
    .btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: none;
      background: #1976d2;
      color: white;
      cursor: pointer;
    }
    .btn-danger {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      border: none;
      background: #d32f2f;
      color: white;
      cursor: pointer;
    }
    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeeba;
      padding: 10px;
      border-radius: 8px;
      margin: 12px 0;
      font-size: 0.9em;
    }
    .checkbox {
      display: block;
      margin-top: 8px;
      font-size: 0.9em;
    }
    .muted { color: #666; }
    .small { font-size: 0.9em; }
    .success { border-left: 4px solid #2e7d32; }
    .error { border-left: 4px solid #d32f2f; }
  `]
})
export class GdprComponent {
  confirmed = false;
  loading = false;
  result: any = null;
  error: string | null = null;

  constructor(
    public wallet: WalletService,
    private api: ApiService
  ) {}

  async connect() {
    try {
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || e);
    }
  }

  erase() {
    if (!this.wallet.address) return;

    this.loading = true;
    this.result = null;
    this.error = null;

    const did = `did:ethr:${this.wallet.address}`;

    this.api.eraseProfile({ did }).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.error || 'Erasure failed';
        this.loading = false;
      }
    });
  }
}
*/

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

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
        <!-- FIXED: json pipe takes no arguments -->
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
  `,
  styles: [`
    .gdpr-header {
      text-align: center;
      margin-bottom: 40px;
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
      max-width: 720px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .card {
      margin-bottom: 24px;
      max-width: 760px;
      transition: all 0.3s ease;
    }

    .elevated {
      box-shadow: 0 8px 28px rgba(0,0,0,0.08);
    }

    .card:hover {
      transform: translateY(-4px);
    }

    mat-card-header {
      align-items: center;
      margin-bottom: 16px;
    }

    .header-icon {
      background: rgba(99, 102, 241, 0.1);
      color: #6366f1;
      border-radius: 12px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .did-display {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0;
      padding: 12px;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 0.95rem;
    }

    .did-display code {
      color: #1e40af;
      font-family: 'Courier New', monospace;
      flex: 1;
    }

    .status.success {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #166534;
      background: #f0fdf4;
      padding: 12px;
      border-radius: 10px;
    }

    .warning-card {
      border-left: 4px solid #f59e0b;
    }

    .warning-box {
      display: flex;
      gap: 12px;
      background: #fffbeb;
      border: 1px solid #fed7aa;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      font-size: 0.95rem;
      color: #9a3412;
    }

    .warning-box ul {
      margin: 8px 0 0 20px;
    }

    .confirmation-checkbox {
      display: block;
      margin: 24px 0;
      padding: 16px;
      background: #fff3cd;
      border-radius: 12px;
      border: 1px solid #ffeeba;
    }

    .actions {
      text-align: right;
      margin-top: 24px;
    }

    .erase-btn {
      padding: 14px 32px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .success-card {
      border-left: 4px solid #2e7d32;
    }

    .error-card {
      border-left: 4px solid #d32f2f;
    }

    .result-pre {
      background: #1e1e1e;
      color: #9cdcfe;
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
      font-size: 0.9rem;
      margin-top: 12px;
    }

    .muted {
      color: #64748b;
    }

    .small {
      font-size: 0.9rem;
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

  constructor(
    public wallet: WalletService,
    private api: ApiService
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
      },
      error: (err: any) => {
        this.error = err?.error?.message || err?.message || 'Erasure request failed';
        this.loading = false;
      }
    });
  }
}

export default GdprComponent;
