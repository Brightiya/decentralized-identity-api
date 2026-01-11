import { Component, inject, OnInit } from '@angular/core';
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
import { ThemeService } from '../services/theme.service';

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
  <div class="consent-container" [class.dark]="darkMode()">
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
              <code class="address">{{ wallet.address | slice:0:6 }}…{{ wallet.address | slice:-4 }}</code>
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
      <mat-card class="card elevated" appearance="outlined" *ngIf="context">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>fact_check</mat-icon>
          <mat-card-title>Attributes to Share</mat-card-title>
          <div class="badge" *ngIf="!loadingAttributes && attributes.length > 0">
            {{ selectedAttributes.length }} selected
          </div>
        </mat-card-header>

        <mat-card-content>
          <div class="loading-state" *ngIf="loadingAttributes">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading attributes...</p>
          </div>

          <!-- Attribute list with active-consent lock -->
          <div class="attributes-list" *ngIf="!loadingAttributes && attributes.length > 0">
            <div *ngFor="let attr of attributes" class="attribute-row">
              <mat-checkbox
                [checked]="selectedAttributes.includes(attr)"
                [disabled]="hasActiveConsent(attr)"
                (change)="toggleAttribute(attr)">
                {{ attr | titlecase }}
              </mat-checkbox>

              <!-- Already consented label -->
              <span class="small muted" *ngIf="hasActiveConsent(attr)">
                (Already consented)
              </span>
            </div>
          </div>

          <div class="empty-state" *ngIf="!loadingAttributes && attributes.length === 0">
            <mat-icon class="empty-icon">inbox</mat-icon>
            <h3>No attributes available</h3>
            <p class="muted">
              No credentials have been issued for the <strong>{{ context | titlecase }}</strong> context yet.
              Go to <a routerLink="/credentials">Credentials</a> to issue one.
            </p>
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
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Purpose of Disclosure</mat-label>
            <input matInput [(ngModel)]="purpose" required />
            <mat-hint>The specific purpose for which this data will be used</mat-hint>
          </mat-form-field>

          <mat-checkbox
            [checked]="explicitConsent"
            (change)="explicitConsent = $event.checked">
            <strong>I explicitly consent</strong> to sharing the selected attributes from my
            <strong>{{ context | titlecase }}</strong> context for the purpose:
            <strong>"{{ purpose.trim() || 'not specified' }}"</strong>.
          </mat-checkbox>

          <div class="actions">
            <button
              mat-raised-button
              color="primary"
              (click)="grantConsent()"
              [disabled]="!explicitConsent || !purpose.trim() || loading">
              <mat-icon *ngIf="!loading">task_alt</mat-icon>
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span>{{ loading ? 'Recording...' : 'Grant Consent' }}</span>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Active Consents – now scrollable -->
      <mat-card class="card elevated" appearance="outlined" *ngIf="context">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>gavel</mat-icon>
          <mat-card-title>Active Consents for {{ context | titlecase }}</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="loading-state" *ngIf="loadingConsents">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div class="empty-state" *ngIf="!loadingConsents && activeConsents.length === 0">
            <mat-icon class="empty-icon">assignment_turned_in</mat-icon>
            <h3>No active consents</h3>
          </div>

          <!-- Scrollable container for consents -->
          <div class="consents-scroll-container" *ngIf="!loadingConsents && activeConsents.length > 0">
            <div class="consent-entry" *ngFor="let consent of activeConsents">
              <p><strong>Purpose:</strong> {{ consent.purpose }}</p>
              <p><strong>Consent ID:</strong> <code>{{ consent.claimId }}</code></p>

              <p class="small muted">
                Issued on: {{ consent.grantedAt | date:'medium' }}
              </p>

              <p class="small"
                 *ngIf="getExpiryLabel(consent.expiresAt)"
                 [class.warn]="getExpiryLabel(consent.expiresAt) === 'Expired'">
                {{ getExpiryLabel(consent.expiresAt) }}
              </p>

              <button
                mat-raised-button
                color="warn"
                (click)="revokeConsent(consent)"
                [disabled]="loading">
                <mat-icon>delete_forever</mat-icon>
                Revoke Consent
              </button>

              <mat-divider class="my-3"></mat-divider>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </ng-container>

    <pre class="debug" *ngIf="result">{{ result | json }}</pre>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .consent-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .consent-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .consent-header {
    text-align: center;
    margin-bottom: 48px;
  }

  h1 {
    font-size: clamp(1.3rem, 4vw + 1rem, 2.8rem);
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

  .consent-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .consent-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .consent-container.dark .card:hover {
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

  .consent-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  .badge {
    margin-left: auto;
    padding: 6px 14px;
    background: var(--badge-bg, #eef2ff);
    color: #6366f1;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .consent-container.dark .badge {
    background: rgba(99,102,241,0.2);
    color: #a5b4fc;
  }

  /* Connected State */
  .address-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .address {
    flex: 1;
    background: var(--code-bg, #f1f5f9);
    padding: 12px 16px;
    border-radius: 12px;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    color: #1d4ed8;
  }

  .consent-container.dark .address {
    background: rgba(30,41,59,0.6);
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
    margin-bottom: 16px;
  }

  .consent-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  /* Attribute List */
  .attributes-list {
    display: grid;
    gap: 16px;
    margin: 20px 0;
  }

  .attribute-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: var(--row-bg, rgba(0,0,0,0.02));
  }

  .consent-container.dark .attribute-row {
    background: rgba(255,255,255,0.04);
  }

  .attribute-row .small.muted {
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Purpose & Consent */
  .actions {
    margin-top: 28px;
    text-align: right;
  }

  /* Active Consents – Scrollable Section */
  .consents-scroll-container {
    max-height: 420px;                  /* Adjust this value to taste (400–500px is good) */
    overflow-y: auto;
    padding-right: 8px;                 /* Prevent scrollbar overlap with content */
    scroll-behavior: smooth;
  }

  /* Custom scrollbar styling (modern & subtle) */
  .consents-scroll-container::-webkit-scrollbar {
    width: 8px;
  }

  .consents-scroll-container::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }

  .consents-scroll-container::-webkit-scrollbar-thumb {
    background: #9ca3af;                /* Light gray in light mode */
    border-radius: 10px;
  }

  .consent-container.dark .consents-scroll-container::-webkit-scrollbar-thumb {
    background: #6b7280;                /* Medium gray in dark mode */
  }

  .consents-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #6366f1;                /* Accent color on hover */
  }

  /* Active Consents entries */
  .consent-entry {
    padding: 20px 0;
    border-bottom: 1px solid var(--card-border, #e2e8f0);
  }

  .consent-container.dark .consent-entry {
    border-bottom-color: #2d2d44;
  }

  .consent-entry p {
    margin: 8px 0;
    font-size: 1rem;
  }

  .consent-entry code {
    background: var(--code-bg, #f1f5f9);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .consent-container.dark .consent-entry code {
    background: rgba(30,41,59,0.6);
  }

  /* Empty / Loading States */
  .empty-state {
    text-align: center;
    padding: 64px 32px;
  }

  .empty-icon {
    font-size: 80px;
    width: 100px;
    height: 100px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .empty-state h3 {
    color: var(--text-primary);
    margin: 0 0 16px;
    font-size: 1.6rem;
  }

  .empty-state p {
    max-width: 560px;
    margin: 0 auto;
    font-size: 1.05rem;
  }

  .empty-state a {
    color: #6366f1;
    text-decoration: underline;
    font-weight: 500;
  }

  .consent-container.dark .empty-state a {
    color: #a5b4fc;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: var(--text-secondary);
    min-height: 240px;
  }

  .consent-container.dark .loading-state {
    color: #cbd5e1;
  }

  /* Hints & Misc */
  .muted { color: var(--text-secondary); }
  .small { font-size: 0.9rem; }

  /* Dark mode Material form & checkbox fixes */
  .consent-container.dark {
    .mat-mdc-form-field-label,
    .mat-mdc-form-field-hint,
    .mat-mdc-select-placeholder,
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

    .mat-mdc-select-arrow,
    .mat-mdc-select-value-text {
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
    
  /* Base (desktops & large screens) */
.consent-container {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(12px, 4vw, 32px) clamp(12px, 4vw, 40px) 80px;
}

.consent-header h1 {
  font-size: clamp(1.4rem, 4vw, 2.8rem);
}

.subtitle {
  font-size: clamp(0.9rem, 1.8vw, 1.15rem);
  max-width: min(760px, 100%);
}

.card {
  margin-bottom: clamp(20px, 4vw, 32px);
  border-radius: clamp(12px, 2vw, 20px);
}

/* Make content flexible */
.address-row,
.attribute-row {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(6px, 1.5vw, 12px);
}

.address {
  flex: 1;
  min-width: 0;
  font-size: clamp(0.75rem, 1.4vw, 1rem);
  padding: clamp(8px, 1.5vw, 12px) clamp(8px, 2vw, 16px);
}

.empty-state p,
.consent-entry p {
  font-size: clamp(0.8rem, 1.5vw, 1rem);
}

.empty-icon {
  font-size: clamp(40px, 10vw, 80px);
}

/* Stepped breakpoints */
@media (max-width: 960px) {
  .consent-container {
    padding-bottom: 60px;
  }
}

/* Phones */
@media (max-width: 480px) {
  .card:hover {
    transform: none;
  }
  .actions {
    text-align: center;
  }
  .actions button {
    width: 100%;
  }
  .full-width,
  mat-form-field {
    width: 100% !important;
  }
  .consents-scroll-container {
    max-height: 300px;
  }
}

/* Very small phones (320 and below) */
@media (max-width: 320px) {
  button,
  .actions button {
    font-size: 0.8rem;
    padding: 6px 10px;
  }
  .badge {
    padding: 2px 8px;
    font-size: 0.7rem;
  }
  .consents-scroll-container {
    max-height: 240px;
  }
}



`]
})
export class ConsentComponent implements OnInit {
  walletAddress: string | null = null;
  connecting = false;
  loading = false;
  loadingAttributes = false;
  loadingConsents = false;
  copied = false;

  contexts: string[] = [];
  attributes: string[] = [];

  context = '';
  selectedAttributes: string[] = [];
  purpose = '';
  explicitConsent = false;

  activeConsents: {
    claimId: string;
    purpose: string;
    grantedAt: string;
    expiresAt?: string | null;
  }[] = [];

  result: any = null;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

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
    this.result = null;

    if (!this.context || !this.wallet.address) {
      this.attributes = [];
      this.activeConsents = [];
      return;
    }

    // Reset loading states
    this.loadingAttributes = true;
    this.loadingConsents = true;
    // Trigger both loads in parallel — no filtering needed
    this.loadAttributesForContext();
    this.loadActiveConsents();
  }

  private loadAttributesForContext() {
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

  private loadActiveConsents() {

    this.api.getActiveConsents(this.wallet.address!, this.context).subscribe({
      next: (consents: any[]) => {
        this.activeConsents = consents.map(c => ({
          claimId: c.claimId,
          purpose: c.purpose,
          grantedAt: c.grantedAt,
          expiresAt: c.expiresAt ?? null
        }));
         
        this.loadingConsents = false;
        // NEW: Filter only AFTER both API calls have finished
       // this.filterConsentsByAttributes();
      },
      error: (err) => {
        console.error('Failed to load active consents', err);
        this.activeConsents = [];
        this.loadingConsents = false;
      
      }
    });
  }



  /** ✅ NEW: check if attribute already has an active consent */
  hasActiveConsent(claimId: string): boolean {
    return this.activeConsents.some(c =>
      c.claimId === claimId &&
      this.getExpiryLabel(c.expiresAt) !== 'Expired'
    );
  }

  toggleAttribute(attr: string) {
    // ⛔ Prevent selecting already-consented attribute
    if (this.hasActiveConsent(attr)) {
      return;
    }

    if (this.selectedAttributes.includes(attr)) {
      this.selectedAttributes = this.selectedAttributes.filter(a => a !== attr);
    } else {
      this.selectedAttributes.push(attr);
    }
    this.explicitConsent = false;
  }

  async grantConsent() {
    if (this.loading) return;
    this.loading = true;

    try {
      if (!this.wallet.address) {
        alert('Wallet not connected');
        return;
      }

      if (this.selectedAttributes.length === 0) {
        alert('Select at least one attribute to share');
        return;
      }

      if (!this.purpose.trim()) {
        alert('Please enter a purpose for disclosure');
        return;
      }

      if (!this.explicitConsent) {
        alert('You must explicitly consent to proceed');
        return;
      }

      for (const attr of this.selectedAttributes) {
        // ⛔ Final safety guard
        if (this.hasActiveConsent(attr)) {
          alert(`Consent already exists for "${attr}"`);
          continue;
        }

        const claimId = attr;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // ⏳ 30 days

        await this.api.grantConsent({
          owner: this.wallet.address,
          claimId,
          purpose: this.purpose.trim(),
          context: this.context,
          expiresAt: expiresAt.toISOString()
        }).toPromise();
      }

      alert('Consent granted successfully!');

      this.selectedAttributes = [];
      this.purpose = '';
      this.explicitConsent = false;

      this.loadActiveConsents();

    } catch (err) {
      console.error('❌ grantConsent failed:', err);
      alert(
        'Failed to record consent: ' +
        ((err as any)?.message || 'Unknown error')
      );
    } finally {
      this.loading = false;
    }
  }

  revokeConsent(consent: { claimId: string }) {
    if (!this.wallet.address) return;

    this.loading = true;

    this.api.revokeConsent({
      owner: this.wallet.address,
      claimId: consent.claimId
    }).subscribe({
      next: res => {
        this.result = res;
        this.activeConsents = this.activeConsents.filter(
          c => c.claimId !== consent.claimId
        );
      },
      error: err => {
        console.error('❌ Failed to revoke consent', err);
        alert('Failed to revoke consent: ' + (err.error?.error || err.message));
      },
      complete: () => (this.loading = false)
    });
  }

  /** ✅ Expiry label helper */
  getExpiryLabel(expiresAt?: string | null): string | null {
    if (!expiresAt) return null;

    const now = new Date();
    const expiry = new Date(expiresAt);

    if (expiry <= now) return 'Expired';

    const diffMs = expiry.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
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

