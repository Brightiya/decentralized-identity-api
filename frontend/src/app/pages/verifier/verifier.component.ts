import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';
import { ThemeService } from '../../services/theme.service';
import { ContextService } from '../../services/context.service';
import { computed, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatDividerModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatSelectModule,
    MatTooltipModule
  ],
  template: `
  <div class="verifier-container" [class.dark]="darkMode()">
    <div class="verifier-header">
      <h1>Verify Credentials</h1>
      <p class="subtitle">
        Securely request and verify subject credentials with explicit purpose and GDPR-compliant consent.
      </p>
    </div>

    <!-- Connect Wallet Prompt -->
    <ng-container *ngIf="!wallet.address; else mainContent">
      <mat-card class="card elevated connect-card" appearance="outlined">
        <mat-card-content class="connect-content">
          <mat-icon class="wallet-icon">account_balance_wallet</mat-icon>
          <h2>Wallet Connection Required</h2>
          <p class="muted">
            Connect your wallet to create secure, purpose-bound credential verification requests.
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

    <!-- Main Content -->
    <ng-template #mainContent>
      <mat-card class="card elevated verifier-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>verified_user</mat-icon>
          <mat-card-title>Credential Verification Request</mat-card-title>
          <mat-card-subtitle>
            Request verifiable credentials with explicit purpose and consent tracking.
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">

            <!-- Subject DID -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Subject DID</mat-label>
              <input matInput formControlName="subject" placeholder="did:ethr:0x..." />
              <mat-error *ngIf="form.get('subject')?.hasError('required')">
                Subject DID is required
              </mat-error>
            </mat-form-field>

            <!-- Verifier DID -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Verifier DID (your DID)</mat-label>
              <input matInput formControlName="verifierDid" placeholder="did:ethr:0x..." />
              <mat-error *ngIf="form.get('verifierDid')?.hasError('required')">
                Your DID is required
              </mat-error>
            </mat-form-field>

            <!-- Context Selection -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Disclosure Context</mat-label>
              <mat-select formControlName="context">
                <mat-option value="">-- Select context --</mat-option>
                <mat-option *ngFor="let c of contexts()" [value]="c">
                  {{ c | titlecase }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="form.get('context')?.hasError('required')">
                Context is required
              </mat-error>
            </mat-form-field>

            <!-- Purpose with Autocomplete -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Purpose of Disclosure</mat-label>
              <input matInput formControlName="purpose"
                     placeholder="e.g., KYC verification, age check, address confirmation"
                     [matAutocomplete]="purposeAuto" />

              <!-- Auto-complete panel -->
          <mat-autocomplete #purposeAuto="matAutocomplete">
            <mat-option *ngFor="let claim of filteredSuggestedPurposes()" [value]="claim.purpose">
              <div class="purpose-option">
                <span class="purpose-text">{{ claim.purpose }}
                <span class="recency-badge" *ngIf="isLatest(claim)">
                   Latest
                </span></span>
                <small class="muted">
                  Claim ID: {{ claim.claim_id }} <br> Context: {{ claim.context }}
                  <span *ngIf="claim.issued_at" class="recency">
                    • {{ getRelativeTime(claim.issued_at) }}
                  </span>
                </small>
              </div>
            </mat-option>
          </mat-autocomplete>

              <!-- Improved hints -->
              <mat-hint class="subtle-context-hint" *ngIf="!form.get('context')?.value">
                Select a context first to see relevant purpose suggestions
              </mat-hint>

              <mat-hint class="subtle-context-hint warn-hint" *ngIf="form.get('context')?.value && filteredSuggestedPurposes().length === 0 && !form.get('purpose')?.value?.trim()">
                No previous purposes found for <strong>{{ form.get('context')?.value | titlecase }}</strong>.<br>
                A consented VC must be issued first in this context by the issuer.
              </mat-hint>
            </mat-form-field>

            <!-- Consent Checkbox -->
            <mat-checkbox formControlName="consent" color="primary" class="consent-checkbox">
              I confirm this request is lawful, necessary, and respects data minimization principles.
            </mat-checkbox>

            <mat-divider class="my-5"></mat-divider>

            <h3>Requested Credentials</h3>

            <div formArrayName="credentials">
              <div *ngFor="let cred of credentialsArray.controls; let i = index"
                   [formGroupName]="i"
                   class="credential-row">

                <!-- Claim ID - now filtered dropdown -->
                <mat-form-field appearance="outline" class="cred-field">
                  <mat-label>Claim ID</mat-label>
                  <mat-select formControlName="claimId">
                    <mat-option *ngFor="let id of filteredClaimIdsByContext()" [value]="id">
                      {{ id }}
                    </mat-option>
                    <mat-option *ngIf="filteredClaimIdsByContext().length === 0" disabled>
                      No claims available
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="cred.get('claimId')?.hasError('required')">
                    Claim ID is required
                  </mat-error>
                  <mat-hint *ngIf="form.get('context')?.value && filteredClaimIdsByContext().length === 0">
                    No credentials found in this context
                  </mat-hint>
                </mat-form-field>

                <!-- CID -->
                <mat-form-field appearance="outline" class="cred-field">
                  <mat-label>Content Identifier (CID)</mat-label>
                  <input matInput formControlName="cid" placeholder="Qm..." />
                  <mat-error *ngIf="cred.get('cid')?.hasError('required')">
                    CID is required
                  </mat-error>
                </mat-form-field>

                <button mat-icon-button color="warn" (click)="removeCredential(i)" matTooltip="Remove this credential">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>

            <!-- Add Button -->
            <button mat-stroked-button color="primary"
                    type="button"
                    (click)="addCredential()"
                    class="add-btn mt-3"
                    [disabled]="!form.get('context')?.value || filteredClaimIdsByContext().length === 0"
                    matTooltip="Select context first">
              <mat-icon>add</mat-icon>
              Add Credential
            </button>

            <!-- Submit -->
            <div class="actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || isSubmitting || credentialsArray.length === 0">
                <mat-spinner *ngIf="isSubmitting" diameter="20"></mat-spinner>
                <span *ngIf="!isSubmitting">Request & Verify</span>
                <span *ngIf="isSubmitting">Processing...</span>
              </button>
            </div>
          </form>

          <!-- Results -->
          <div *ngIf="result" class="result success mt-5">
            <h3>Request Successful</h3>
            <pre>{{ result | json }}</pre>
          </div>

          <div *ngIf="error" class="result error mt-5">
            <h3>Error</h3>
            <p>{{ error }}</p>
          </div>
        </mat-card-content>
      </mat-card>
    </ng-template>
  </div>

`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .verifier-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .verifier-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .verifier-header {
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

  .verifier-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .verifier-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .verifier-container.dark .card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
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

  .verifier-container.dark .connect-content h2 {
    color: #f1f5f9;
  }

  /* Form & Credential Rows */
  .full-width {
    width: 100%;
    margin-bottom: 20px;
  }

  .credential-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding: 12px;
    border-radius: 12px;
    background: var(--row-bg, rgba(0,0,0,0.02));
  }

  .verifier-container.dark .credential-row {
    background: rgba(255,255,255,0.04);
  }

  .cred-field {
    flex: 1;
  }

  .add-btn {
    margin-bottom: 28px;
  }

  .actions {
    text-align: right;
    margin-top: 28px;
  }

  /* Result / Error */
  .result {
    margin-top: 32px;
    padding: 20px;
    border-radius: 14px;
    font-size: 0.95rem;
  }

  .success {
    background: var(--success-bg, #f0fdf4);
    border: 1px solid #bbf7d0;
    color: var(--success-text, #166534);
  }

  .verifier-container.dark .success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  .error {
    background: var(--error-bg, #fef2f2);
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .verifier-container.dark .error {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.45);
    color: #fca5a5;
  }

.purpose-option {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.purpose-text {
  font-weight: 500;
  color: #1e293b;
}

.consent-container.dark .purpose-text {
  color: #e2e8f0;
}

.purpose-option small {
  opacity: 0.7;
  font-size: 0.82rem;
  margin-top: 2px;
}

.recency {
  color: #6366f1;
  font-style: italic;
}

.consent-container.dark .recency {
  color: #a5b4fc;
}

.recency-badge {
  font-size: 0.8rem;
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 999px;
  margin-left: 8px;
  vertical-align: middle;
}

.consent-container.dark .recency-badge {
  background: #0e7490;
  color: #e0f2fe;
}

  /* Misc */
  .muted { color: var(--text-secondary); }

  /* Dark mode Material fixes */
  .verifier-container.dark {
    .mat-mdc-form-field-label,
    .mat-mdc-form-field-hint,
    .mat-mdc-input-element::placeholder,
    .mat-mdc-checkbox-label,
    .mat-mdc-checkbox-label span {
      color: #94a3b8 !important;
      opacity: 1 !important;
    }

    .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: #a5b4fc !important;
    }

    .mat-mdc-input-element {
      color: #f1f5f9 !important;
    }

    .mat-mdc-checkbox-checked .mat-mdc-checkbox-background,
    .mat-mdc-checkbox-indeterminate .mat-mdc-checkbox-background {
      background-color: #6366f1 !important;
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
   /* ==========================================
   Tablet (≤ 960px)
   ========================================== */
@media (max-width: 960px) {
  .verifier-container {
    padding: 24px 28px 64px;
  }

  .verifier-header {
    margin-bottom: 40px;
  }

  h1 {
    font-size: clamp(1.5rem, 3vw + 1rem, 2.4rem);
  }

  .subtitle {
    font-size: 1.05rem;
    max-width: 620px;
  }

  .card {
    border-radius: 18px;
  }

  .connect-card {
    margin: 60px auto;
  }

  .wallet-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
  }

  .connect-content h2 {
    font-size: 1.6rem;
  }
}

/* ==========================================
   Phones (≤ 480px)
   ========================================== */
@media (max-width: 480px) {
  .verifier-container {
    padding: 16px 16px 48px;
  }

  .verifier-header {
    margin-bottom: 28px;
  }

  h1 {
    font-size: clamp(1.3rem, 4vw + 1rem, 2rem);
    text-align: center;
  }

  .subtitle {
    font-size: 1rem;
    line-height: 1.5;
    text-align: center;
    max-width: 100%;
  }

  .card {
    border-radius: 16px;
  }

  .card:hover {
    transform: none; /* disable hover float on touch */
  }

  .connect-card {
    margin: 40px auto;
  }

  .connect-content {
    padding: 32px 20px;
  }

  .wallet-icon {
    font-size: 56px;
    width: 56px;
    height: 56px;
    margin-bottom: 24px;
  }

  .connect-content h2 {
    font-size: 1.4rem;
  }

  .credential-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 10px 12px;
  }

  .actions {
    text-align: center;
  }

  .actions button,
  .btn-primary,
  .btn-secondary,
  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .result {
    font-size: 0.9rem;
    padding: 16px;
  }
}

/* ==========================================
   Very Small Phones (≤ 320px)
   ========================================== */
@media (max-width: 320px) {
  h1 {
    font-size: 1.2rem;
    letter-spacing: -0.4px;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .connect-content {
    padding: 24px 14px;
  }

  .wallet-icon {
    font-size: 48px;
    width: 48px;
    height: 48px;
  }

  .connect-content h2 {
    font-size: 1.2rem;
  }

  .credential-row {
    padding: 8px 10px;
  }

  .result {
    font-size: 0.85rem;
    padding: 12px;
  }

  .btn-primary,
  .btn-secondary,
  .add-btn {
    padding: 10px 14px;
    font-size: 0.9rem;
  }
}
  /* New subtle hint style */
    .subtle-context-hint {
      font-size: 0.85rem;
      color: #757575;
      margin-top: 8px;
      margin-bottom: 16px;
      opacity: 0.8;
      display: block;
    }

    /* Optional: Style for auto-complete options */
    mat-option {
      line-height: 1.4;
    }
    mat-option small {
      opacity: 0.7;
      font-size: 0.85em;
      margin-left: 8px;
    }

`]
})
export class VerifierComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  wallet = inject(WalletService);
  private themeService = inject(ThemeService);
  private contextService = inject(ContextService);
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  isSubmitting = false;
  result: any = null;
  error: string | null = null;
  connecting = false;
  purposeValue = '';

  // Signals
  suggestedClaims = signal<any[]>([]);
  contexts = signal<string[]>([]);

  // ⭐ Recommended: dedicated signal for context (best reactivity)
  selectedContext = signal<string>('');

  darkMode = this.themeService.darkMode;

  // Helper to normalize contexts consistently (good practice)
  private normalizeContext(ctx: string): string {
    return ctx?.toLowerCase()?.trim()?.replace(/\s+/g, '-') || '';
  }

  filteredSuggestedPurposes = computed(() => {
  const search = this.purposeValue?.toLowerCase().trim() || '';
  const currentContext = this.selectedContext()?.toLowerCase() || '';

  let claims = [...this.suggestedClaims()];

  // FILTER out other contexts
  if (currentContext) {
    claims = claims.filter(
      claim => (claim.context || '').toLowerCase() === currentContext
    );
  }

  // If user hasn't typed anything just return context-filtered claims
  if (!search) return claims;

  // Filter by search text
  return claims.filter(claim =>
    (claim.purpose || '').toLowerCase().includes(search)
  );
});


getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'recent';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  // ← Here: Add "Older" for anything 30+ days old
  return 'Older';  // or 'Older (before 2025)' or date.toLocaleDateString()
}

isLatest(claim: any): boolean {
  if (!claim.issued_at) return false;

  const filtered = this.filteredSuggestedPurposes();
  const allTimestamps = filtered
    .filter(c => c.issued_at)
    .map(c => new Date(c.issued_at).getTime());

  if (allTimestamps.length === 0) return false;

  const maxTime = Math.max(...allTimestamps);
  return new Date(claim.issued_at).getTime() === maxTime;
}

  filteredClaimIdsByContext = computed(() => {
    const currentContext = this.selectedContext();
    const normalizedCurrent = this.normalizeContext(currentContext);

    return this.suggestedClaims()
      .filter(claim =>
        !normalizedCurrent ||
        this.normalizeContext(claim.context || '') === normalizedCurrent
      )
      .map(claim => claim.claim_id);
  });

  get credentialsArray(): FormArray {
    return this.form.get('credentials') as FormArray;
  }

  constructor() {
    this.form = this.fb.group({
      subject: ['', Validators.required],
      verifierDid: ['', Validators.required],
      context: ['', Validators.required],
      purpose: ['', Validators.required],
      consent: [false, Validators.requiredTrue],
      credentials: this.fb.array([])
    });

    // Wallet connection → prefill subject + load suggestions
    this.wallet.address$.subscribe(addr => {
      if (addr) {
        this.form.patchValue({ subject: `did:ethr:${addr}` });
        this.loadSuggestions();
      }
    });

    // Load available contexts
    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts.set(ctxs.sort());
    });

    // ⭐ Key reactivity bridge: sync form context → selectedContext signal
    this.form.get('context')?.valueChanges.subscribe(value => {
      const newValue = value || '';
      this.selectedContext.set(newValue);

      // Optional: normalize in form too (consistency)
      const normalized = this.normalizeContext(newValue);
      if (normalized !== newValue && normalized) {
        this.form.patchValue({ context: normalized }, { emitEvent: false });
      }

      this.cdr.detectChanges();
    });

    // Purpose changes → trigger UI refresh if needed
    this.form.get('purpose')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

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

  loadSuggestions() {
    const addr = this.wallet.address;
    if (!addr) return;

    const did = `did:ethr:${addr}`;
    this.api.getSuggestableClaims(did).subscribe({
      next: (res: any) => {
        this.suggestedClaims.set(res.suggestableClaims || []);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load suggestions:', err)
    });
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
      this.result = await this.api.verifyVC(payload).toPromise();
    } catch (err: any) {
      this.error = err.error?.error || err.message || 'Verification failed';
      console.error('Verification error:', err);
    } finally {
      this.isSubmitting = false;
    }
  }
}