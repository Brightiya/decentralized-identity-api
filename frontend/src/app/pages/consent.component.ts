/** 
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimService } from '../services/claim.service';
import { WalletService } from '../services/wallet.service';

@Component({
  selector: 'app-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Consent Management</h2>

    <button (click)="connectWallet()">Connect Wallet</button>
    <div *ngIf="walletAddress" class="muted">
      Connected: {{ walletAddress }}
    </div>

    <hr />

    <!-- Context -->
    <section class="card">
      <label>Context</label>
      <select [(ngModel)]="context">
        <option value="">-- Select context --</option>
        <option *ngFor="let c of contexts" [value]="c">
          {{ c | titlecase }}
        </option>
      </select>
    </section>

    <!-- Attributes -->
    <section class="card" *ngIf="context">
      <h3>Attributes to Share</h3>

      <label *ngFor="let attr of attributes">
        <input
          type="checkbox"
          [checked]="selectedAttributes.includes(attr)"
          (change)="toggleAttribute(attr)"
        />
        {{ attr }}
      </label>
    </section>

    <!-- Consent -->
    <section class="card" *ngIf="selectedAttributes.length">
      <label>
        <input type="checkbox" [(ngModel)]="explicitConsent" />
        I explicitly consent to share the selected attributes
      </label>

      <button
        [disabled]="!explicitConsent"
        (click)="grantConsent()"
      >
        Grant Consent
      </button>
    </section>

    <!-- Revoke -->
    <section class="card muted" *ngIf="consentClaimId">
      <p>Consent ID: {{ consentClaimId }}</p>
      <button class="danger" (click)="revokeConsent()">
        Revoke Consent
      </button>
    </section>

    <pre *ngIf="result">{{ result | json }}</pre>
  `,
  styles: [`
    .card {
      padding: 16px;
      border-radius: 12px;
      background: #fff;
      margin-bottom: 16px;
      max-width: 520px;
      box-shadow: 0 2px 6px rgba(0,0,0,.05);
    }
    label { display: block; margin-bottom: 8px; }
    select { width: 100%; padding: 6px; }
    button { margin-top: 8px; }
    .danger { background: #ffebee; color: #c62828; }
    .muted { color: #666; }
  `]
})
export class ConsentComponent {
  walletAddress: string | null = null;

  contexts = ['personal', 'professional', 'legal'];
  attributes = ['name', 'email', 'credentials'];

  context = '';
  selectedAttributes: string[] = [];
  explicitConsent = false;

  consentClaimId: string | null = null;
  result: any;

  constructor(
    private claims: ClaimService,
    private wallet: WalletService
  ) {}

  async connectWallet() {
    const r = await this.wallet.connect();
    this.walletAddress = r.address;
  }

  toggleAttribute(attr: string) {
    if (this.selectedAttributes.includes(attr)) {
      this.selectedAttributes = this.selectedAttributes.filter(a => a !== attr);
    } else {
      this.selectedAttributes.push(attr);
    }
  }

  async grantConsent() {
    if (!this.walletAddress) return;

    const payload = {
      owner: this.walletAddress,
      context: this.context,
      attributes: this.selectedAttributes,
      timestamp: new Date().toISOString()
    };

    const claimHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(payload))
    );

    const hashHex = Array.from(new Uint8Array(claimHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    this.consentClaimId = `consent:${this.context}`;

    this.claims.setClaim({
      owner: this.walletAddress,
      claimId: this.consentClaimId,
      claimHash: hashHex
    }).subscribe(res => this.result = res);
  }

  revokeConsent() {
    if (!this.walletAddress || !this.consentClaimId) return;

    this.claims.removeClaim({
      owner: this.walletAddress,
      claimId: this.consentClaimId
    }).subscribe(res => {
      this.result = res;
      this.consentClaimId = null;
      this.selectedAttributes = [];
      this.explicitConsent = false;
    });
  }
}
*/

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClaimService } from '../services/claim.service';
import { WalletService } from '../services/wallet.service';
import { ContextService } from '../services/context.service';
import { ApiService } from '../services/api.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-consent',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="consent-header">
      <h1>Consent Management</h1>
      <p class="subtitle">
        Control exactly which personal attributes you share and with whom. Your explicit consent is required for any disclosure.
      </p>
    </div>

    <!-- Wallet Connection -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>account_balance_wallet</mat-icon>
        <mat-card-title>Wallet Connection</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <ng-container *ngIf="wallet.address; else connectPrompt">
          <div class="connected-state">
            <div class="address-row">
              <code class="address">{{ wallet.address }}</code>
              <button mat-icon-button (click)="copyAddress()" matTooltip="Copy address">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <p class="status success">
              <mat-icon inline>check_circle</mat-icon>
              Wallet connected successfully
            </p>
          </div>
        </ng-container>

        <ng-template #connectPrompt>
          <p class="muted">
            Connect your wallet to manage consent for attribute disclosure.
          </p>
          <button mat-raised-button color="primary" (click)="connectWallet()" [disabled]="connecting">
            <mat-icon *ngIf="!connecting">wallet</mat-icon>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <!-- Consent Flow (only visible after wallet connection) -->
    <ng-container *ngIf="wallet.address">
      <!-- Context Selection -->
      <mat-card class="card elevated" appearance="outlined">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>folder_special</mat-icon>
          <mat-card-title>Select Context</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Disclosure Context</mat-label>
            <mat-select [(ngModel)]="context" (selectionChange)="onContextChange()">
              <mat-option value="">-- Choose a context --</mat-option>
              <mat-option *ngFor="let c of contexts" [value]="c">
                {{ c | titlecase }}
              </mat-option>
            </mat-select>
            <mat-icon matSuffix>arrow_drop_down</mat-icon>
          </mat-form-field>

          <div class="hint" *ngIf="context">
            <mat-icon inline>info</mat-icon>
            Attributes available in the <strong>{{ context | titlecase }}</strong> context will be shown below.
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Attribute Selection -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="context && !loadingAttributes && attributes.length > 0">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>fact_check</mat-icon>
          <mat-card-title>Attributes to Share</mat-card-title>
          <div class="badge">{{ selectedAttributes.length }} selected</div>
        </mat-card-header>

        <mat-card-content>
          <div class="attributes-list">
            <mat-checkbox
              *ngFor="let attr of attributes"
              [checked]="selectedAttributes.includes(attr)"
              (change)="toggleAttribute(attr)">
              {{ attr | titlecase }}
            </mat-checkbox>
          </div>

          <div class="warning-box" *ngIf="selectedAttributes.length === 0">
            <mat-icon inline>warning</mat-icon>
            Select at least one attribute to proceed with consent.
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Loading attributes -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="context && loadingAttributes">
        <mat-card-content class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading attributes for {{ context | titlecase }} context...</p>
        </mat-card-content>
      </mat-card>

      <!-- Explicit Consent & Grant -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="selectedAttributes.length > 0">
        <mat-card-header>
          <mat-icon class="header-icon" color="warn" mat-card-avatar>privacy_tip</mat-icon>
          <mat-card-title>Explicit Consent Required</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <mat-checkbox [(ngModel)]="explicitConsent">
            <strong>I explicitly consent</strong> to sharing the selected attributes from my
            <strong>{{ context | titlecase }}</strong> context for verification purposes.
            <br /><small class="muted">This consent is recorded on-chain and can be revoked at any time.</small>
          </mat-checkbox>

          <div class="actions">
            <button
              mat-raised-button
              color="primary"
              (click)="grantConsent()"
              [disabled]="!explicitConsent || loading">
              <mat-icon *ngIf="!loading">task_alt</mat-icon>
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span>{{ loading ? 'Recording Consent...' : 'Grant Consent' }}</span>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Active Consent / Revoke -->
      <mat-card class="card elevated revoke-card" appearance="outlined" *ngIf="activeConsent">
        <mat-card-header>
          <mat-icon class="header-icon" color="warn" mat-card-avatar>gavel</mat-icon>
          <mat-card-title>Active Consent</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <p>
            <strong>Consent ID:</strong> <code>{{ activeConsent.claimId }}</code>
          </p>
          <p class="small muted">
            Issued on: {{ activeConsent.timestamp | date:'medium' }}
          </p>

          <button mat-raised-button color="warn" (click)="revokeConsent()" [disabled]="loading">
            <mat-icon>delete_forever</mat-icon>
            Revoke Consent
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Empty States -->
      <mat-card class="card elevated empty-state" *ngIf="context && !loadingAttributes &&  attributes.length === 0">
        <mat-icon class="empty-icon">inbox</mat-icon>
        <h3>No attributes available</h3>
        <p class="muted">
          No credentials have been issued for the <strong>{{ context | titlecase }}</strong> context yet.
          Go to <a routerLink="/credentials">Credentials</a> to issue one.
        </p>
      </mat-card>
    </ng-container>

    <!-- Debug Output (can be removed in production) -->
    <pre class="debug" *ngIf="result">{{ result | json }}</pre>
  `,
  styles: [`
    .consent-header {
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

    .badge {
      margin-left: auto;
      padding: 4px 12px;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 12px;
    }

    .address-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .address {
      flex: 1;
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      color: #1e40af;
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

    .attributes-list {
      display: grid;
      gap: 12px;
      margin: 16px 0;
    }

    .warning-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fffbeb;
      border: 1px solid #fed7aa;
      color: #9a3412;
      padding: 12px;
      border-radius: 10px;
      margin-top: 16px;
    }

    .actions {
      margin-top: 24px;
      text-align: right;
    }

    .revoke-card {
      border-left: 4px solid #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 64px;
      width: 80px;
      height: 80px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      color: #475569;
      margin: 16px 0;
    }

    .empty-state a {
      color: #6366f1;
      text-decoration: underline;
    }

    .debug {
      background: #1e1e1e;
      color: #9cdcfe;
      padding: 16px;
      border-radius: 12px;
      margin-top: 32px;
      font-size: 0.9rem;
      overflow-x: auto;
    }

    .small { font-size: 0.9rem; }
    .muted { color: #64748b; }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 0;
      color: #64748b;
    }
  `]
})
export class ConsentComponent implements OnInit {
  walletAddress: string | null = null;
  connecting = false;
  loading = false;
  loadingAttributes = false;
  copied = false;

  contexts: string[] = []; // Will be populated from ContextService or API
  attributes: string[] = [];
  //attributes: string[] = ['name', 'email', 'date of birth', 'nationality']; // Example; ideally loaded dynamically

  context = '';
  selectedAttributes: string[] = [];
  explicitConsent = false;

  activeConsent: { claimId: string; timestamp: string } | null = null;
  result: any;

  constructor(
    private claims: ClaimService,
    public wallet: WalletService,
    private contextService: ContextService,
    private api: ApiService
  ) {
    this.walletAddress = this.wallet.address;

    }

  ngOnInit() {
    // React to future changes (connect/disconnect)
    this.wallet.address$.subscribe(addr => {
      this.walletAddress = addr;
      if (!addr) {
        this.resetForm();
      }
    });
    // SUBSCRIBE TO CONTEXTSERVICE
    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts = ctxs.sort(); // Optional: keep alphabetical order
    });

  }
  private resetForm() {
    this.context = '';
    this.selectedAttributes = [];
    this.explicitConsent = false;
    this.activeConsent = null;
  }

  async connectWallet() {
    this.connecting = true;
    try {
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || 'Wallet connection failed');
    } finally {
      this.connecting = false;
    }
  }

  copyAddress() {
    if (!this.wallet.address) return;
    navigator.clipboard.writeText(this.wallet.address);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  onContextChange() {
    this.selectedAttributes = [];
    this.explicitConsent = false;
    this.activeConsent = null;

    if (!this.context || !this.wallet.address) {
      this.attributes = [];
      return;
    }
    this.loadAttributesForContext()
  }

  private loadAttributesForContext() {
    this.loadingAttributes = true;
    this.attributes = [];

    this.api.getProfileByContext(this.wallet.address!, this.context).subscribe({
      next: (res: any) => {
        const attrsObj = res.attributes || {};
        this.attributes = Object.keys(attrsObj);
        this.loadingAttributes = false;
      },
      error: (err) => {
        console.error('Failed to load attributes for context:', err);
        this.attributes = [];
        this.loadingAttributes = false;
      }
    });
  }

  toggleAttribute(attr: string) {
    if (this.selectedAttributes.includes(attr)) {
      this.selectedAttributes = this.selectedAttributes.filter(a => a !== attr);
    } else {
      this.selectedAttributes.push(attr);
    }
    this.explicitConsent = false; // Reset consent when selection changes
  }

  async grantConsent() {
    if (!this.wallet.address || this.selectedAttributes.length === 0) return;

    this.loading = true;

    const payload = {
      owner: this.wallet.address,
      context: this.context,
      attributes: this.selectedAttributes,
      purpose: 'selective disclosure',
      timestamp: new Date().toISOString()
    };

    try {
      const claimHash = await this.hashPayload(payload);
      const claimId = `consent:${this.context}:${Date.now()}`;

      this.claims.setClaim({
        owner: this.wallet.address,
        claimId,
        claimHash
      }).subscribe({
        next: (res) => {
          this.result = res;
          this.activeConsent = { claimId, timestamp: payload.timestamp };
          this.explicitConsent = false;
        },
        error: (err) => {
          alert('Failed to record consent');
          console.error(err);
        }
      });
    } catch (err) {
      alert('Error preparing consent');
    } finally {
      this.loading = false;
    }
  }

  revokeConsent() {
    if (!this.activeConsent || !this.wallet.address) return;

    this.loading = true;
    this.claims.removeClaim({
      owner: this.wallet.address,
      claimId: this.activeConsent.claimId
    }).subscribe({
      next: (res) => {
        this.result = res;
        this.activeConsent = null;
        this.selectedAttributes = [];
        this.explicitConsent = false;
      },
      error: () => alert('Failed to revoke consent')
    }).add(() => this.loading = false);
  }

  private async hashPayload(payload: any): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
export default ConsentComponent;