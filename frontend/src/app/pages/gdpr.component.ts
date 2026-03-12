import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';


// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../services/theme.service';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import ForwarderArtifact from '../abi/Forwarder.json';        
import { MetaTxService } from '../services/metaTx.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

const ForwarderAbi = ForwarderArtifact.abi;

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
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
  <div class="gdpr-container" [class.dark]="darkMode()">
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
            <mat-spinner diameter="20" *ngIf="connecting"></mat-spinner>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <mat-card
    class="card elevated success-card"
    appearance="outlined"
    *ngIf="wallet.address && alreadyErased">

    <mat-card-header>
      <mat-icon class="header-icon" color="primary" mat-card-avatar>task_alt</mat-icon>
      <mat-card-title>Profile Already Erased</mat-card-title>
    </mat-card-header>

    <mat-card-content>
      <p>
        This decentralized identity has already been erased under
        <strong>GDPR Article 17</strong>.
      </p>

      <p class="small muted">
        The DID remains on-chain but points to a permanent erasure tombstone.
      </p>

      <p class="small muted">
        DID: <code>did:ethr:{{ wallet.address }}</code>
      </p>
    </mat-card-content>

  </mat-card>

    <!-- Erasure Request Form -->
    <mat-card class="card elevated warning-card" appearance="outlined" *ngIf="wallet.address && !result && !error && !alreadyErased">
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

        <mat-checkbox [(ngModel)]="confirmed" color="warn" class="confirmation-checkbox" [disabled]="loading">
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

        <!-- NEW: Progress message during long confirmation wait -->
        <div *ngIf="loading && result === null && error === null" class="progress-notice mt-4">
          <mat-spinner diameter="32" class="inline-spinner"></mat-spinner>
          <p>
            Transaction submitted. Waiting for blockchain confirmation...<br />
            This may take 10–60 seconds. Do not close the page.
          </p>
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
          Transaction hash: <code>{{ result.txHash?.slice(0,10) }}...{{ result.txHash?.slice(-6) }}</code><br />
          You can view it on <a href="https://sepolia.basescan.org/tx/{{ result.txHash }}" target="_blank">Basescan</a>.
        </p>
        <pre class="result-pre">{{ result | json }}</pre>

        <div class="post-success mt-4">
          <p class="muted">
            You have been disconnected for security. Reconnect your wallet to continue using the app.
          </p>
        </div>
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
      </mat-card-content>
    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .gdpr-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .gdpr-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .gdpr-header {
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

  .gdpr-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .gdpr-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .gdpr-container.dark .card:hover {
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

  .gdpr-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  /* Connected State */
  .did-display {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    padding: 14px 18px;
    background: var(--code-bg, #f1f5f9);
    border-radius: 14px;
    font-size: 1rem;
  }

  .gdpr-container.dark .did-display {
    background: rgba(30,41,59,0.6);
  }

  .did-display code {
    flex: 1;
    color: #1d4ed8;
    font-family: 'Courier New', monospace;
  }

  .gdpr-container.dark .did-display code {
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
    margin: 16px 0;
  }

  .gdpr-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  /* Warning Card */
  .warning-card {
    border-left: 5px solid #f59e0b;
  }

  .gdpr-container.dark .warning-card {
    border-left-color: #fbbf24;
  }

  .warning-box {
    display: flex;
    gap: 16px;
    background: var(--warning-bg, #fffbeb);
    border: 1px solid #fed7aa;
    padding: 20px;
    border-radius: 14px;
    margin-bottom: 28px;
    font-size: 1rem;
    color: var(--warning-text, #9a3412);
  }

  .gdpr-container.dark .warning-box {
    background: rgba(245,158,11,0.15);
    border-color: rgba(245,158,11,0.45);
    color: #fcd34d;
  }

  .warning-box ul {
    margin: 12px 0 0 24px;
    padding-left: 0;
  }

  .warning-box li {
    margin-bottom: 8px;
  }

  .confirmation-checkbox {
    display: block;
    margin: 28px 0;
    padding: 16px;
    background: var(--warning-bg, #fffbeb);
    border-radius: 14px;
    border: 1px solid #fed7aa;
    font-size: 1.05rem;
  }

  .gdpr-container.dark .confirmation-checkbox {
    background: rgba(245,158,11,0.15);
    border-color: rgba(245,158,11,0.45);
    color: #fcd34d;
  }

  .actions {
    text-align: right;
    margin-top: 28px;
  }

  .erase-btn {
    padding: 14px 40px;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    transition: all 0.25s ease;
  }

  .erase-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(239,68,68,0.4);
  }

  /* Success & Error Cards */
  .success-card {
    border-left: 5px solid #16a34a;
  }

  .gdpr-container.dark .success-card {
    border-left-color: #22c55e;
  }

  .error-card {
    border-left: 5px solid #dc2626;
  }

  .gdpr-container.dark .error-card {
    border-left-color: #ef4444;
  }

  .result-pre {
    background: var(--code-bg, #1e1e1e);
    color: #9cdcfe;
    padding: 20px;
    border-radius: 14px;
    overflow-x: auto;
    font-size: 0.95rem;
    margin-top: 16px;
  }

  .gdpr-container.dark .result-pre {
    background: #0d1117;
    color: #c9d1d9;
  }

  /* Misc */
  .muted { color: var(--text-secondary); }
  .small { font-size: 0.9rem; }

  /* Dark mode Material fixes (labels, inputs, checkboxes) */
  .gdpr-container.dark {
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
    .mat-mdc-checkbox-label,
    .mat-mdc-checkbox-label span {
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
    /* Single scalable responsive layer */
@media (max-width: 960px) {
  .gdpr-container {
    padding: 24px 28px 60px;
  }

  h1 {
    font-size: clamp(1.8rem, 4vw, 2.4rem);
  }
}

@media (max-width: 600px) {
  .gdpr-container {
    padding: 20px 20px 48px;
  }

  .card:hover {
    transform: none;
  }

  .actions {
    text-align: center;
  }

  .actions button {
    width: 100%;
  }

  mat-form-field,
  .full-width {
    width: 100% !important;
  }

  .did-display,
  .warning-box,
  .status.success {
    font-size: 0.95rem;
    padding: 12px 14px;
  }

  h1 {
    font-size: clamp(1.6rem, 6vw, 2rem);
  }

  .subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 360px) {
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

  h1 {
    font-size: 1.3rem;
  }
}

.progress-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 12px;
  text-align: center;
}

.inline-spinner {
  margin: 0 auto;
}

.post-success {
  margin-top: 16px;
  padding: 12px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  text-align: center;
}

`]
})

/**
 * GdprComponent
 *
 * Handles the GDPR Article 17 "Right to Erasure" functionality.
 *
 * Responsibilities:
 * - Connect the user's wallet
 * - Display the user's DID (Decentralized Identifier)
 * - Allow the user to request permanent profile erasure
 * - Support both gasless (meta-transaction) and direct transaction modes
 * - Wait for on-chain confirmation before confirming deletion
 * - Display transaction confirmation and explorer link
 * - Store erasure proof in session storage
 */
export class GdprComponent implements OnInit {

  /** Checkbox confirmation state (user must confirm deletion) */
  confirmed = false;

  /** Indicates wallet connection is in progress */
  connecting = false;

  /** Indicates erasure process is currently running */
  loading = false;

  /** Used to briefly show "Copied!" UI feedback */
  copied = false;

  /** Result object displayed after successful erasure */
  result: any = null;

  /** Error message displayed when the process fails */
  error: string | null = null;

/** Indicates the DID was already erased in this session */
alreadyErased = false;

  /** Theme service used for dark mode signal */
  private themeService = inject(ThemeService);

  /** Angular Material snackbar for notifications */
  private snackBar = inject(MatSnackBar);

  /**
   * MetaTx service used for gasless transactions.
   * This builds and signs EIP-2771 meta-transactions.
   */
  private metaTx = inject(MetaTxService);

  /** Http client used to call the backend relay endpoint */
  private http = inject(HttpClient);

  /**
   * Enables gasless transactions by default.
   * Can later be converted to a signal if UI toggling is needed.
   */
  useGasless = true;

  /** Dark mode signal exposed to template */
  darkMode = this.themeService.darkMode;

  constructor(
    /** Wallet service managing connection, signer, and provider */
    public wallet: WalletService,

    /** API service used to request profile erasure preparation */
    private api: ApiService,

    
  ) {}

  /**
 * Runs when the component initializes.
 *
 * Checks if a GDPR erasure was already recorded in this browser session.
 * If so, the UI is switched to the "already erased" state to prevent
 * accidental duplicate erasure attempts in the same session.
 *
 * Note:
 * We only check sessionStorage here because the wallet may not yet
 * be connected. DID validation happens later in checkErasedState().
 */
ngOnInit() {

  const erasedDid = sessionStorage.getItem('erasedDid');

  if (erasedDid) {
    this.alreadyErased = true;
  }

}


/**
 * Validates whether the currently connected wallet DID matches
 * a DID erased earlier in this session.
 *
 * Called after wallet connection to prevent the same identity
 * from requesting erasure multiple times within one session.
 */
checkErasedState() {

  const erasedDid = sessionStorage.getItem('erasedDid');

  if (!this.wallet.address) return;

  if (erasedDid === `did:ethr:${this.wallet.address}`) {
    this.alreadyErased = true;
  }

}

  /**
   * Connects the user's wallet.
   *
   * This allows the system to:
   * - Identify the DID
   * - Sign transactions or meta-transactions
   */
  async connect() {

    this.connecting = true;

    try {

      await this.wallet.connect();
      this.checkErasedState();

    } catch (e: any) {

      alert(e.message || 'Wallet connection failed');

    } finally {

      this.connecting = false;

    }
  }

  /**
   * Copies the user's DID to clipboard.
   *
   * DID format:
   * did:ethr:<walletAddress>
   */
  copyDid() {

    if (!this.wallet.address) return;

    const did = `did:ethr:${this.wallet.address}`;

    navigator.clipboard.writeText(did);

    this.copied = true;

    setTimeout(() => this.copied = false, 2000);
  }

  /**
   * Executes the GDPR erasure flow.
   *
   * Steps:
   * 1. Ensure wallet connected and confirmation checked
   * 2. Request unsigned transaction from backend
   * 3. Either:
   *    - Execute gasless meta-transaction
   *    - Or sign and send direct transaction
   * 4. Wait for blockchain confirmation
   * 5. Display result and transaction link
   * 6. Store erasure proof in sessionStorage
   * 7. Disconnect wallet
   */
  async erase() {

    /** Ensure wallet connected and user confirmed deletion */

    if (!this.wallet.address || !this.confirmed) return;

    this.loading = true;
    this.result = null;
    this.error = null;

    /** Build payload containing the user's DID */

    const payload = { did: `did:ethr:${this.wallet.address}` };

    try {

      /**
       * Request profile erasure preparation from backend.
       *
       * Backend returns:
       * - unsignedTx → user must sign transaction
       * - txHash → backend already signed (dev mode)
       */

      const response = await firstValueFrom(this.api.eraseProfile(payload));

      let txHash: string;

      /**
       * HYBRID MODE
       *
       * Backend returned unsigned transaction
       * → user must execute it (gasless or direct)
       */
      if (response.unsignedTx) {

        /**
         * GASLESS MODE
         *
         * Uses meta-transactions:
         * - user signs a meta request
         * - backend relay pays gas
         */

        if (this.useGasless) {

          this.snackBar.open(
            'Preparing gasless erasure...',
            'Close',
            { duration: 8000 }
          );

          /**
           * Build and sign EIP-2771 meta-transaction
           */

          const { request, signature } = await this.metaTx.buildAndSignMetaTx({

            forwarderAbi: ForwarderAbi,

            targetAddress: response.unsignedTx.to,

            rawData: response.unsignedTx.data

          });

          /**
           * Send signed meta-transaction to backend relay
           */

          const relayResponse: any = await firstValueFrom(

            this.http.post(
              `${environment.backendUrl}/meta/relay`,
              { request, signature }
            )

          );

          /**
           * Validate relay response
           */

          if (!relayResponse.txHash) {

            throw new Error('Gasless relay failed — no txHash returned');

          }

          txHash = relayResponse.txHash;

        } else {

          /**
           * DIRECT TRANSACTION MODE
           *
           * User signs and pays gas themselves.
           */

          this.snackBar.open(
            'Please sign the erasure transaction...',
            'Close',
            { duration: 15000 }
          );

          const txResponse = await this.wallet.signAndSendTransaction(
            response.unsignedTx
          );

          txHash = txResponse.hash;
        }

        /**
         * WAIT FOR ON-CHAIN CONFIRMATION
         *
         * Critical to ensure the erasure is finalized.
         */

        if (!this.wallet.provider) {

          throw new Error('Wallet provider not available — please reconnect');

        }

        this.snackBar.open(
          'Transaction sent — waiting for on-chain confirmation...',
          'Close',
          { duration: 15000 }
        );

        await this.wallet.provider.waitForTransaction(
          txHash,
          1,
          120000
        );

        /**
         * Create blockchain explorer link
         */

        const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;

        /**
         * Show confirmation snackbar with explorer link
         */

        const snackBarRef = this.snackBar.open(

          `Profile permanently erased! Tx confirmed: ${txHash.slice(0, 10)}...`,

          'View on Basescan',

          {
            duration: 15000,
            panelClass: ['success-snackbar']
          }

        );

        snackBarRef.onAction().subscribe(() =>
          window.open(explorerUrl, '_blank')
        );

      }

      /**
       * BACKEND-SIGNED MODE
       *
       * Used mainly in development or testing.
       */
      else if (response.txHash) {

        txHash = response.txHash;

        this.snackBar.open(
          'Profile erased successfully (backend signed)!',
          'Close',
          { duration: 6000 }
        );

      }

      /**
       * Unexpected backend response
       */
      else {

        throw new Error(
          'Unexpected response from server — no transaction info'
        );

      }

      /**
       * SUCCESS RESULT OBJECT
       *
       * Displayed in the UI after confirmation.
       */

      this.result = {

        message: '✅ GDPR Art.17 erasure enforced',

        did: payload.did,

        erasedCid: response.newCid || response.cid,

        txHash
      };

      /** Reset confirmation checkbox */

      this.confirmed = false;

      /**
       * Store erasure proof locally for session tracking.
       *
       * This allows UI to show that the DID was erased.
       */

      sessionStorage.setItem('erasedDid', payload.did);

      sessionStorage.setItem('erasedAt', new Date().toISOString());

      /**
       * Disconnect wallet AFTER completion
       */

      this.wallet.disconnect();

    } catch (err: any) {

      console.error('Erasure failed:', err);

      if (err.status === 410) {
          this.alreadyErased = true;
        }

      /**
       * Extract meaningful error message
       */

      this.error =
        err?.error?.error
          ? `${err.error.error} (${new Date(err.error.erasedAt).toLocaleString()})`
          : err.message || 'Erasure request failed';

      /**
       * Display error snackbar
       */

      if (this.error) {

        this.snackBar.open(
          this.error,
          'Close',
          {
            duration: 10000,
            panelClass: ['error-snackbar']
          }
        );
      }

    } finally {

      /** Reset loading state */

      this.loading = false;
    }
  }
}

/** Default export for lazy loading or module usage */
export default GdprComponent;
