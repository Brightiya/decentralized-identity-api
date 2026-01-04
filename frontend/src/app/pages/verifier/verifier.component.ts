import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-verifier',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
  <div class="verifier-header">
      <h1>Verify Credentials</h1>
      <p class="subtitle">
        Securely request and verify subject credentials with explicit purpose and GDPR-compliant consent.
      </p>
    </div>

    <div class="verifier-container">
      <!-- Connect Wallet Prompt (shown when not connected) -->
      <ng-container *ngIf="!wallet.address; else mainContent">
        <mat-card class="card elevated connect-card" appearance="outlined">
          <mat-card-content class="connect-content">
            <mat-icon class="wallet-icon">account_balance_wallet</mat-icon>
            <h2>Wallet Connection Required</h2>
            <p class="muted">
              Request and verify credentials from a subject with explicit purpose and consent.
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
        <mat-card class="verifier-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>verified_user</mat-icon>
            <mat-card-title>Credential Verification & Disclosure Request</mat-card-title>
            <mat-card-subtitle>
              Request and verify credentials from a subject with explicit purpose and consent.
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Subject DID</mat-label>
                <input matInput formControlName="subject" placeholder="did:ethr:0x..." />
                <mat-error *ngIf="form.get('subject')?.hasError('required')">
                  Subject DID is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Verifier DID</mat-label>
                <input matInput formControlName="verifierDid" placeholder="did:ethr:0x..." />
                <mat-error *ngIf="form.get('verifierDid')?.hasError('required')">
                  Verifier DID is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Purpose of Disclosure</mat-label>
                <textarea matInput formControlName="purpose" rows="2"></textarea>
                <mat-hint>e.g., "Legal case", "KYC verification", "Employment check"</mat-hint>
                <mat-error *ngIf="form.get('purpose')?.hasError('required')">
                  Purpose is required
                </mat-error>
              </mat-form-field>

              <mat-checkbox formControlName="consent" color="primary">
                I confirm that this disclosure request is lawful, necessary, and I have the right to request these credentials for the stated purpose.
              </mat-checkbox>

              <mat-divider class="my-3"></mat-divider>

              <h3>Requested Credentials</h3>

              <div formArrayName="credentials">
                <div *ngFor="let cred of credentialsArray.controls; let i = index" [formGroupName]="i" class="credential-row">
                  <mat-form-field appearance="outline" class="cred-field">
                    <mat-label>Claim ID</mat-label>
                    <input matInput formControlName="claimId" placeholder="e.g. identity.email" />
                    <mat-error *ngIf="cred.get('claimId')?.hasError('required')">
                      Claim ID is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="cred-field">
                    <mat-label>CID</mat-label>
                    <input matInput formControlName="cid" placeholder="e.g. QmQaXoq7zS4xJa8DH2Yp6YZgEJkNCcHXr4QvnjbfinGRKV" />
                    <mat-error *ngIf="cred.get('cid')?.hasError('required')">
                      CID is required
                    </mat-error>
                  </mat-form-field>

                  <button mat-icon-button color="warn" (click)="removeCredential(i)" matTooltip="Remove">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <button mat-stroked-button color="primary" type="button" (click)="addCredential()" class="add-btn">
                <mat-icon>add</mat-icon> Add Credential
              </button>

              <div class="actions">
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="form.invalid || isSubmitting || credentialsArray.length === 0"
                >
                  <mat-spinner *ngIf="isSubmitting" diameter="20"></mat-spinner>
                  <span *ngIf="!isSubmitting">Verify & Request Disclosure</span>
                  <span *ngIf="isSubmitting">Processing...</span>
                </button>
              </div>
            </form>

            <!-- Result / Error -->
            <div *ngIf="result" class="result success">
              <h3>Verification Successful</h3>
              <pre>{{ result | json }}</pre>
            </div>

            <div *ngIf="error" class="result error">
              <h3>Error</h3>
              <p>{{ error }}</p>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .verifier-header {
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

    .verifier-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .verifier-card {
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .full-width {
      width: 100%;
    }

    .credential-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .cred-field {
      flex: 1;
    }

    .add-btn {
      margin-bottom: 24px;
    }

    .actions {
      text-align: right;
      margin-top: 24px;
    }

    .result {
      margin-top: 32px;
      padding: 16px;
      border-radius: 8px;
    }

    .success {
      background: #f0fdf4;
      border: 1px solid #86efac;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    /* New connect card styles */
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
export class VerifierComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  wallet = inject(WalletService);

  form: FormGroup;
  isSubmitting = false;
  result: any = null;
  error: string | null = null;
  connecting = false; // ← new flag for connect button

  get credentialsArray(): FormArray {
    return this.form.get('credentials') as FormArray;
  }

  constructor() {
    this.form = this.fb.group({
      subject: ['', Validators.required],
      verifierDid: ['', Validators.required],
      purpose: ['', Validators.required],
      consent: [false, Validators.requiredTrue],
      credentials: this.fb.array([])
    });

    // Prefill subject with connected wallet address (as DID)
    this.wallet.address$.subscribe(addr => {
      if (addr) {
        this.form.patchValue({
          subject: `did:ethr:${addr}`
        });
      }
    });
  }

  // New method: Connect wallet
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

  addCredential() {
    this.credentialsArray.push(
      this.fb.group({
        claimId: ['', Validators.required],
        cid: ['', Validators.required]
      })
    );
  }

  removeCredential(index: number) {
    this.credentialsArray.removeAt(index);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.result = null;
    this.error = null;

    const payload = {
      subject: this.form.value.subject,
      verifierDid: this.form.value.verifierDid,
      purpose: this.form.value.purpose,
      context: this.form.value.context,
      consent: this.form.value.consent,
      credentials: this.credentialsArray.value
    };

    try {
      const response = await this.api.verifyVC(payload).toPromise();
      this.result = response;
    } catch (err: any) {
      this.error = err.error?.error || err.message || 'Verification failed';
      console.error('Verification error:', err);
    } finally {
      this.isSubmitting = false;
    }
  }
}