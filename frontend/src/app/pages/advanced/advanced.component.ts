import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-advanced', // ← changed selector to match file name / route if needed
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
    
  ],
  template: `
  <div class="advanced-container" [class.dark]="darkMode()">
    <div class="advanced-header">
      <h1>Advanced Identity Tools</h1>
      <p class="subtitle">
        Expert-level diagnostic and verification tools for DIDs, VCs, and on-chain identity state.
        Use with caution — intended for developers and auditors.
      </p>
    </div>

    <!-- Connect Wallet Prompt (shown when not connected) -->
    <ng-container *ngIf="!wallet.address; else mainContent">
      <mat-card class="card elevated connect-card" appearance="outlined">
        <mat-card-content class="connect-content">
          <mat-icon class="wallet-icon">account_balance_wallet</mat-icon>
          <h2>Wallet Connection Required</h2>
          <p class="muted">
            Connect your wallet to access verification tools for DIDs, VCs, and on-chain identity state.
          </p>

          <button
            mat-raised-button
            color="primary"
            (click)="connectWallet()"
            [disabled]="connecting">
            <mat-icon *ngIf="!connecting">wallet</mat-icon>
            <mat-spinner diameter="20" *ngIf="connecting"></mat-spinner>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </mat-card-content>
      </mat-card>
    </ng-container>

    <!-- Main Content (shown only when wallet is connected) -->
    <ng-template #mainContent>
      <mat-tab-group class="tools-tabs" animationDuration="300ms">
        <!-- Resolve DID Tab -->
        <mat-tab label="Resolve DID">
          <div class="tab-content">
            <mat-card class="card elevated" appearance="outlined">
              <mat-card-header>
                <mat-icon class="header-icon" mat-card-avatar>search</mat-icon>
                <mat-card-title>Resolve Decentralized Identifier</mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <p class="hint">
                  Enter a full DID (e.g., 0x...) to retrieve its current document and profile state from the resolver.
                </p>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>DID to Resolve</mat-label>
                  <input
                    matInput
                    [(ngModel)]="did"
                    placeholder="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
                  />
                  <mat-icon matSuffix>badge</mat-icon>
                  <mat-hint>Same as wallet address</mat-hint>
                </mat-form-field>

                <div class="actions">
                  <button
                    mat-raised-button
                    color="primary"
                    (click)="resolve()"
                    [disabled]="!did.trim() || resolving">
                    <mat-icon *ngIf="!resolving">travel_explore</mat-icon>
                    <mat-spinner diameter="20" *ngIf="resolving"></mat-spinner>
                    <span>{{ resolving ? 'Resolving...' : 'Resolve DID' }}</span>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Verify Credential Tab -->
        <mat-tab label="Verify Credential">
          <div class="tab-content">
            <mat-card class="card elevated" appearance="outlined">
              <mat-card-header>
                <mat-icon class="header-icon" mat-card-avatar>verified</mat-icon>
                <mat-card-title>Verify Verifiable Credential</mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <p class="hint">
                  Paste a full Verifiable Credential (VC) JSON to cryptographically verify its signature, on-chain anchoring, and GDPR consent rules.
                </p>

                <div class="hint-box">
                  <mat-icon inline>lightbulb</mat-icon>
                  <div>
                    <strong>How to get the full VC for verification:</strong>
                    <ol>
                      <li>Go to <strong>Credentials → Issue Credential</strong></li>
                      <li>Issue any credential (e.g., identity.email in any context)</li>
                      <li>After success, copy the <strong>gatewayUrl</strong> from the result panel</li>
                      <li>Open that URL in a new browser tab</li>
                      <li>Copy the entire JSON displayed there — this is the <em>full signed VC</em></li>
                      <li>Paste it here and click Verify</li>
                    </ol>
                    <br>
                    <strong>Note:</strong> The backend response contains metadata (cid, txHash, etc.), but the <em>actual VC</em> is stored on IPFS and retrieved via the gateway URL.
                  </div>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>VC JSON</mat-label>
                  <textarea
                    matInput
                    rows="14"
                    [(ngModel)]="verifyPayload"
                    placeholder='{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential"],
  "issuer": "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "issuanceDate": "2025-12-24T...",
  "credentialSubject": { ... },
  "proof": { ... },
  "pimv": { "context": "personal", "claimId": "identity.email", ... }
}'
                  ></textarea>
                  <mat-icon matSuffix>code</mat-icon>
                  <mat-hint>Full VC from IPFS gateway (includes proof and pimv.claimId)</mat-hint>
                </mat-form-field>

                <div class="actions">
                  <button
                    mat-raised-button
                    color="accent"
                    (click)="verify()"
                    [disabled]="!verifyPayload.trim() || verifying">
                    <mat-icon *ngIf="!verifying">security</mat-icon>
                    <mat-spinner diameter="20" *ngIf="verifying"></mat-spinner>
                    <span>{{ verifying ? 'Verifying...' : 'Verify Credential' }}</span>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Result Display -->
      <mat-card class="card elevated result-card" appearance="outlined" *ngIf="result">
        <mat-card-header>
          <mat-icon
            class="header-icon"
            [color]="isSuccessResult() ? 'primary' : 'warn'"
            mat-card-avatar>
            {{ isSuccessResult() ? 'task_alt' : 'warning' }}
          </mat-icon>
          <mat-card-title>Result</mat-card-title>
          <mat-card-subtitle>
            {{ currentTool === 'resolve' ? 'DID Resolution' : 'Credential Verification' }}
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <pre class="result-pre">{{ result | json }}</pre>
        </mat-card-content>
      </mat-card>

      <!-- Empty State -->
      <mat-card class="card elevated empty-state" appearance="outlined" *ngIf="!result && !resolving && !verifying">
        <mat-icon class="empty-icon">analytics</mat-icon>
        <h3>No operation performed yet</h3>
        <p class="muted">
          Use the tools above to resolve a DID or verify a credential.
        </p>
      </mat-card>
    </ng-template>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100%;
  }

  .advanced-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .advanced-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .advanced-header {
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

  .advanced-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .advanced-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .advanced-container.dark .card:hover {
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

  .advanced-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  /* Connect Card */
  .connect-card {
    max-width: 520px;
    margin: 80px auto;
    text-align: center;
  }

  .connect-content {
    padding: 48px 32px;
  }

  .wallet-icon {
    font-size: 72px;
    width: 72px;
    height: 72px;
    color: #6366f1;
    margin-bottom: 32px;
  }

  .connect-content h2 {
    margin: 0 0 20px;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .advanced-container.dark .connect-content h2 {
    color: #f1f5f9;
  }

  /* Tabs & Content */
  .tab-content {
    padding: 32px 0;
  }

  .tools-tabs ::ng-deep .mat-mdc-tab-body-content {
    padding: 0;
  }

  /* Forms */
  .full-width {
    width: 100%;
    margin-bottom: 20px;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .hint-box {
    display: flex;
    gap: 16px;
    background: var(--hint-bg, #f0f9ff);
    border: 1px solid #bae6fd;
    padding: 20px;
    border-radius: 14px;
    margin: 20px 0 28px;
    font-size: 0.98rem;
    color: var(--hint-text, #0c4a6e);
    align-items: flex-start;
  }

  .advanced-container.dark .hint-box {
    background: rgba(14, 74, 110, 0.15);
    border-color: rgba(14, 74, 110, 0.45);
    color: #bae6fd;
  }

  .hint-box mat-icon {
    color: #0288d1;
    margin-top: 4px;
    flex-shrink: 0;
  }

  .advanced-container.dark .hint-box mat-icon {
    color: #7dd3fc;
  }

  .hint-box ol {
    margin: 12px 0 0 0;
    padding-left: 24px;
  }

  .hint-box code {
    background: var(--code-bg, #e0f2fe);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.92rem;
  }

  .advanced-container.dark .hint-box code {
    background: rgba(30,41,59,0.6);
  }

  .actions {
    text-align: right;
    margin-top: 28px;
  }

  /* Result Card */
  .result-card pre {
    background: var(--code-bg, #1e1e1e);
    color: #9cdcfe;
    padding: 20px;
    border-radius: 14px;
    overflow-x: auto;
    font-size: 0.95rem;
    margin: 0;
  }

  .advanced-container.dark .result-card pre {
    background: #0d1117;
    color: #c9d1d9;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 32px;
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

  /* Misc */
  .muted { color: var(--text-secondary); }

  /* Dark mode Material fixes */
  .advanced-container.dark {
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
    textarea.mat-mdc-input-element {
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
  }
`]
})
export class AdvancedComponent {  // ← renamed class to match typical naming
  did = '';
  verifyPayload = '';
  result: any = null;
  cid = '';

  resolving = false;
  verifying = false;
  currentTool: 'resolve' | 'verify' | null = null;

  // Wallet connection state
  connecting = false;
  wallet = inject(WalletService);

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  constructor(private api: ApiService) {}

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

  resolve() {
    if (!this.did.trim()) {
      alert('Please enter a valid DID');
      return;
    }

    this.resolving = true;
    this.result = null;
    this.currentTool = 'resolve';

    this.api.resolveDID(this.did.trim()).subscribe({
      next: (r) => {
        this.result = r;
        this.resolving = false;
      },
      error: (e) => {
        this.result = e.error || { error: 'Resolution failed', details: e.message || e };
        this.resolving = false;
      }
    });
  }

  verify() {
    if (!this.verifyPayload.trim()) {
      alert('Please paste a valid VC JSON');
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(this.verifyPayload);
    } catch {
      alert('Invalid JSON format');
      return;
    }

    if (this.cid.trim()) {
      payload.cid = this.cid.trim();
    }

    this.verifying = true;
    this.result = null;
    this.currentTool = 'verify';

    this.api.validateRawVC(payload).subscribe({
      next: (r) => {
        this.result = r;
        this.verifying = false;
      },
      error: (e) => {
        this.result = e.error || { error: 'Validation failed', details: e.message };
        this.verifying = false;
      }
    });
  }

  isSuccessResult(): boolean {
    return this.result && !this.result.error;
  }
}

export default AdvancedComponent;