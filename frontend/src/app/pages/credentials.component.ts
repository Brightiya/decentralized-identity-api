import { Component, OnInit } from '@angular/core';
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
              <code class="address">{{ address }}</code>
              <button mat-icon-button (click)="copyAddress()" matTooltip="Copy address">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <p class="status success">
              <mat-icon inline>check_circle</mat-icon>
              Connected successfully
            </p>
            <p class="did-display">
              <strong>Subject DID:</strong> <code>did:ethr:{{ address }}</code>
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
  `,
  styles: [`
    .credentials-header {
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
      max-width: 800px;
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
      padding: 10px;
      border-radius: 10px;
    }

    .did-display {
      margin: 16px 0;
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      font-size: 0.95rem;
    }

    .did-display code {
      color: #1e40af;
      font-family: 'Courier New', monospace;
    }

    .context-section {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .add-context-row {
      display: flex;
      gap: 12px;
      align-items: end;
      margin-top: 8px;
    }

    .new-context-field {
      flex: 1;
    }

    .issue-actions {
      text-align: right;
      margin-top: 24px;
    }

    .issue-btn {
      padding: 12px 32px;
      font-size: 1.1rem;
    }

    .validation-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9a3412;
      font-size: 0.9rem;
      margin-top: 12px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .tabs ::ng-deep .mat-mdc-tab-body-content {
      padding: 16px 0;
    }

    .result-card pre {
      background: #1e1e1e;
      color: #9cdcfe;
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
      font-size: 0.9rem;
    }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
    }

    .empty-icon {
      font-size: 80px;
      width: 100px;
      height: 100px;
      color: #cbd5e1;
      margin-bottom: 24px;
    }

    .empty-state h3 {
      color: #475569;
      margin: 16px 0;
    }

    .muted { color: #64748b; }
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
