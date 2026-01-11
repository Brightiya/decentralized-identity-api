import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { ContextService } from '../services/context.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatCardModule
  ],
  template: `
  <div class="credentials-container" [class.dark]="darkMode()">
    <div class="credentials-header">
      <h1>Credentials</h1>
      <p class="subtitle">
        Issue and verify context-aware verifiable credentials. Each credential is bound to a specific disclosure context.
      </p>
    </div>

    <!-- Wallet Connection -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>account_balance_wallet</mat-icon>
        <mat-card-title>Wallet Connection</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <ng-container *ngIf="address; else connectPrompt">
          <div class="connected-state">
            <div class="address-row">
              <code class="address">{{ address | slice:0:6 }}…{{ address | slice:-4 }}</code>
              <button mat-icon-button (click)="copyAddress()" matTooltip="Copy address">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <p class="status success">
              <mat-icon inline>check_circle</mat-icon>
              Connected successfully
            </p>
            <p class="did-display">
              <strong>Subject DID:</strong> 
              <code>did:ethr:{{ address }}</code>
            </p>
          </div>
        </ng-container>

        <ng-template #connectPrompt>
          <p class="muted">
            Connect your wallet to issue or verify credentials.
          </p>
          <button mat-raised-button color="primary" (click)="connect()" [disabled]="connecting">
            <mat-icon *ngIf="!connecting">wallet</mat-icon>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <!-- Main Tabs: Issue VC -->
    <mat-tab-group class="tabs" *ngIf="address" animationDuration="300ms">
      <!-- Issue Tab -->
      <mat-tab label="Issue Credential">
        <div class="tab-content">
          <mat-card class="card elevated" appearance="outlined">
            <mat-card-header>
              <mat-icon class="header-icon" mat-card-avatar>post_add</mat-icon>
              <mat-card-title>Issue New Credential</mat-card-title>
            </mat-card-header>

            <mat-card-content>
              <!-- Context Selection + Add Custom -->
              <div class="context-section">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Context</mat-label>
                  <mat-select [(ngModel)]="context" [disabled]="issuing">
                    <mat-option value="">-- Select context --</mat-option>
                    <mat-option *ngFor="let c of contexts" [value]="c">
                      {{ c | titlecase }}
                    </mat-option>
                  </mat-select>
                  <mat-icon matSuffix>arrow_drop_down</mat-icon>
                  <mat-hint>Select the disclosure context for this credential</mat-hint>
                </mat-form-field>

                <div class="add-context-row">
                  <mat-form-field appearance="outline" class="new-context-field">
                    <mat-label>Add Custom Context</mat-label>
                    <input
                      matInput
                      placeholder="e.g. health, education"
                      [(ngModel)]="newContext"
                      (keyup.enter)="addContext()"
                    />
                    <mat-hint>Lowercase, hyphens allowed</mat-hint>
                  </mat-form-field>

                  <button
                    mat-stroked-button
                    (click)="addContext()"
                    [disabled]="!newContext.trim() || issuing">
                    <mat-icon>add</mat-icon>
                    Add
                  </button>
                </div>
              </div>

              <!-- Purpose (GDPR-required) -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Purpose</mat-label>
                <input
                  matInput
                  [(ngModel)]="purpose"
                  placeholder="e.g. account verification, onboarding"
                />
                <mat-hint>Required for consent-based disclosure</mat-hint>
              </mat-form-field>

              <!-- Claim Details -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Claim ID</mat-label>
                <input matInput [(ngModel)]="claimId" placeholder="e.g. identity.email" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Claim JSON</mat-label>
                <textarea
                  matInput
                  rows="6"
                  [(ngModel)]="claim"
                  placeholder='{"email":"alice@example.com"}'
                ></textarea>
                <mat-hint>Valid JSON object containing the claim data</mat-hint>
              </mat-form-field>

              <!-- Issue Button -->
              <div class="issue-actions">
                <button
                  mat-raised-button
                  color="primary"
                  class="issue-btn"
                  (click)="issueVC()"
                  [disabled]="!isIssueValid() || issuing">
                  <mat-icon *ngIf="!issuing">verified</mat-icon>
                  <mat-spinner diameter="20" *ngIf="issuing"></mat-spinner>
                  <span>{{ issuing ? 'Issuing Credential...' : 'Issue Credential' }}</span>
                </button>
              </div>

              <div class="validation-hint" *ngIf="!isIssueValid() && context">
                <mat-icon inline color="warn">warning</mat-icon>
                Please fill in Claim ID and valid JSON
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-tab>
    </mat-tab-group>

    <!-- Result Display -->
    <mat-card class="card elevated result-card" *ngIf="result" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" [color]="isSuccessResult() ? 'primary' : 'warn'" mat-card-avatar>
          {{ isSuccessResult() ? 'task_alt' : 'error' }}
        </mat-icon>
        <mat-card-title>Result</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <pre>{{ result | json }}</pre>
      </mat-card-content>
    </mat-card>

    <!-- Empty State (no wallet) -->
    <mat-card class="card elevated empty-state" *ngIf="!address">
      <mat-icon class="empty-icon">wallet</mat-icon>
      <h3>Wallet Required</h3>
      <p class="muted">
        Connect your wallet above to issue or verify credentials.
      </p>
    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .credentials-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .credentials-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .credentials-header {
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

  .credentials-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .credentials-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .credentials-container.dark .card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
  }

  mat-card-header {
    align-items: center;
    margin-bottom: 24px;
  }

  .header-icon {
    background: var(--icon-bg, rgba(99,102,241,0.12));
    color: #6366f1;
    border-radius: 14px;
    width: 52px;
    height: 52px;
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .credentials-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  /* Wallet Connected State */
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

  .credentials-container.dark .address {
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

  .credentials-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  .did-display {
    margin-top: 12px;
    font-size: 0.98rem;
  }

  .did-display strong {
    color: var(--text-primary);
  }

  .credentials-container.dark .did-display strong {
    color: #f1f5f9;
  }

  .did-display code {
    background: var(--code-bg, #f1f5f9);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
  }

  .credentials-container.dark .did-display code {
    background: rgba(30,41,59,0.6);
  }

  /* Form Fields */
  .full-width {
    width: 100%;
    margin-bottom: 20px;
  }

  .context-section {
    margin-bottom: 28px;
  }

  .add-context-row {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    margin-top: 12px;
  }

  .new-context-field {
    flex: 1;
  }

  /* Buttons */
  .issue-btn {
    padding: 14px 40px;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    transition: all 0.25s ease;
  }

  .issue-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(99,102,241,0.4);
  }

  /* Tabs & Tab Content */
  .tab-content {
    padding: 32px 0;
  }

  .tabs ::ng-deep .mat-mdc-tab-body-content {
    padding: 0;
  }

  /* Result Card */
  .result-card pre {
    background: var(--code-bg, #1e1e1e);
    color: #9cdcfe;
    padding: 20px;
    border-radius: 14px;
    overflow-x: auto;
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0;
  }

  .credentials-container.dark .result-card pre {
    background: #0d1117;
    color: #c9d1d9;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 32px;
    border-radius: 20px;
  }

  .empty-icon {
    font-size: 96px;
    width: 120px;
    height: 120px;
    color: var(--text-secondary);
    margin-bottom: 32px;
  }

  .empty-state h3 {
    color: var(--text-primary);
    margin: 0 0 16px;
    font-size: 1.6rem;
  }

  /* Misc */
  .muted {
    color: var(--text-secondary);
  }

  .validation-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #9a3412;
    font-size: 0.95rem;
    margin-top: 16px;
  }

  .credentials-container.dark .validation-hint {
    color: #fca5a5;
  }

    /* Dark mode Material form fixes */
  .credentials-container.dark {
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
    textarea.mat-mdc-input-element {
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

    .mat-mdc-form-field-disabled .mat-mdc-form-field-label,
    .mat-mdc-form-field-disabled .mat-mdc-input-element {
      color: #6b7280 !important;
    }

    .mat-mdc-form-field-invalid .mat-mdc-form-field-label,
    .mat-mdc-form-field-invalid .mat-mdc-form-field-hint {
      color: #fca5a5 !important;
    }
  }
    /* Tablet / Small Laptop */
@media (max-width: 960px) {
  .credentials-container {
    padding: 24px 24px 64px;
  }
  h1 {
    font-size: 2.2rem;
  }
  .subtitle {
    font-size: 1.05rem;
  }
}

/* Phones */
@media (max-width: 480px) {
  /* Disable hover transforms */
  .card:hover {
    transform: none;
    box-shadow: none;
  }

  .credentials-container {
    padding: 20px 18px 56px;
  }

  h1 {
    font-size: 1.8rem;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 1rem;
    max-width: 100%;
  }

  .header-icon {
    width: 46px;
    height: 46px;
    font-size: 28px;
  }

  .address-row {
    flex-direction: column;
    align-items: stretch;
  }

  .address {
    font-size: 0.9rem;
  }

  .add-context-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .issue-btn {
    width: 100%;
    text-align: center;
    padding: 12px 24px;
    font-size: 1rem;
  }

  .result-card pre {
    font-size: 0.85rem;
    padding: 16px;
  }

  .empty-state {
    padding: 56px 20px;
  }

  .empty-icon {
    font-size: 72px;
    width: 90px;
    height: 90px;
  }
}

/* Very small phones (320px and below) */
@media (max-width: 320px) {
  h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 24px;
  }

  button,
  .issue-btn {
    font-size: 0.85rem;
    padding: 8px 14px;
  }

  .address {
    padding: 10px 12px;
    font-size: 0.82rem;
  }

  .status.success {
    padding: 10px;
    font-size: 0.9rem;
  }

  .result-card pre {
    font-size: 0.75rem;
    padding: 12px;
  }

  .empty-icon {
    font-size: 60px;
    width: 72px;
    height: 72px;
  }
}

`]
})

export class CredentialsComponent implements OnInit {
  // Wallet
  address: string | null = null;
  subject = '';
  connecting = false;
  copied = false;

  // Context
  contexts: string[] = [];
  context = '';
  newContext = '';
  expiresAt?: string;

  // Claim issuance (single-claim VC by design)
  claimId = 'identity.email';
  claim = '{\n  "email": "alice@example.com"\n}';

  // 🔐 Purpose is now mandatory for consent-aware issuance
  purpose = '';

  // UI state
  issuing = false;
  result: any | null = null;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  constructor(
    private wallet: WalletService,
    private api: ApiService,
    private contextService: ContextService
  ) {}

  // --------------------
  // Lifecycle
  // --------------------
  ngOnInit() {
    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts = ctxs.sort();
    });

    this.wallet.address$.subscribe(addr => {
      this.address = addr;
      this.subject = addr ? `did:ethr:${addr}` : '';
    });
  }

  // --------------------
  // Wallet
  // --------------------
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

  copyAddress() {
    if (!this.address) return;
    navigator.clipboard.writeText(this.address);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  // --------------------
  // Contexts
  // --------------------
  addContext() {
    const ctx = this.newContext.trim().toLowerCase();
    if (!ctx) return;

    if (!/^[a-z0-9-]+$/.test(ctx)) {
      alert('Context must contain only lowercase letters, numbers, and hyphens.');
      return;
    }

    if (this.contexts.includes(ctx)) {
      alert('Context already exists');
      return;
    }

    this.contextService.addContext(ctx);
    this.context = ctx;
    this.newContext = '';
  }

  // --------------------
  // Validation
  // --------------------
    isIssueValid(): boolean {
    // Context must be selected (not empty string)
    if (!this.context || this.context.trim().length === 0) return false;

    // Claim ID must exist
    if (!this.claimId || this.claimId.trim().length === 0) return false;

    // Purpose must exist (non-empty)
    if (!this.purpose || this.purpose.trim().length === 0) return false;

    // Claim must be valid JSON object
    try {
      const parsed = JSON.parse(this.claim);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }


  // --------------------
  // Issue VC (single claim, consent enforced server-side)
  // --------------------
  issueVC() {
  if (!this.isIssueValid()) return;

  this.issuing = true;
  this.result = null;

  let claimObj: any;
  try {
    claimObj = JSON.parse(this.claim);
  } catch {
    alert('Invalid JSON in claim');
    this.issuing = false;
    return;
  }

  this.api.issueVC({
    issuer: `did:ethr:${this.address}`,
    subject: this.subject,
    claimId: this.claimId,
    claim: claimObj,
    context: this.context,

    // ✅ purpose goes inside consent
    consent: {
      purpose: this.purpose.trim(),
      expiresAt: this.expiresAt || undefined
    }
  }).subscribe({
    next: (r) => {
      this.result = r;
      this.issuing = false;
    },
    error: (e) => {
      this.result = e.error || e;
      this.issuing = false;
    }
  });
}


  // --------------------
  // Helpers
  // --------------------
  isSuccessResult(): boolean {
    return !!(
      this.result &&
      typeof this.result.message === 'string' &&
      this.result.message.toLowerCase().includes('issued')
    );
  }
}

export default CredentialsComponent;
