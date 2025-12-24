/** 
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { ContextService } from '../services/context.service';


@Component({
  selector: 'app-contexts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Contexts</h2>

    <!-- Context selector -->
    <section class="card">
      <label class="muted">Select context</label>

      <select
        class="input"
        [(ngModel)]="currentContext"
        (change)="loadContext()"
      >
        <option value="">-- Select context --</option>
        <option *ngFor="let ctx of contexts" [value]="ctx">
          {{ ctx | titlecase }}
        </option>
      </select>
    </section>

    <!-- Add custom context -->
    <section class="card">
      <label class="muted">Add custom context</label>

      <div class="row">
        <input
          class="input"
          [(ngModel)]="newContext"
          placeholder="e.g. health, religious, online"
        />
        <button class="btn-secondary" (click)="addContext()">
          Add
        </button>
      </div>

      <p class="small muted">
        Contexts define which attributes are visible and shared.
      </p>
    </section>

    <!-- Profile with attributes -->
<section class="card" *ngIf="hasAttributes()">
  <h3>{{ currentContext | titlecase }} Profile</h3>

  <div *ngFor="let key of attributeKeys()">
    <label class="muted">{{ key }}</label>
    <input
      class="input"
      [value]="profile[key]"
      disabled
    />
  </div>
</section>

<!-- Empty context state -->
<section
  class="card muted"
  *ngIf="profile && !hasAttributes() && !loading"
>
  No credentials or attributes added yet.
</section>

    <!-- Empty state -->
    <section class="card muted" *ngIf="!profile && currentContext && !loading">
      No attributes found for this context.
    </section>

    <p class="small muted" *ngIf="loading">Loading context…</p>
  `,
  styles: [`
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      max-width: 520px;
      box-shadow: 0 2px 6px rgba(0,0,0,.05);
    }
    .input {
      width: 100%;
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .row {
      display: flex;
      gap: 8px;
    }
    .btn-secondary {
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: #e3f2fd;
      color: #1976d2;
      cursor: pointer;
      white-space: nowrap;
    }
    .muted { color: #666; }
    .small { font-size: 0.9em; }
  `]
})
export class ContextsComponent {
  // Default + user-defined contexts
  contexts: string[] = [];

  currentContext = '';
  newContext = '';

  profile: any = null;
  loading = false;

  constructor(
    private api: ApiService,
    public wallet: WalletService,
    private contextService: ContextService
  ) {this.contextService.contexts$.subscribe(ctxs => {
    this.contexts = ctxs;
  });
}

  addContext() {
    const ctx = this.newContext.trim().toLowerCase();
    if (!ctx) return;

    if (this.contexts.includes(ctx)) {
      alert('Context already exists');
      return;

    }

  this.contextService.addContext(ctx);

  this.currentContext = ctx.toLowerCase();
  this.newContext = '';
  this.profile = null;

    this.loadContext();
  }

  loadContext() {
    if (!this.wallet.address || !this.currentContext) return;

    this.loading = true;
    this.profile = null;

    this.api
      .getProfileByContext(this.wallet.address, this.currentContext)
      .subscribe({
        next: (res: any) => {
          this.profile = res.attributes;
          this.loading = false;
        },
        error: () => {
          this.profile = null;
          this.loading = false;
        }
      });
  }

  attributeKeys() {
    return this.profile ? Object.keys(this.profile) : [];
  }

  hasAttributes(): boolean {
  return this.profile && Object.keys(this.profile).length > 0;
}

}
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { ContextService } from '../services/context.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-contexts',
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
    MatTooltipModule
  ],
  template: `
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
        <a routerLink="/credentials">Credentials</a> tab and assign it to
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
  `,
  styles: [`
    .contexts-header {
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
      max-width: 680px;
      margin: 0 auto;
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      max-width: 720px;
      transition: all 0.3s ease;
    }

    .elevated {
      box-shadow: 0 8px 28px rgba(0,0,0,0.08);
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .header-icon {
      font-size: 28px;
      width: 48px;
      height: 48px;
      background: rgba(99, 102, 241, 0.1);
      color: #6366f1;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
    }

    .badge {
      margin-left: auto;
      padding: 4px 12px;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 8px;
    }

    .add-context-row {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }

    .add-context-row mat-form-field {
      flex: 1;
      min-width: 260px;
    }

    .attributes-grid {
      display: grid;
      gap: 16px;
    }

    .attribute-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .attribute-label {
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 500;
    }

    .attribute-value {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .attribute-value code {
      flex: 1;
      font-family: 'Courier New', monospace;
      color: #1e40af;
      word-break: break-all;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 64px;
      width: 80px;
      height: 80px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      color: #475569;
      margin: 16px 0;
    }

    .empty-state p {
      max-width: 500px;
      margin: 0 auto 16px auto;
    }

    .empty-state a {
      color: #6366f1;
      text-decoration: underline;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
      color: #64748b;
    }

    .small { font-size: 0.9rem; }
    .muted { color: #64748b; }
  `]
})
export class ContextsComponent implements OnInit, OnDestroy {
  contexts: string[] = [];
  currentContext = '';
  newContext = '';
  profile: any = null;
  loading = false;
  copiedKey: string | null = null;

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