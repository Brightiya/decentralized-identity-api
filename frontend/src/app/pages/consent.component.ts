import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { WalletService } from '../services/wallet.service';
import { ContextService } from '../services/context.service';
import { ApiService } from '../services/api.service';
import { ThemeService } from '../services/theme.service';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';


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
    MatInputModule,
    MatCheckboxModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatAutocompleteModule,   
    MatOptionModule
  ],
  template: `
    <div class="consent-container" [class.dark]="darkMode()">
      <div class="consent-header">
        <h1>Consent Management</h1>
        <p class="subtitle">
          Control exactly which personal attributes you share and with whom. 
          Your explicit consent is required for any disclosure.
        </p>
      </div>

      <!-- Wallet Connection -->
      <mat-card class="card elevated">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>account_balance_wallet</mat-icon>
          <mat-card-title>Wallet Connection</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <ng-container *ngIf="walletAddress(); else connectPrompt">
            <div class="connected-state">
              <div class="address-row">
                <code class="address">{{ walletAddress() | slice:0:6 }}…{{ walletAddress() | slice:-4 }}</code>
                <button mat-icon-button (click)="copyAddress()" matTooltip="Copy address">
                  <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
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
            <button mat-raised-button color="primary" (click)="connectWallet()" [disabled]="connecting()">
              <mat-icon *ngIf="!connecting()">wallet</mat-icon>
              <span>{{ connecting() ? 'Connecting...' : 'Connect Wallet' }}</span>
            </button>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Consent Flow -->
      <ng-container *ngIf="walletAddress()">

        <!-- CONTEXT SELECTION -->
        <mat-card class="card elevated">
          <mat-card-header>
            <mat-icon class="header-icon" mat-card-avatar>folder_special</mat-icon>
            <mat-card-title>Select Context</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Disclosure Context</mat-label>
              <mat-select
                [ngModel]="selectedContext()"
                (ngModelChange)="onContextChange($event)"
                [disabled]="loadingAttributes() || contexts().length === 0">
                <mat-option value="">-- Choose a context --</mat-option>
                <mat-option *ngFor="let c of contexts()" [value]="c">
                  {{ c | titlecase }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- ATTRIBUTE SELECTION -->
        <mat-card class="card elevated" *ngIf="selectedContext()">
          <mat-card-header>
            <mat-icon class="header-icon" mat-card-avatar>fact_check</mat-icon>
            <mat-card-title>Attributes to Share</mat-card-title>
            <div class="badge" *ngIf="!loadingAttributes() && attributes().length > 0">
              {{ selectedAttributes().length }} selected
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="loading-state" *ngIf="loadingAttributes()">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading attributes...</p>
            </div>

            <div class="attributes-list" *ngIf="!loadingAttributes() && attributes().length > 0">
              <div *ngFor="let attr of attributes()" class="attribute-row">
                <mat-checkbox
                  [checked]="hasActiveConsent(attr) || selectedAttributes().includes(attr)"
                  [disabled]="hasActiveConsent(attr)"
                  (change)="toggleAttribute(attr)">
                  {{ attr | titlecase }}
                </mat-checkbox>
                <span class="small muted" *ngIf="hasActiveConsent(attr)">
                  (Already consented)
                </span>
              </div>
            </div>

            <div class="empty-state" *ngIf="!loadingAttributes() && attributes().length === 0">
              <mat-icon class="empty-icon">inbox</mat-icon>
              <h3>No attributes available</h3>
              <p class="muted">
                No credentials issued yet for <strong>{{ selectedContext() | titlecase }}</strong>.
                Go to <a routerLink="/credentials">Credentials</a> to issue one.
              </p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- PURPOSE & EXPLICIT CONSENT -->
        <mat-card class="card elevated" *ngIf="selectedAttributes().length > 0">
          <mat-card-header>
            <mat-icon class="header-icon" color="warn" mat-card-avatar>privacy_tip</mat-icon>
            <mat-card-title>Purpose & Explicit Consent</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Auto-complete Purpose Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Purpose of Disclosure</mat-label>
              <input matInput [(ngModel)]="purposeValue" 
                    placeholder="e.g., Personal address"
                    [matAutocomplete]="purposeAuto"
                    required />
              
              <!-- Auto-complete panel -->
              <mat-autocomplete #purposeAuto="matAutocomplete">
                <mat-option *ngFor="let claim of filteredSuggestedPurposes()"
                          [value]="claim.purpose">
                 Purpose: {{ claim.purpose }} 
                  <small class="muted"> (Claim Id: {{ claim.claim_id }} ) Context: {{ claim.context }})</small>
                </mat-option>
              </mat-autocomplete>

              <!-- Hint when suggestions exist -->
              <mat-hint *ngIf="suggestedClaims.length > 0">
                Type to filter suggestions from your issued claims
              </mat-hint>
            </mat-form-field>

            <!-- Add this right after the mat-autocomplete block -->
              <mat-hint class="subtle-context-hint" *ngIf="selectedContext() && filteredSuggestedPurposes().length === 0">
                No suggestions available for <strong>{{ selectedContext() | titlecase }}</strong> context yet.
                Issue a VC in this context first.
              </mat-hint>
              
             
            <mat-checkbox
              [checked]="explicitConsent()"
              (change)="explicitConsent.set($event.checked)">
              <strong> I explicitly consent</strong> to sharing the selected attributes from my
              <strong>{{ selectedContext() | titlecase }}</strong> context for the purpose:
              <strong>"{{ purposeValue.trim() || 'not specified' }}"</strong>.
            </mat-checkbox>
            
            <div class="actions">
              <button
                mat-raised-button
                color="primary"
                (click)="grantConsent()"
                [disabled]="!explicitConsent() || !purposeValue.trim() || loading()">
                <mat-icon *ngIf="!loading()">task_alt</mat-icon>
                <mat-spinner diameter="20" *ngIf="loading()"></mat-spinner>
                <span>{{ loading() ? 'Recording...' : 'Grant Consent' }}</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- ACTIVE CONSENTS -->
        <mat-card class="card elevated" *ngIf="selectedContext()">
          <mat-card-header>
            <mat-icon class="header-icon" mat-card-avatar>gavel</mat-icon>
            <mat-card-title>Active Consents for {{ selectedContext() | titlecase }}</mat-card-title>
            <button 
              mat-icon-button 
              (click)="loadActiveConsents()"
              matTooltip="Refresh consents"
              [disabled]="loadingConsents()">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="loading-state" *ngIf="loadingConsents()">
              <mat-spinner diameter="40"></mat-spinner>
            </div>

            <div class="empty-state" *ngIf="!loadingConsents() && activeConsents().length === 0">
              <mat-icon class="empty-icon">assignment_turned_in</mat-icon>
              <h3>No active consents in this context</h3>
            </div>

            <div class="consents-scroll-container" *ngIf="!loadingConsents() && activeConsents().length > 0">
              <div class="consent-entry" *ngFor="let consent of activeConsents()">
                <p><strong>Purpose:</strong> {{ consent.purpose }}</p>
                <p><strong>Attribute:</strong> <code>{{ consent.claimId }}</code></p>
                <p class="small muted">
                  Granted: {{ consent.grantedAt | date:'medium' }}
                </p>
                <p class="small" [class.warn]="isExpired(consent.expiresAt)">
                  {{ getExpiryLabel(consent.expiresAt) }}
                </p>
                <button
                  mat-raised-button
                  color="warn"
                  (click)="confirmAndRevoke(consent)"
                  [disabled]="loading()">
                  <mat-icon>delete_forever</mat-icon>
                  Revoke
                </button>
                <mat-divider class="my-3"></mat-divider>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-container>

      <pre class="debug" *ngIf="result()">{{ result() | json }}</pre>
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
  mat-option {
      line-height: 1.4;
    }
    mat-option small {
      opacity: 0.7;
      font-size: 0.85em;
      margin-left: 8px;
    }
      .subtle-context-hint {
        font-size: 0.85rem;
        color: #757575;
        margin-top: 8px;        /* Increased spacing to avoid crowding checkbox */
        margin-bottom: 16px;    /* Extra breathing room before checkbox */
        opacity: 0.8;
        display: block;         /* Ensures it takes full width and doesn't inline */
      }

`]
})
export class ConsentComponent implements OnInit {
  walletAddress = signal<string | null>(null);
  connecting = signal(false);
  loading = signal(false);
  loadingAttributes = signal(false);
  loadingConsents = signal(false);
  copied = signal(false);

  contexts = signal<string[]>([]);
  attributes = signal<string[]>([]);
  selectedContext = signal<string>('');
  suggestedClaims = signal<any[]>([]);

  purposeValue = '';

  selectedAttributes = signal<string[]>([]);
  explicitConsent = signal<boolean>(false);
  activeConsents = signal<any[]>([]);
  result = signal<any>(null);

 // NEW: Computed for sorted + filtered suggestions (newest first)
  sortedSuggestedClaims = computed(() => {
    const claims = this.suggestedClaims();
    // Reverse to show newest/latest first (assuming backend sends in chronological order)
    return [...claims].reverse();
  })

  filteredSuggestedPurposes = computed(() => {
  const search = this.purposeValue?.toLowerCase().trim() || '';
  const currentContext = this.selectedContext()?.toLowerCase() || '';

  // Get the sorted base list
  let baseList = this.sortedSuggestedClaims();

  // Filter by context if one is selected
  if (currentContext) {
    baseList = baseList.filter(claim =>
      (claim.context || '').toLowerCase() === currentContext
    );
  }

  // Then apply search filter
  if (!search) return baseList;

  return baseList.filter(claim =>
    claim.purpose.toLowerCase().includes(search)
  );
});

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  private wallet = inject(WalletService);
  private contextService = inject(ContextService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  

  ngOnInit() {
    this.wallet.address$.subscribe(addr => {
      this.walletAddress.set(addr);
      if (addr) {
        this.loadSuggestions(); // ← NEW: Load suggestions when wallet is ready
      }
      if (!addr) this.resetForm();
    });

    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts.set(ctxs.sort());
    });
  }

  private resetForm() {
    this.selectedContext.set('');
    this.selectedAttributes.set([]);
    this.purposeValue = '';
    this.explicitConsent.set(false);
    this.activeConsents.set([]);
    this.attributes.set([]);
    this.result.set(null);
  }

  async connectWallet() {
    this.connecting.set(true);
    try {
      await this.wallet.connect();
    } catch (err) {
      this.snackBar.open('Failed to connect wallet', 'Close', { duration: 5000 });
    } finally {
      this.connecting.set(false);
    }
  }

  copyAddress() {
    const addr = this.walletAddress();
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
    this.snackBar.open('Address copied!', 'Close', { duration: 2000 });
  }

  onContextChange(newValue: string) {
    this.selectedContext.set(newValue);
    this.selectedAttributes.set([]);
    this.purposeValue = '';
    this.explicitConsent.set(false);
    this.cdr.detectChanges();
    this.activeConsents.set([]);
    this.result.set(null);

    if (!newValue || !this.walletAddress()) {
      this.attributes.set([]);
      return;
    }

    this.loadAttributesForContext();
    this.loadActiveConsents();
  }

  private loadAttributesForContext() {
    this.loadingAttributes.set(true);
    this.attributes.set([]);

    this.api.getProfile(this.walletAddress()!, this.selectedContext()).subscribe({
      next: (res: any) => {
        this.attributes.set(Object.keys(res.attributes || {}));
        this.loadingAttributes.set(false);
      },
      error: () => {
        this.attributes.set([]);
        this.loadingAttributes.set(false);
        this.snackBar.open('Failed to load attributes', 'Close', { duration: 5000 });
      }
    });
  }

  // 🔥 FIXED: RETURNS A PROMISE SO WE CAN AWAIT UI CONSISTENCY
  loadActiveConsents(): Promise<void> {
    this.loadingConsents.set(true);
    this.activeConsents.set([]);

    let ctx = this.selectedContext();

    return new Promise(resolve => {
      this.api.getActiveConsents(this.walletAddress()!, ctx).subscribe({
        next: (consents: any[]) => {
          this.activeConsents.set(
            consents.map(c => ({
              claimId: c.claimId,
              purpose: c.purpose,
              context: c.context,
              grantedAt: c.grantedAt,
              expiresAt: c.expiresAt ?? null
            }))
          );
          this.loadingConsents.set(false);
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.activeConsents.set([]);
          this.loadingConsents.set(false);
          this.snackBar.open('Failed to load active consents', 'Close', { duration: 5000 });
          resolve();
        }
      });
    });
  }

  hasActiveConsent(claimId: string): boolean {
    const ctx = this.selectedContext();
    return this.activeConsents().some(c =>
      c.claimId === claimId &&
      c.context === ctx &&
      !this.isExpired(c.expiresAt)
    );
  }

  toggleAttribute(attr: string) {
    if (this.hasActiveConsent(attr)) return;

    const current = this.selectedAttributes();
    if (current.includes(attr)) {
      this.selectedAttributes.set(current.filter(a => a !== attr));
    } else {
      this.selectedAttributes.set([...current, attr]);
    }
  }

  async grantConsent() {
    if (this.loading()) return;
    this.loading.set(true);

    try {
      const addr = this.walletAddress();
      if (!addr) throw new Error('Wallet not connected');

      if (this.selectedAttributes().length === 0) {
        this.snackBar.open('Select at least one attribute', 'Close', { duration: 4000 });
        return;
      }

      if (!this.purposeValue.trim()) {
        this.snackBar.open('Please enter a purpose', 'Close', { duration: 4000 });
        return;
      }

      if (!this.explicitConsent()) {
        this.snackBar.open('You must explicitly consent', 'Close', { duration: 4000 });
        return;
      }

      for (const attr of this.selectedAttributes()) {
        if (this.hasActiveConsent(attr)) continue;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await this.api.grantConsent({
          owner: addr,
          claimId: attr,
          purpose: this.purposeValue.trim(),
          context: this.selectedContext(),
          expiresAt: expiresAt.toISOString()
        }).toPromise();
      }

      // 🔥 FIX: WAIT UNTIL SERVER DATA IS LOADED BEFORE UI RESETS
      await this.loadActiveConsents();

      this.selectedAttributes.set([]);
      this.purposeValue = '';
      this.explicitConsent.set(false);

      this.cdr.detectChanges();              // Force immediate update
      setTimeout(() => this.cdr.detectChanges(), 0);

      this.loadAttributesForContext();

      this.snackBar.open('Consent granted successfully!', 'Close', { duration: 5000 });

    } catch (err: any) {
      console.error('Grant consent failed:', err);
      this.snackBar.open(
        err.error?.error || 'Failed to record consent',
        'Close',
        { duration: 6000 }
      );
    } finally {
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  // NEW: Load suggestions when wallet is ready
  loadSuggestions() {
    if (!this.walletAddress()) return;

    const did = `did:ethr:${this.walletAddress()}`;
    this.api.getSuggestableClaims(did).subscribe({
      next: (res: any) => {
        this.suggestedClaims.set(res.suggestableClaims || []);
        this.cdr.detectChanges(); // Ensure UI updates immediately
      },
      error: (err: any) => {
        console.error('Failed to load suggestions:', err);
        this.snackBar.open('Failed to load claim suggestions', 'Close', { duration: 5000 });
      }
    });
  }

  confirmAndRevoke(consent: any) {
    const message = `Are you sure you want to revoke consent for attribute "${consent.claimId}"?\n\nThis action cannot be undone.`;

    if (!confirm(message)) {
      return;
    }

    this.loading.set(true);

    this.api.revokeConsent({
      owner: this.walletAddress()!,
      claimId: consent.claimId,
      context: this.selectedContext()
    }).subscribe({
      next: () => {
        this.snackBar.open(`Consent for ${consent.claimId} revoked successfully`, 'Close', { duration: 5000 });
        this.activeConsents.update(list => list.filter(c => c.claimId !== consent.claimId));
      },
      error: (err) => {
        console.error('Revoke failed:', err);
        this.snackBar.open('Failed to revoke consent', 'Close', { duration: 5000 });
      },
      complete: () => this.loading.set(false)
    });
  }

  isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  }

  getExpiryLabel(expiresAt: string | null): string {
    if (!expiresAt) return 'No expiration';
    if (this.isExpired(expiresAt)) return 'Expired';

    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  }
}

