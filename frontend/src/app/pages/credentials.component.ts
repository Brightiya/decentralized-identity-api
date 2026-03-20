import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { ContextService } from '../services/context.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MetaTxService } from '../services/metaTx.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import ForwarderArtifact from '../abi/Forwarder.json';
import IdentityRegistryArtifact from '../abi/IdentityRegistry.json';
import { ethers } from 'ethers';
declare global {
  interface Window {
    ethereum?: any;
  }
}
const ForwarderAbi = ForwarderArtifact.abi;
const IdentityRegistryAbi = IdentityRegistryArtifact.abi;


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
import { BrowserProvider } from 'ethers';

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

                <!-- Claim ID (Mandatory) -->
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

                <div class="claim-warning">
                  <mat-icon color="warn">privacy_tip</mat-icon>
                  <span>
                    You control what gets disclosed later. Only include fields you are comfortable sharing (selective disclosure enabled).
                  </span>
                </div>

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
                    placeholder='⚠️ Only include attributes you are willing to share.
                    Example:
                    {
                      "name": "Alice",
                      "email": "alice@example.com"
                    }'
                    required
                  ></textarea>

                  <mat-hint *ngIf="claim && isValidJson()" class="valid-hint">
                    <mat-icon>check_circle</mat-icon> Valid JSON
                  </mat-hint>

                  <mat-error *ngIf="claim && !isValidJson()">
                    Invalid JSON — please fix quotes, commas, or braces
                  </mat-error>
                </mat-form-field>

                <div *ngIf="isValidJson()" class="keys-preview">
                <strong>Attributes that can be disclosed:</strong>
                <span *ngFor="let key of getClaimKeys()">{{ key }}</span>
              </div>

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

    .claim-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(251, 191, 36, 0.15);
    padding: 10px 14px;
    border-radius: 12px;
    margin-bottom: 12px;
    font-size: 0.9rem;
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

    /* Attribute Preview (Selective Disclosure Hint) */
    .keys-preview {
      margin-top: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.18);

      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;

      font-size: 0.9rem;
      color: #4f46e5;
    }

    /* Label */
    .keys-preview strong {
      font-weight: 600;
      margin-right: 6px;
      color: #4338ca;
    }

    /* Individual attribute chips */
    .keys-preview span {
      background: rgba(99, 102, 241, 0.15);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
      color: #3730a3;

      transition: all 0.2s ease;
    }

    /* Hover effect */
    .keys-preview span:hover {
      background: rgba(99, 102, 241, 0.25);
      transform: translateY(-1px);
    }

    /* Dark mode support */
    .credentials-page.dark .keys-preview {
      background: rgba(129, 140, 248, 0.12);
      border: 1px solid rgba(129, 140, 248, 0.25);
      color: #c7d2fe;
    }

    .credentials-page.dark .keys-preview strong {
      color: #a5b4fc;
    }

    .credentials-page.dark .keys-preview span {
      background: rgba(129, 140, 248, 0.2);
      color: #e0e7ff;
    }

    .credentials-page.dark .keys-preview span:hover {
      background: rgba(129, 140, 248, 0.35);
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

// Angular component responsible for issuing Verifiable Credentials (VCs)
// and anchoring them on-chain (preferably gasless via meta-transactions).
export class CredentialsComponent implements OnInit {

  // --------------------
  // Dependency Injection
  // --------------------

  // Wallet abstraction service (handles connect, sign, send tx)
  public wallet = inject(WalletService);

  // API service for backend communication (profiles, VC issuance, etc.)
  private api = inject(ApiService);

  // Context management service (tracks allowed VC contexts)
  private contextService = inject(ContextService);

  // Angular Material snackbar for UI notifications
  private snackBar = inject(MatSnackBar);

  // Theme manager (light/dark mode)
  private themeService = inject(ThemeService);

  // Meta-transaction builder/signing service
  // Used to construct gasless transactions for the relayer
  private metaTx = inject(MetaTxService);

  // Angular HTTP client used for relayer calls
  private http = inject(HttpClient);


  // Bind dark mode state from theme service
  darkMode = this.themeService.darkMode;

  // --------------------
  // Wallet UI State
  // --------------------

  // Tracks when the wallet address has been copied
  copied = signal(false);

  // Shows loading state during wallet connection
  connecting = signal(false);

  // --------------------
  // Context State
  // --------------------

  // List of available contexts
  contexts: string[] = [];

  // Selected context
  context = '';

  // Input field for creating a new context
  newContext = '';

  // Optional expiration for consent
  expiresAt?: string;

  // --------------------
  // Claim Issuance Fields
  // --------------------

  // Unique identifier for the claim
  claimId = '';

  // JSON string representing credential data
  claim = '';

  // Purpose of the credential (for consent and auditing)
  purpose = '';

  // --------------------
  // UI State
  // --------------------

  // Tracks whether issuance is currently in progress
  issuing = signal(false);

  // Stores the result of issuance (success or error)
  result: any | null = null;

  // --------------------
  // Default Claim Template
  // --------------------

  // Prefilled JSON example shown to users when the claim field is empty
  private defaultClaimTemplate = `{
  "name": "Your Name",
  "email": "you@example.com",
  "role": "Developer",
  "verified": true
}`;

// Gets the keys of the claim JSON for display or validation purposes
  getClaimKeys(): string[] {
    try {
      return Object.keys(JSON.parse(this.claim));
    } catch {
      return [];
    }
  }
  // --------------------
  // Lifecycle
  // --------------------

  ngOnInit() {

    // Subscribe to context list updates from ContextService
    this.contextService.contexts$.subscribe(ctxs => {
      // Keep contexts sorted for better UX
      this.contexts = ctxs.sort();
    });

    // If user has not typed anything yet,
    // prefill the claim field with a template
    if (!this.claim) {
      this.claim = this.defaultClaimTemplate;
    }
  }

  // --------------------
  // Wallet
  // --------------------

  // Connect user's wallet (MetaMask, etc.)
  async connect() {

    this.connecting.set(true);

    try {

      // Calls WalletService which handles wallet connection
      await this.wallet.connect();

    } catch (e: any) {

      // Display error if connection fails
      this.snackBar.open(
        e.message || 'Wallet connection failed',
        'Close',
        { duration: 5000 }
      );

    } finally {

      this.connecting.set(false);

    }
  }

  // Copy wallet address to clipboard
  copyAddress(addr: string) {

    navigator.clipboard.writeText(addr);

    this.copied.set(true);

    // Reset copy indicator after 2 seconds
    setTimeout(() => this.copied.set(false), 2000);
  }

  // --------------------
  // Contexts
  // --------------------

  // Add a custom context to the list
  addContext() {

    const ctx = this.newContext.trim().toLowerCase();

    if (!ctx) return;

    // Validate format (lowercase letters, numbers, hyphens only)
    if (!/^[a-z0-9-]+$/.test(ctx)) {
      this.snackBar.open(
        'Context must contain only lowercase letters, numbers, and hyphens.',
        'Close',
        { duration: 5000 }
      );
      return;
    }

    // Prevent duplicate contexts
    if (this.contexts.includes(ctx)) {
      this.snackBar.open(
        'Context already exists',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    // Add new context to service
    this.contextService.addContext(ctx);

    // Select it automatically
    this.context = ctx;

    this.newContext = '';

    this.snackBar.open(
      `Custom context "${ctx}" added`,
      'Close',
      { duration: 5000 }
    );
  }

  // --------------------
  // Validation Helpers
  // --------------------

  // Auto-format JSON when user leaves the field
  // Fixes spacing, smart quotes, trailing commas
  formatJson() {

    if (!this.claim?.trim()) return;

    let cleaned = this.claim.trim();

    // Replace smart quotes with standard quotes
    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');

    // Remove trailing commas
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    try {

      const parsed = JSON.parse(cleaned);

      // Pretty print JSON
      this.claim = JSON.stringify(parsed, null, 2);

    } catch {

      // Ignore errors while user is typing

    }
  }

  // Triggered on input changes
  onClaimInput() {
    // Reserved for future live validation
  }

  // Validate claim JSON structure
  isValidJson(): boolean {

    if (!this.claim?.trim()) return false;

    try {

      const parsed = JSON.parse(this.claim);

      // Must be an object and not empty
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) return false;

      return Object.keys(parsed).length > 0;

    } catch {

      return false;

    }
  }

  // Validate the entire issuance form
  isIssueValid(): boolean {

    if (!this.context?.trim()) return false;
    if (!this.purpose?.trim()) return false;
    if (!this.claimId?.trim()) return false;

    return this.isValidJson();
  }

  // ------------------------------------------------------------
  // Issue Verifiable Credential
  // ------------------------------------------------------------
  // This is the main flow:
  //
  // 1️⃣ Validate inputs
  // 2️⃣ Fetch current profile CID
  // 3️⃣ Build and sign the VC in the browser
  // 4️⃣ Send VC to backend
  // 5️⃣ Anchor claim hash on-chain (gasless if possible)
  // ------------------------------------------------------------
  async issueVC() {

    // Validate input fields
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

    // Ensure wallet is connected
    const addr = this.wallet.address;

    if (!addr) {

      this.snackBar.open(
        'Wallet not connected',
        'Close',
        { duration: 4000 }
      );

      return;
    }

    let currentProfileCid: string | null = null;

    try {

      // Fetch the user's current profile
      const profileRes = await firstValueFrom(
        this.api.getProfile(addr, this.context)
      );

      // Backend should return the CID of the profile
      currentProfileCid = profileRes.cid || null;

    } catch (e) {

      console.warn(
        "Could not pre-fetch current CID — backend will fallback",
        e
      );

    }

    this.issuing.set(true);
    this.result = null;

    try {

      // Parse claim JSON
      let claimObj: any;

      try {

        claimObj = JSON.parse(this.claim);

      } catch {

        throw new Error('Invalid JSON in claim field');

      }

      // ------------------------------------------------------------
      // Frontend VC Signing
      // ------------------------------------------------------------
      // The VC is signed with the user's wallet BEFORE sending
      // to the backend. This ensures the credential is cryptographically
      // bound to the issuer DID.
      // ------------------------------------------------------------

      let signedVc;

      try {

        if (!(window as any).ethereum) {
          throw new Error(
            'No Ethereum provider found. Please install MetaMask.'
          );
        }

        const provider = new ethers.BrowserProvider(
          (window as any).ethereum
        );

        await provider.send("eth_requestAccounts", []);

        const signer = await provider.getSigner();

        const signerAddress =
          (await signer.getAddress()).toLowerCase();

        // Deep clone claim object to avoid mutations
        const claimObjCopy =
          JSON.parse(JSON.stringify(claimObj));

        const vc = {

          "@context": [
            "https://www.w3.org/2018/credentials/v1"
          ],

          type: ["VerifiableCredential"],

          issuer: `did:ethr:${addr}`,

          issuanceDate: new Date().toISOString(),

          credentialSubject: {
            id: `did:ethr:${addr}`,
            claim: claimObjCopy
          },

          pimv: {
            context: this.context,
            claimId: this.claimId,
            purpose: this.purpose.trim(),
            consentRequired: true
          }
        };

        // Deterministic serialization before signing
        const vcString = JSON.stringify(
          vc,
          Object.keys(vc).sort()
        );

        // Sign VC content with wallet
        const signature =
          await signer.signMessage(vcString);

        // Attach proof to VC
        signedVc = {
          ...vc,
          proof: {
            type: "EcdsaSecp256k1Signature2019",
            created: new Date().toISOString(),
            proofPurpose: "assertionMethod",
            verificationMethod: `did:ethr:${addr}`,
            jws: signature
          }
        };

      } catch (signErr: any) {

        console.error(
          "Frontend VC signing failed:",
          signErr
        );

        this.snackBar.open(
          signErr.code === 4001
            ? 'VC signing rejected'
            : 'Failed to sign VC',
          'Close',
          {
            duration: 6000,
            panelClass: ['error-snackbar']
          }
        );

        this.issuing.set(false);

        return;

      }

      // ------------------------------------------------------------
      // Send VC to Backend
      // ------------------------------------------------------------
      // Backend will:
      // - store credential
      // - compute claim hash
      // - prepare blockchain anchoring
      // ------------------------------------------------------------

      const payload = {

        signedVc,

        context: this.context,

        claimId: this.claimId,

        currentProfileCid,

        consent: {
          purpose: this.purpose.trim(),
          expiresAt: this.expiresAt || undefined
        }
      };

      const response =
        await firstValueFrom(
          this.api.issueSignedVC(payload)
        );

      // Notify user gasless anchoring is starting
      this.snackBar.open(
        'Preparing gasless credential anchoring...',
        'Close',
        { duration: 6000 }
      );

      const claimIdBytes32 = response.claimIdBytes32;
      const claimHash = response.claimHash;

      if (!claimIdBytes32 || !claimHash) {
        throw new Error(
          'Backend did not return claimIdBytes32 or claimHash'
        );
      }

      // ------------------------------------------------------------
      // Gasless anchoring via Meta-Transactions
      // ------------------------------------------------------------
      // Uses ERC2771 forwarder + relayer
      // ------------------------------------------------------------

      try {

        // Build meta-transaction for setClaim
        const { request: req, signature } =
          await this.metaTx.buildAndSignMetaTx({

            forwarderAbi: ForwarderAbi,

            targetAddress:
              environment.IDENTITY_REGISTRY_META_ADDRESS,

            targetAbi: IdentityRegistryAbi,

            functionName: "setClaim",

            functionArgs: [
              addr,
              claimIdBytes32,
              claimHash
            ]
          });

        // Send to relayer backend
        const relayResponse: any =
          await firstValueFrom(
            this.http.post(
              `${environment.backendUrl}/meta/relay`,
              { request: req, signature }
            )
          );

        if (!relayResponse.txHash) {
          throw new Error("Relay failed");
        }

        // Wait until transaction is mined
        await this.waitForTx(relayResponse.txHash);

        // ------------------------------------------------------------
        // Second meta-transaction: update profile CID
        // ------------------------------------------------------------

        if (response.newProfileCid) {

          const {
            request: profileReq,
            signature: profileSig
          } =
            await this.metaTx.buildAndSignMetaTx({

              forwarderAbi: ForwarderAbi,

              targetAddress:
                environment.IDENTITY_REGISTRY_META_ADDRESS,

              targetAbi: IdentityRegistryAbi,

              functionName: "setProfileCID",

              functionArgs: [
                addr,
                response.newProfileCid
              ]
            });

          await firstValueFrom(
            this.http.post(
              `${environment.backendUrl}/meta/relay`,
              {
                request: profileReq,
                signature: profileSig
              }
            )
          );
        }

        // Success notification
        const txHash = relayResponse.txHash;

        this.snackBar.open(
          `Credential anchored GASLESSLY! Tx: ${txHash.slice(0, 10)}...`,
          'Close',
          {
            duration: 8000,
            panelClass: ['success-snackbar']
          }
        );

        this.result = {
          ...response,
          txHash,
          gasless: true
        };

        this.resetFormAfterSuccess();

        return;

      } catch (gaslessErr: any) {

        console.error(
          'Gasless credential anchoring failed:',
          gaslessErr
        );

        const fallback =
          confirm(
            'Gasless anchoring failed. Try regular transaction?'
          );

        if (!fallback) {
          throw gaslessErr;
        }
      }

      // ------------------------------------------------------------
      // Fallback: direct blockchain transaction
      // ------------------------------------------------------------

      if (!response.unsignedTx && response.txHash) {

        this.snackBar.open(
          `Success! Credential anchored on-chain`,
          'Close',
          {
            duration: 9000,
            panelClass: ['success-snackbar']
          }
        );

        this.result = response;

        return;
      }

      // Hybrid mode (frontend signs transaction)
      if (!response.unsignedTx) {
        throw new Error(
          'Unexpected server response - missing unsignedTx'
        );
      }

      // Ask user to sign main transaction
      this.snackBar.open(
        'Please sign the credential issuance transaction in your wallet...',
        'Close',
        { duration: 15000 }
      );

      let mainTxHash: string;

      try {

        const { hash } =
          await this.wallet.signAndSendTransaction(
            response.unsignedTx
          );

        mainTxHash = hash;

      } catch (signError: any) {

        console.error(
          'Main tx signing failed:',
          signError
        );

        const msg =
          signError.code === 4001
            ? 'Transaction was rejected by user'
            : signError.message ||
              'Failed to sign/send transaction';

        this.snackBar.open(msg, 'Close', {
          duration: 8000,
          panelClass: ['error-snackbar']
        });

        return;
      }

      // Wait for confirmation
      this.snackBar.open(
        'Waiting for on-chain confirmation...',
        'Close',
        { duration: 12000 }
      );

      try {

        const receipt =
          await this.wallet.provider!
            .waitForTransaction(mainTxHash, 1, 90000);

        if (!receipt) {
          throw new Error(
            'No receipt received after waiting'
          );
        }

      } catch (waitErr) {

        console.warn(
          'Confirmation wait failed:',
          waitErr
        );
      }

      // ------------------------------------------------------------
      // Final success
      // ------------------------------------------------------------

      this.snackBar.open(
        `Credential successfully issued & anchored! Tx: ${mainTxHash.slice(0, 10)}...`,
        'Close',
        {
          duration: 7000,
          panelClass: ['success-snackbar']
        }
      );

      this.resetFormAfterSuccess();

      this.result = {
        ...response,
        txHash: mainTxHash
      };

    } catch (err: any) {

      console.error('Issue VC failed:', err);

      this.snackBar.open(
        err.message || 'Failed to issue credential',
        'Close',
        {
          duration: 9000,
          panelClass: ['error-snackbar']
        }
      );

      this.result = {
        error: err.message || 'Unknown error'
      };

    } finally {

      this.issuing.set(false);

    }
  }

  // ------------------------------------------------------------
  // Wait for transaction confirmation
  // ------------------------------------------------------------
  async waitForTx(txHash: string) {

    const provider =
      new BrowserProvider((window as any).ethereum);

    await provider.waitForTransaction(txHash);
  }

  // Reset form fields after successful issuance
  private resetFormAfterSuccess() {

    this.claimId = '';
    this.claim = '';
    this.purpose = '';
    this.context = '';
  }

  // Check if result represents a successful issuance
  isSuccessResult(): boolean {

    return !!(
      this.result &&
      (
        this.result.message?.toLowerCase().includes('issued') ||
        this.result.txHash
      )
    );
  }
}
