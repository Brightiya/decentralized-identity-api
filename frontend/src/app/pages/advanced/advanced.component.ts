import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service'; // ← Add this import

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
        <!-- Your existing tabs here -->
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
  `,
  styles: [`
        .advanced-header {
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
          max-width: 840px;
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
          margin-bottom: 20px;
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

        .hint {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .full-width {
          width: 100%;
          margin-bottom: 16px;
        }

        .actions {
          text-align: right;
          margin-top: 24px;
        }

        .tab-content {
          padding: 32px 0;
        }

        .tools-tabs ::ng-deep .mat-mdc-tab-body-content {
          padding: 16px 0;
        }

        .result-card pre {
          background: #1e1e1e;
          color: #9cdcfe;
          padding: 20px;
          border-radius: 12px;
          overflow-x: auto;
          font-size: 0.9rem;
          margin: 0;
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

        .muted {
          color: #64748b;
        }
      
        .hint-box {
      display: flex;
      gap: 12px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 16px;
      border-radius: 12px;
      margin: 20px 0 28px 0;
      font-size: 0.95rem;
      color: #0c4a6e;
      align-items: flex-start;
    }

    .hint-box mat-icon {
      color: #0288d1;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .hint-box ol {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .hint-box code {
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.9em;
    }

    .error-hint {
      display: flex;
      gap: 10px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      padding: 14px;
      border-radius: 12px;
      margin-top: 20px;
      color: #991b1b;
      font-size: 0.95rem;
      align-items: flex-start;
    }

    .error-hint mat-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .connect-card {
      max-width: 500px;
      margin: 60px auto;
      text-align: center;
    }

    .connect-content {
      padding: 40px 24px;
    }

    .wallet-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #6366f1;
      margin-bottom: 24px;
    }

    .connect-content h2 {
      margin: 0 0 16px;
      color: #1e293b;
    }

    .connect-content .muted {
      margin-bottom: 32px;
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