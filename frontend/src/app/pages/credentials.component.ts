import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { ContextService } from '../services/context.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
import { firstValueFrom, take } from 'rxjs';

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
    MatCardModule,
    MatSnackBarModule
  ],
  template: `
    <div class="credentials-page" [class.dark]="darkMode()">
      <!-- Hero Header -->
      <div class="page-header">
        <h1>Credentials</h1>
        <p class="subtitle">
          Issue and verify context-aware verifiable credentials. Each credential is bound to a specific disclosure context.
        </p>
      </div>

      <!-- Wallet Status Card -->
      <mat-card class="wallet-card glass-card" appearance="outlined">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>shield</mat-icon>
          <mat-card-title>Your Identity</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <ng-container *ngIf="wallet.address$ | async as addr; else connectPrompt">
            <div class="connected-state">
              <div class="address-row">
                <code class="address">{{ addr | slice:0:6 }}…{{ addr | slice:-4 }}</code>
                <button mat-icon-button (click)="copyAddress(addr)" matTooltip="Copy address">
                  <mat-icon>{{ copied() ? 'check_circle' : 'content_copy' }}</mat-icon>
                </button>
              </div>
              <div class="status-pill success">
                <mat-icon>check_circle</mat-icon>
                Connected successfully
              </div>
              <div class="did-display">
                <strong>Subject DID:</strong>
                <code>did:ethr:{{ addr }}</code>
              </div>
            </div>
          </ng-container>

          <ng-template #connectPrompt>
            <div class="connect-prompt">
              <mat-icon class="prompt-icon">wallet</mat-icon>
              <h3>Wallet Required</h3>
              <p class="muted">
                Connect your wallet to issue or verify credentials.
              </p>
              <button mat-raised-button color="primary" (click)="connect()" [disabled]="connecting()">
                <mat-icon *ngIf="!connecting()">wallet</mat-icon>
                <mat-spinner *ngIf="connecting()" diameter="20"></mat-spinner>
                {{ connecting() ? 'Connecting...' : 'Connect Wallet' }}
              </button>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Main Tabs: Issue VC -->
      <mat-tab-group class="tabs glass-tabs" *ngIf="wallet.address$ | async" animationDuration="300ms">
        <mat-tab label="Issue Credential">
          <div class="tab-content">
            <mat-card class="card glass-card elevated" appearance="outlined">
              <mat-card-header>
                <mat-icon class="header-icon" mat-card-avatar>post_add</mat-icon>
                <mat-card-title>Issue New Credential</mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <!-- Context Selection + Add Custom -->
                <div class="context-section">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Context *</mat-label>
                    <mat-select [(ngModel)]="context" [disabled]="issuing()">
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
                      [disabled]="!newContext.trim() || issuing()">
                      <mat-icon>add</mat-icon>
                      Add
                    </button>
                  </div>
                </div>

                <!-- Purpose (mandatory) -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Purpose *</mat-label>
                  <input
                    matInput
                    [(ngModel)]="purpose"
                    placeholder="e.g. account verification, onboarding"
                    required
                  />
                  <mat-hint>Required for consent-based disclosure</mat-hint>
                </mat-form-field>

                <!-- Claim ID (now mandatory) -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Claim ID *</mat-label>
                  <input
                    matInput
                    [(ngModel)]="claimId"
                    placeholder="e.g. identity.email, profile.name, health.bloodtype"
                    required
                  />
                  <mat-hint>Unique identifier for this claim (dot notation recommended)</mat-hint>
                </mat-form-field>

                <!-- Claim JSON (prefilled + auto-format) -->
                <mat-form-field appearance="outline" class="full-width"
                                [class.mat-form-field-invalid]="claim && !isValidJson()">
                  <mat-label>Claim Data (JSON) *</mat-label>
                  <textarea
                    matInput
                    rows="8"
                    [(ngModel)]="claim"
                    (blur)="formatJson()"
                    (input)="onClaimInput()"
                    placeholder="Enter claim data as JSON..."
                    required
                  ></textarea>

                  <mat-hint *ngIf="claim && isValidJson()" class="valid-hint">
                    <mat-icon>check_circle</mat-icon> Valid JSON
                  </mat-hint>

                  <mat-error *ngIf="claim && !isValidJson()">
                    Invalid JSON — please fix quotes, commas, or braces
                  </mat-error>
                </mat-form-field>

                <!-- Issue Button -->
                <div class="issue-actions">
                  <button
                    mat-raised-button
                    color="primary"
                    class="issue-btn"
                    (click)="issueVC()"
                    [disabled]="!isIssueValid() || issuing()">
                    <mat-icon *ngIf="!issuing()">verified</mat-icon>
                    <mat-spinner diameter="20" *ngIf="issuing()"></mat-spinner>
                    <span>{{ issuing() ? 'Signing & Issuing...' : 'Issue Credential' }}</span>
                  </button>
                </div>

                <div class="validation-hint" *ngIf="!isIssueValid() && (context || purpose || claimId || claim)">
                  <mat-icon inline color="warn">warning</mat-icon>
                  Please fill in all required fields with valid values
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Result Display -->
      <mat-card class="card glass-card result-card" *ngIf="result" appearance="outlined">
        <mat-card-header>
          <mat-icon class="header-icon" [color]="isSuccessResult() ? 'primary' : 'warn'" mat-card-avatar>
            {{ isSuccessResult() ? 'task_alt' : 'error' }}
          </mat-icon>
          <mat-card-title>Result</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <pre class="result-pre">{{ result | json }}</pre>
        </mat-card-content>
      </mat-card>

      <!-- Empty State (no wallet) -->
      <mat-card class="card glass-card empty-state" *ngIf="!(wallet.address$ | async)">
        <mat-icon class="empty-icon">wallet</mat-icon>
        <h3>Wallet Required</h3>
        <p class="muted">
          Connect your wallet above to issue or verify credentials.
        </p>
      </mat-card>
    </div>
  `,

  styles: [`
    :host { display: block; min-height: 100vh; }

    .credentials-page {
      padding: clamp(32px, 5vw, 64px) clamp(24px, 6vw, 80px);
      max-width: 1000px;
      margin: 0 auto;
      transition: background 0.6s ease;
    }

    .credentials-page.dark {
      background: linear-gradient(to bottom, #0b0e17, #000000);
      color: #e2e8f0;
    }

    /* Header */
    .page-header {
      text-align: center;
      margin-bottom: clamp(40px, 7vw, 80px);
    }

    .page-header h1 {
      font-size: clamp(2.5rem, 6vw, 4.2rem);
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 12px;
      letter-spacing: -1px;
    }

    .subtitle {
      font-size: clamp(1rem, 2.5vw, 1.25rem);
      color: #94a3b8;
      max-width: 760px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Glass Cards */
    .glass-card {
      background: rgba(255,255,255,0.82);
      backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      overflow: hidden;
      transition: all 0.4s ease;
    }

    .credentials-page.dark .glass-card {
      background: rgba(20,25,35,0.72);
      border-color: rgba(100,116,139,0.35);
      box-shadow: 0 25px 70px rgba(0,0,0,0.55);
    }

    /* Wallet Card */
    .wallet-card {
      margin-bottom: 40px;
    }

    .header-icon {
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      color: white;
      border-radius: 16px;
    }

    .connected-state {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 0;
    }

    .address-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(226,232,240,0.45);
      border-radius: 16px;
    }

    .credentials-page.dark .address-row {
      background: rgba(30,41,59,0.6);
    }

    .address {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      color: #1d4ed8;
      font-size: 1.05rem;
    }

    .credentials-page.dark .address {
      color: #c7d2fe;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 500;
    }

    .status-pill.success {
      background: rgba(34,197,94,0.18);
      color: #166534;
    }

    .credentials-page.dark .status-pill.success {
      background: rgba(34,197,94,0.28);
      color: #86efac;
    }

    .did-display {
      font-size: 0.98rem;
      color: #64748b;
    }

    .credentials-page.dark .did-display {
      color: #94a3b8;
    }

    .connect-prompt {
      text-align: center;
      padding: 64px 32px;
      color: #94a3b8;
    }

    .prompt-icon {
      font-size: 80px;
      height: 80px;
      width: 80px;
      margin-bottom: 24px;
      opacity: 0.7;
    }

    /* Form Section */
    .context-section {
      margin-bottom: 32px;
    }

    .add-context-row {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .new-context-field {
      flex: 1;
      min-width: 240px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 24px;
    }

    /* Add slight visual feedback for invalid JSON field */
    .mat-form-field-invalid .mat-mdc-text-field-wrapper {
      border-color: #f44336 !important;
    }

    mat-error {
      font-size: 0.9rem;
      margin-top: 4px;
    }

    /* Issue Button */
    .issue-actions {
      text-align: center;
      margin-top: 32px;
    }

    .issue-btn {
      padding: 14px 48px;
      font-size: 1.1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
      transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(99,102,241,0.35);
    }

    .issue-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(99,102,241,0.45);
    }

    .issue-btn:disabled {
      opacity: 0.6;
      transform: none;
      box-shadow: none;
    }

    /* Result Card */
    .result-card pre.result-pre {
      background: rgba(30,41,59,0.9);
      color: #c9d1d9;
      padding: 24px;
      border-radius: 16px;
      overflow-x: auto;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
    }

    .credentials-page:not(.dark) .result-card pre.result-pre {
      background: #1e1e1e;
      color: #9cdcfe;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 32px;
    }

    .empty-icon {
      font-size: 96px;
      height: 96px;
      width: 96px;
      color: #94a3b8;
      margin-bottom: 32px;
    }

    .empty-state h3 {
      color: #1e293b;
      margin: 0 0 16px;
      font-size: 2rem;
    }

    .credentials-page.dark .empty-state h3 {
      color: #f1f5f9;
    }

    /* Validation Hint */
    .validation-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f59e0b;
      font-size: 0.95rem;
      margin-top: 16px;
    }

    .credentials-page.dark .validation-hint {
      color: #fcd34d;
    }

    /* ─────────────────────────────────────────────
       Dark Mode Material Form Fixes (FULLY RESTORED)
    ────────────────────────────────────────────── */
    .credentials-page.dark {
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

    /* ─────────────────────────────────────────────
       Responsive Media Queries (FULLY RESTORED + refined)
    ────────────────────────────────────────────── */

    /* Tablet / Small Laptop */
    @media (max-width: 960px) {
      .credentials-page {
        padding: 32px 32px 80px;
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

      .credentials-page {
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

      .result-card pre.result-pre {
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

      .result-card pre.result-pre {
        font-size: 0.75rem;
        padding: 12px;
      }

      .empty-icon {
        font-size: 60px;
        width: 72px;
        height: 72px;
      }
    }

        .valid-hint {
      color: #4caf50 !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .valid-hint mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    mat-hint em {
      color: #6366f1;
    }
  `]
})

export class CredentialsComponent implements OnInit {
  public wallet = inject(WalletService);
  private api = inject(ApiService);
  private contextService = inject(ContextService);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);

  darkMode = this.themeService.darkMode;

  // Wallet
  copied = signal(false);
  connecting = signal(false);

  // Context
  contexts: string[] = [];
  context = '';
  newContext = '';
  expiresAt?: string;

 // Claim issuance – all mandatory, no defaults
  claimId = '';
  claim = '';
  purpose = '';

  // UI state
  issuing = signal(false);
  result: any | null = null;

  // Default claim template (prefilled when field is empty)
private defaultClaimTemplate = `{
  "name": "Your Name",
  "email": "you@example.com",
  "role": "Developer",
  "verified": true
}`;

  ngOnInit() {
    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts = ctxs.sort();
    });

    // Prefill only if claim is empty (first time)
  if (!this.claim) {
    this.claim = this.defaultClaimTemplate;
  }
  }

  // --------------------
  // Wallet
  // --------------------
  async connect() {
    this.connecting.set(true);

    try {
      await this.wallet.connect();
    } catch (e: any) {
      this.snackBar.open(e.message || 'Wallet connection failed', 'Close', { duration: 5000 });
    } finally {
      this.connecting.set(false);
    }
  }

  copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  // --------------------
  // Contexts
  // --------------------
  addContext() {
    const ctx = this.newContext.trim().toLowerCase();
    if (!ctx) return;

    if (!/^[a-z0-9-]+$/.test(ctx)) {
      this.snackBar.open('Context must contain only lowercase letters, numbers, and hyphens.', 'Close', { duration: 5000 });
      return;
    }

    if (this.contexts.includes(ctx)) {
      this.snackBar.open('Context already exists', 'Close', { duration: 3000 });
      return;
    }

    this.contextService.addContext(ctx);
    this.context = ctx;
    this.newContext = '';
    this.snackBar.open(`Custom context "${ctx}" added`, 'Close', { duration: 5000 });
  }

  // --------------------
  // Validation Helpers
  // --------------------
  // Auto-format JSON on blur (fix spacing, smart quotes, etc.)
    formatJson() {
      if (!this.claim?.trim()) return;

      let cleaned = this.claim.trim();

      // Fix smart quotes
      cleaned = cleaned.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

      // Remove trailing commas
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

      try {
        const parsed = JSON.parse(cleaned);
        // Pretty print with 2-space indentation
        this.claim = JSON.stringify(parsed, null, 2);
      } catch {
        // If still invalid, leave as-is (user is typing)
      }
    }

    // Optional: live validation feedback while typing
    onClaimInput() {
      // You can add live formatting or hints here if desired
      // For now, we just format on blur to avoid annoying the user
    }

    // Keep your existing isValidJson() — it's perfect now
    isValidJson(): boolean {
      if (!this.claim?.trim()) return false;

      try {
        const parsed = JSON.parse(this.claim);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false;
        return Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    }

  isIssueValid(): boolean {
    if (!this.context?.trim()) return false;
    if (!this.purpose?.trim()) return false;
    if (!this.claimId?.trim()) return false;
    return this.isValidJson();
  }

  // --------------------------
// Issue VC - with full hybrid signing support
// --------------------------
async issueVC() {
    if (!this.isIssueValid()) {
      if (this.claim?.trim() && !this.isValidJson()) {
        this.snackBar.open(
          'Claim JSON must contain at least one meaningful key-value pair (empty keys/values not allowed)',
          'Close',
          { duration: 7000 }
        );
      } else {
        this.snackBar.open(
          'Please fill in Context, Purpose, Claim ID, and valid non-empty JSON claim data',
          'Close',
          { duration: 6000 }
        );
      }
      return;
    }

  const addr = this.wallet.address;
  if (!addr) {
    this.snackBar.open('Wallet not connected', 'Close', { duration: 4000 });
    return;
  }

  this.issuing.set(true);
  this.result = null;

  try {
    let claimObj: any;
    try {
      claimObj = JSON.parse(this.claim);
    } catch {
      throw new Error('Invalid JSON in claim field');
    }

    const payload = {
      issuer: `did:ethr:${addr}`,
      subject: `did:ethr:${addr}`, // self-issue for now
      claimId: this.claimId,
      claim: claimObj,
      context: this.context,
      consent: {
        purpose: this.purpose.trim(),
        expiresAt: this.expiresAt || undefined,
      },
    };

    const response = await firstValueFrom(this.api.issueVC(payload));

    // ── Backend-signed (dev) mode ────────────────────────────────
    if (!response.unsignedTx && response.txHash) {
      this.snackBar.open(`Success! Credential anchored on-chain (2 txs confirmed)`, 'Close', {
        duration: 9000,
        panelClass: ['success-snackbar'],
      });
      this.result = response;
      return;
    }

    // ── Hybrid mode: Frontend must sign ──────────────────────────
    if (!response.unsignedTx) {
      throw new Error('Unexpected server response - missing unsignedTx in hybrid mode');
    }

    // 1. Main credential issuance transaction
    this.snackBar.open(
      'Please sign the credential issuance transaction in your wallet...',
      'Close',
      { duration: 15000 }
    );

    let mainTxHash: string;

    try {
      const { hash } = await this.wallet.signAndSendTransaction(response.unsignedTx);
      mainTxHash = hash;
    } catch (signError: any) {
      console.error('Main tx signing failed:', signError);

      const msg =
        signError.code === 4001
          ? 'Transaction was rejected by user'
          : signError.shortMessage || signError.message || 'Failed to sign/send transaction';

      this.snackBar.open(msg, 'Close', {
        duration: 8000,
        panelClass: ['error-snackbar'],
      });
      return; // Stop here — credential not issued
    }

    // Wait for confirmation — strongly recommended when doing multiple txs
    this.snackBar.open('Waiting for on-chain confirmation...', 'Close', {
      duration: 12000,
    });

    try {
      const receipt = await this.wallet.provider!.waitForTransaction(mainTxHash, 1, 90000); // 90s timeout

      if (!receipt) {
        throw new Error('No receipt received after waiting');
      }

      console.log(`Main tx confirmed in block ${receipt.blockNumber}`);
    } catch (waitErr: any) {
      console.warn('Confirmation wait failed (timeout or dropped?):', waitErr);
      // We still proceed — second tx might work (especially with fresh nonce)
    }

    // 2. Optional profile CID update
    let profileTxHash: string | undefined;

    if (response.profileUnsignedTx) {
      this.snackBar.open(
        'Please sign the profile update transaction...',
        'Close',
        { duration: 12000 }
      );

      try {
        const { hash } = await this.wallet.signAndSendTransaction(response.profileUnsignedTx);
        profileTxHash = hash;

        this.snackBar.open(
          `Profile updated successfully! Tx: ${profileTxHash.slice(0, 10)}...`,
          'Close',
          { duration: 6000, panelClass: ['success-snackbar'] }
        );
      } catch (profileErr: any) {
        console.warn('Profile tx failed/rejected:', profileErr);

        const msg =
          profileErr.code === 4001
            ? 'Profile update was rejected (skipped)'
            : 'Profile update failed — credential still issued';

        this.snackBar.open(msg, 'Close', {
          duration: 7000,
          panelClass: ['warn-snackbar'],
        });
        // We don't fail the whole flow — main credential is already anchored
      }
    }

    // ── Final success ───────────────────────────────────────────────
    this.snackBar.open(`Credential successfully issued & anchored! Tx: ${mainTxHash.slice(0, 10)}...`, 'Close', {
        duration: 7000,
        panelClass: ['success-snackbar'],
      });

      this.resetFormAfterSuccess();
    // Auto-add the context to the dropdown if it's new
    if (this.context && !this.contextService.contexts.includes(this.context)) {
      this.contextService.addContext(this.context);
      this.snackBar.open(
        `New context "${this.context}" added to your list`,
        'Close',
        { duration: 5000, panelClass: ['info-snackbar'] }
      );
    }

    this.result = {
      ...response,
      txHash: mainTxHash,
      profileTxHash,
    };
  } catch (err: any) {
    console.error('Issue VC failed:', err);

    let displayMessage = 'Failed to issue credential';

    if (err.code === 4001) {
      displayMessage = 'Transaction was rejected by user';
    } else if (err.code === -32603) {
      displayMessage = 'Internal JSON-RPC error — check gas/network';
    } else if (err.message?.includes('nonce')) {
      displayMessage = 'Nonce error — try again or reset MetaMask account';
    } else if (err.message?.includes('insufficient funds')) {
      displayMessage = 'Insufficient funds for gas';
    }

    this.snackBar.open(displayMessage, 'Close', {
      duration: 9000,
      panelClass: ['error-snackbar'],
    });

    this.result = { error: err.shortMessage || err.message || 'Unknown error' };
  } finally {
    this.issuing.set(false);
  }
}

private resetFormAfterSuccess() {
    this.claimId = '';
    this.claim = '';
    this.purpose = '';
    // Optionally keep context selected or reset it too
    this.context = '';
  }

  // --------------------
  // Helpers
  // --------------------
  isSuccessResult(): boolean {
    return !!(
      this.result &&
      (this.result.message?.toLowerCase().includes('issued') ||
       this.result.txHash)
    );
  }
}
