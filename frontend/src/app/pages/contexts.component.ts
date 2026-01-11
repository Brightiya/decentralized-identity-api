import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { ContextService } from '../services/context.service';
import { RouterModule } from '@angular/router';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-contexts',
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
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
  <div class="contexts-container" [class.dark]="darkMode()">
    <div class="contexts-header">
      <h1>Contexts</h1>
      <p class="subtitle">
        Manage selective disclosure contexts. Each context controls which attributes are visible when sharing your identity.
      </p>
    </div>

    <!-- Context Selector -->
    <section class="card elevated">
      <div class="card-header">
        <mat-icon class="header-icon">folder_special</mat-icon>
        <h3>Select Context</h3>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Active Context</mat-label>
        <mat-select
          [(ngModel)]="currentContext"
          (selectionChange)="loadContext()"
          [disabled]="loading || contexts.length === 0">
          <mat-option value="">-- Select a context --</mat-option>
          <mat-option *ngFor="let ctx of contexts" [value]="ctx">
            {{ ctx | titlecase }}
          </mat-option>
        </mat-select>
        <mat-icon matSuffix>arrow_drop_down</mat-icon>
      </mat-form-field>

      <div class="hint" *ngIf="!currentContext && contexts.length > 0">
        <mat-icon inline>info</mat-icon>
        Choose a context to view its associated attributes
      </div>
    </section>

    <!-- Add Custom Context -->
    <section class="card elevated">
      <div class="card-header">
        <mat-icon class="header-icon">add_circle_outline</mat-icon>
        <h3>Create New Context</h3>
      </div>

      <div class="add-context-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>New context name</mat-label>
          <input
            matInput
            [(ngModel)]="newContext"
            placeholder="e.g. health, finance, gaming"
            (keyup.enter)="addContext()"
          />
          <mat-hint>Lowercase, no spaces (use hyphens if needed)</mat-hint>
        </mat-form-field>

        <button
          mat-raised-button
          color="primary"
          (click)="addContext()"
          [disabled]="!newContext.trim()">
          <mat-icon>add</mat-icon>
          Add Context
        </button>
      </div>

      <p class="small muted">
        Contexts define which attributes are visible and shared during verification.
      </p>
    </section>

    <!-- Attributes Display -->
    <section class="card elevated" *ngIf="hasAttributes()">
      <div class="card-header">
        <mat-icon class="header-icon" color="primary">badge</mat-icon>
        <h3>{{ currentContext | titlecase }} Attributes</h3>
        <span class="badge">{{ attributeKeys().length }} attribute{{ attributeKeys().length === 1 ? '' : 's' }}</span>
      </div>

      <div class="attributes-grid">
        <div class="attribute-item" *ngFor="let key of attributeKeys()">
          <label class="attribute-label">{{ key | titlecase }}</label>
          <div class="attribute-value">
            <code>{{ profile[key] }}</code>
            <button mat-icon-button (click)="copyToClipboard(profile[key])" matTooltip="Copy value">
              <mat-icon>{{ copiedKey === key ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty States -->
    <section class="card elevated empty-state" *ngIf="currentContext && !loading && !hasAttributes()">
      <mat-icon class="empty-icon">inbox</mat-icon>
      <h3>No attributes yet</h3>
      <p class="muted">
        This context is empty. Issue a credential in the
        <a routerLink="/credentials">Credentials</a> page and assign it to
        <strong>{{ currentContext }}</strong> to see attributes here.
      </p>
    </section>

    <section class="card elevated empty-state" *ngIf="!currentContext && contexts.length > 0 && !loading">
      <mat-icon class="empty-icon">arrow_forward</mat-icon>
      <h3>Select a context</h3>
      <p class="muted">Choose a context from the dropdown above to view its attributes.</p>
    </section>

    <section class="card elevated empty-state" *ngIf="contexts.length === 0 && !loading">
      <mat-icon class="empty-icon">create_new_folder</mat-icon>
      <h3>No contexts created</h3>
      <p class="muted">Start by adding your first custom context above.</p>
    </section>

    <!-- Loading State -->
    <div class="loading-overlay" *ngIf="loading">
      <mat-spinner diameter="48"></mat-spinner>
      <p>Loading context attributes...</p>
    </div>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .contexts-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .contexts-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .contexts-header {
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
    padding: 32px;
    margin-bottom: 32px;
    border: 1px solid var(--card-border, #e2e8f0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .contexts-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .contexts-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .contexts-container.dark .card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
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

  .contexts-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
  }

  .contexts-container.dark .card-header h3 {
    color: #f1f5f9;
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

  .contexts-container.dark .badge {
    background: rgba(99,102,241,0.2);
    color: #a5b4fc;
  }

  /* Form Fields */
  .full-width {
    width: 100%;
    margin-bottom: 20px;
  }

  .add-context-row {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .add-context-row mat-form-field {
    flex: 1;
    min-width: 300px;
  }

  /* Attributes Grid */
  .attributes-grid {
    display: grid;
    gap: 20px;
  }

  .attribute-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .attribute-label {
    font-size: 0.95rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .contexts-container.dark .attribute-label {
    color: #cbd5e1;
  }

  .attribute-value {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--code-bg, #f8fafc);
    padding: 14px 18px;
    border-radius: 14px;
    border: 1px solid var(--card-border, #e2e8f0);
  }

  .contexts-container.dark .attribute-value {
    background: rgba(30,41,59,0.6);
    border-color: #4b5563;
  }

  .attribute-value code {
    flex: 1;
    font-family: 'Courier New', monospace;
    color: #1d4ed8;
    word-break: break-all;
    font-size: 0.98rem;
  }

  .contexts-container.dark .attribute-value code {
    color: #c7d2fe;
  }

  /* Empty States */
  .empty-state {
    text-align: center;
    padding: 64px 32px;
    border-radius: 20px;
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
    margin: 0 auto 16px;
    font-size: 1.05rem;
  }

  .empty-state a {
    color: #6366f1;
    text-decoration: underline;
    font-weight: 500;
  }

  .contexts-container.dark .empty-state a {
    color: #a5b4fc;
  }

  /* Loading Overlay */
  .loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 64px 0;
    color: var(--text-secondary);
  }

  .contexts-container.dark .loading-overlay {
    color: #cbd5e1;
  }

  /* Hints & Misc */
  .hint {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin-top: 12px;
  }

  .small { font-size: 0.9rem; }
  .muted { color: var(--text-secondary); }

  /* Dark mode Material form fixes (labels, hints, inputs, select) */
  .contexts-container.dark {
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
  }
    /* Stepped responsive scaling for 960 → 480 → 320 */

/* Tablets & small laptops (≤960px) */
@media (max-width: 960px) {
  .contexts-container {
    padding-bottom: 60px;
  }

  .add-context-row mat-form-field {
    min-width: 200px; /* so they don’t overflow */
  }
}

/* Phones (≤480px) */
@media (max-width: 480px) {
  /* Disable hover transforms on touch */
  .card:hover {
    transform: none;
  }

  .contexts-container {
    padding: 24px 20px 60px;
  }

  .card {
    padding: 20px;
  }

  .card-header {
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .badge {
    margin-left: 0;
    margin-top: 8px;
  }

  /* Form controls stack cleanly */
  .add-context-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .add-context-row mat-form-field {
    width: 100% !important;
    min-width: 0 !important;
  }

  .full-width,
  mat-form-field {
    width: 100% !important;
  }

  /* Attributes grid becomes compact */
  .attributes-grid {
    gap: 12px;
  }

  .attribute-value {
    padding: 10px 12px;
  }

  .empty-state {
    padding: 40px 20px;
  }

  .empty-state p {
    font-size: 1rem;
  }

  /* Typography scale down slightly */
  h1 {
    font-size: clamp(1.3rem, 4vw + 1rem, 2.8rem);
  }

  .subtitle {
    font-size: clamp(1.3rem, 4vw + 1rem, 2.8rem);
  }
}

/* Very small phones (≤320px) */
@media (max-width: 320px) {
  button,
  .badge {
    font-size: 0.8rem;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 24px;
  }

  .card {
    padding: 16px;
  }

  h1 {
    font-size: clamp(1.3rem, 4vw + 1rem, 2.8rem);
  }

  .empty-state {
    padding: 32px 12px;
  }

  .attribute-value code {
    font-size: 0.85rem;
  }
}

`]
})
export class ContextsComponent implements OnInit, OnDestroy {
  contexts: string[] = [];
  currentContext = '';
  newContext = '';
  profile: any = null;
  loading = false;
  copiedKey: string | null = null;
  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  constructor(
    private api: ApiService,
    public wallet: WalletService,
    private contextService: ContextService
  ) {}

  ngOnInit() {
    this.contextService.contexts$.subscribe(ctxs => {
      this.contexts = ctxs.sort(); // optional: alphabetical sort
    });
  }

  ngOnDestroy() {
    // No subscription to unsubscribe currently
  }

  addContext() {
    let ctx = this.newContext.trim().toLowerCase();
    if (!ctx) return;

    // Basic validation: alphanumeric + hyphens
    if (!/^[a-z0-9-]+$/.test(ctx)) {
      alert('Context name must contain only lowercase letters, numbers, and hyphens.');
      return;
    }

    if (this.contexts.includes(ctx)) {
      alert('Context already exists');
      return;
    }

    this.contextService.addContext(ctx);
    this.currentContext = ctx;
    this.newContext = '';
    this.loadContext();
  }

  loadContext() {
    if (!this.wallet.address || !this.currentContext) {
      this.profile = null;
      return;
    }

    this.loading = true;
    this.profile = null;

    this.api.getProfileByContext(this.wallet.address, this.currentContext).subscribe({
      next: (res: any) => {
        this.profile = res.attributes || {};
        this.loading = false;
      },
      error: () => {
        this.profile = null;
        this.loading = false;
      }
    });
  }

  attributeKeys(): string[] {
    return this.profile ? Object.keys(this.profile) : [];
  }

  hasAttributes(): boolean {
    return this.profile && Object.keys(this.profile).length > 0;
  }

  copyToClipboard(value: string, key?: string) {
    navigator.clipboard.writeText(value);
    if (key) {
      this.copiedKey = key;
      setTimeout(() => this.copiedKey = null, 1500);
    }
  }
}