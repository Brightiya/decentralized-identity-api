import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
import { MatDividerModule } from '@angular/material/divider';

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
    MatTooltipModule,
    MatDividerModule
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

    <!-- Consent Flow -->
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
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Attribute Selection -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="context && attributes.length > 0">
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
        </mat-card-content>
      </mat-card>

      <!-- Purpose & Explicit Consent -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="selectedAttributes.length > 0">
        <mat-card-header>
          <mat-icon class="header-icon" color="warn" mat-card-avatar>privacy_tip</mat-icon>
          <mat-card-title>Purpose & Explicit Consent</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <!-- Purpose Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Purpose of Disclosure</mat-label>
            <input matInput [(ngModel)]="purpose" placeholder="e.g. medical treatment, employment verification" required />
            <mat-hint>The specific purpose for which this data will be used</mat-hint>
          </mat-form-field>

          <!-- Checkbox with reliable (change) binding -->
          <mat-checkbox
            [checked]="explicitConsent"
            (change)="explicitConsent = $event.checked">
            <strong>I explicitly consent</strong> to sharing the selected attributes from my
            <strong>{{ context | titlecase }}</strong> context for the purpose:
            <strong>"{{ purpose.trim() || 'not specified' }}"</strong>.
            <br />
            <small class="muted">This consent is recorded on-chain and can be revoked at any time.</small>
          </mat-checkbox>

          <div class="actions">
            <button
              mat-raised-button
              color="primary"
              (click)="grantConsent()"
              [disabled]="!explicitConsent || !purpose.trim() || loading || selectedAttributes.length === 0">
              <mat-icon *ngIf="!loading">task_alt</mat-icon>
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span>{{ loading ? 'Recording...' : 'Grant Consent' }}</span>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Active Consents Display -->
<mat-card
  class="card elevated"
  appearance="outlined"
  *ngIf="activeConsents && activeConsents.length > 0">

  <mat-card-header>
    <mat-icon class="header-icon" color="primary" mat-card-avatar>gavel</mat-icon>
    <mat-card-title>Active Consents</mat-card-title>
  </mat-card-header>

  <mat-card-content>
    <div
      class="consent-entry"
      *ngFor="let consent of activeConsents">

      <p>
        <strong>Purpose:</strong>
        {{ consent.purpose }}
      </p>

      <p>
        <strong>Consent ID:</strong>
        <code>{{ consent.claimId }}</code>
      </p>

      <p class="small muted">
        Issued on:
        {{ consent.grantedAt | date:'medium' }}
      </p>

      <button
        mat-raised-button
        color="warn"
        (click)="revokeConsent(consent)"
        [disabled]="loading">
        <mat-icon>delete_forever</mat-icon>
        Revoke Consent
      </button>

      <mat-divider class="my-2"></mat-divider>
    </div>
  </mat-card-content>
</mat-card>


      <!-- Empty States -->
      <mat-card class="card elevated empty-state" *ngIf="context && !loadingAttributes && attributes.length === 0">
        <mat-icon class="empty-icon">inbox</mat-icon>
        <h3>No attributes available</h3>
        <p class="muted">
          No credentials have been issued for the <strong>{{ context | titlecase }}</strong> context yet.
          Go to <a routerLink="/credentials">Credentials</a> to issue one.
        </p>
      </mat-card>
    </ng-container>

    <!-- Debug Output (remove in production) -->
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

  contexts: string[] = [];
  attributes: string[] = [];

  context = '';
  selectedAttributes: string[] = [];
  purpose = '';
  explicitConsent = false;

  // ✅ ARRAY (matches template)
  activeConsents: {
    claimId: string;
    purpose: string;
    grantedAt: string;
  }[] = [];

  result: any = null;

  constructor(
    public wallet: WalletService,
    private contextService: ContextService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.wallet.address$.subscribe(addr => {
      this.walletAddress = addr;
      if (!addr) this.resetForm();
    });

    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts = ctxs.sort();
    });
  }

  private resetForm() {
    this.context = '';
    this.selectedAttributes = [];
    this.purpose = '';
    this.explicitConsent = false;
    this.activeConsents = [];
    this.result = null;
    this.attributes = [];
  }

  async connectWallet() {
    this.connecting = true;
    try {
      await this.wallet.connect();
    } finally {
      this.connecting = false;
    }
  }

  copyAddress() {
    if (!this.wallet.address) return;
    navigator.clipboard.writeText(this.wallet.address);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  onContextChange() {
    this.selectedAttributes = [];
    this.purpose = '';
    this.explicitConsent = false;
    this.activeConsents = [];
    this.result = null;

    if (!this.context || !this.wallet.address) {
      this.attributes = [];
      return;
    }

    this.loadAttributesForContext();
  }

  private loadAttributesForContext() {
    this.loadingAttributes = true;
    this.attributes = [];

    this.api.getProfileByContext(this.wallet.address!, this.context).subscribe({
      next: (res: any) => {
        this.attributes = Object.keys(res.attributes || {});
        this.loadingAttributes = false;
      },
      error: () => {
        this.attributes = [];
        this.loadingAttributes = false;
      }
    });
  }

  toggleAttribute(attr: string) {
    this.selectedAttributes.includes(attr)
      ? (this.selectedAttributes = this.selectedAttributes.filter(a => a !== attr))
      : this.selectedAttributes.push(attr);

    this.explicitConsent = false;
  }

  async grantConsent() {
  // 🚫 Prevent double-click / double-submit
  if (this.loading) return;
  this.loading = true;

  try {
    if (
      !this.wallet.address ||
      !this.selectedAttributes.length ||
      !this.purpose.trim() ||
      !this.explicitConsent
    ) {
      alert('Explicit consent is required');
      return;
    }

    for (const attr of this.selectedAttributes) {
      // 🔑 REAL claimId used by verifier
      const claimId = `identity.${attr}`;

      const payload = {
        owner: this.wallet.address,
        claimId,
        purpose: this.purpose.trim(),
        grantedAt: new Date().toISOString()
      };

      const hash = await this.hashPayload(payload);
      /**
      // 1️⃣ Anchor consent on-chain (SEQUENTIAL – no overlap)
      await this.claims.setClaim({
        owner: this.wallet.address,
        claimId,
        claimHash: hash
      }).toPromise();
     */
      // 2️⃣ Persist consent in DB (verifier source of truth)
      await this.api.grantConsent({
        owner: this.wallet.address,
        claimId,
        purpose: payload.purpose
      }).toPromise();

      // 3️⃣ Update UI
      this.activeConsents.push({
        claimId,
        purpose: payload.purpose,
        grantedAt: payload.grantedAt
      });
    }

    // Reset UI
    this.selectedAttributes = [];
    this.purpose = '';
    this.explicitConsent = false;

  } catch (err) {
    console.error('❌ grantConsent failed:', err);
    alert('Failed to record consent');
  } finally {
    this.loading = false;
  }
}

  // ✅ Revoke consent (DB-only, GDPR compliant)
  revokeConsent(consent: { claimId: string }) {
    if (!this.wallet.address) return;

    this.loading = true;

    this.api.revokeConsent({
      owner: this.wallet.address,
      claimId: consent.claimId
    }).subscribe({
      next: res => {
        this.result = res;

        // Remove from UI
        this.activeConsents = this.activeConsents.filter(
          c => c.claimId !== consent.claimId
        );
      },
      error: err => {
        console.error('❌ Failed to revoke consent', err);
        alert('Failed to revoke consent');
      },
      complete: () => (this.loading = false)
    });
  }


  private async hashPayload(payload: any): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}


export default ConsentComponent;
