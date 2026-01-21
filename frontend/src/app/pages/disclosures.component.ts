import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';


// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-disclosures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="disclosures-page" [class.dark]="darkMode()">
      <!-- Header -->
      <div class="page-header">
        <h1>Disclosure History</h1>
        <p class="subtitle">
          Track every time your data was shared — who, when, why, and with what consent.
        </p>
      </div>

      <!-- Wallet Status Card -->
      <mat-card class="wallet-card glass-card" appearance="outlined">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>shield</mat-icon>
          <mat-card-title>Your Identity</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <ng-container *ngIf="wallet.address; else connectPrompt">
            <div class="connected-state">
              <div class="did-display">
                <strong>Subject DID</strong>
                <code>did:ethr:{{ wallet.address | slice:0:8 }}…{{ wallet.address | slice:-6 }}</code>
                <button mat-icon-button (click)="copyDid()" matTooltip="Copy DID">
                  <mat-icon>{{ copied ? 'check_circle' : 'content_copy' }}</mat-icon>
                </button>
              </div>
              <div class="status-pill success">
                <mat-icon>check_circle</mat-icon>
                Wallet connected — disclosures loaded
              </div>
            </div>
          </ng-container>

          <ng-template #connectPrompt>
            <div class="connect-prompt">
              <mat-icon class="prompt-icon">wallet</mat-icon>
              <h3>Wallet Required</h3>
              <p class="muted">
                Connect your wallet to view your full disclosure history.
              </p>
             <button mat-raised-button color="primary" (click)="connect()" [disabled]="connecting">
              <mat-icon *ngIf="!connecting">wallet</mat-icon>
              <mat-spinner *ngIf="connecting" diameter="20"></mat-spinner>
              {{ connecting ? 'Connecting...' : 'Connect Wallet' }}
            </button>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Main Table Card -->
      <mat-card class="table-card glass-card" appearance="outlined" *ngIf="wallet.address">
        <mat-card-header>
          <mat-icon class="header-icon" mat-card-avatar>history</mat-icon>
          <mat-card-title>Disclosure Records</mat-card-title>
          <div class="record-badge" *ngIf="total > 0">
            {{ total }} {{ total === 1 ? 'record' : 'records' }}
          </div>
        </mat-card-header>

        <mat-card-content>
          <!-- Filter Bar -->
          <div class="filter-bar">
            <mat-form-field appearance="outline" class="filter-input">
              <mat-label>Filter by Context</mat-label>
              <input matInput [(ngModel)]="contextFilterValue" placeholder="e.g. profile, kyc, identity">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="applyFilter()" class="filter-btn">
              Apply Filter
            </button>
            <button mat-stroked-button (click)="clearFilter()" class="clear-btn">
              Clear
            </button>
          </div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <mat-spinner diameter="56"></mat-spinner>
            <div class="state-text">
              <h3>Loading history...</h3>
              <p class="muted">Fetching your disclosure records</p>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!loading && disclosures.length === 0">
            <mat-icon class="empty-icon">privacy_tip</mat-icon>
            <h3>No disclosures yet</h3>
            <p class="muted">
              Your data remains private — no verifiers have accessed it.
            </p>
          </div>

          <!-- Table -->
          <div class="table-scroll" *ngIf="!loading && disclosures.length > 0">
            <table mat-table [dataSource]="disclosures" class="disclosure-table">
              <!-- Verifier -->
              <ng-container matColumnDef="verifier">
                <th mat-header-cell *matHeaderCellDef>Verifier</th>
                <td mat-cell *matCellDef="let d">
                  <code class="verifier-did">{{ d.verifier_did || 'Unknown' }}</code>
                </td>
              </ng-container>

              <!-- Claim -->
              <ng-container matColumnDef="claim">
                <th mat-header-cell *matHeaderCellDef>Claim</th>
                <td mat-cell *matCellDef="let d">{{ d.claim_id || '—' }}</td>
              </ng-container>

              <!-- Context -->
              <ng-container matColumnDef="context">
                <th mat-header-cell *matHeaderCellDef>Context</th>
                <td mat-cell *matCellDef="let d">
                  <span class="context-badge">{{ d.context || '—' }}</span>
                </td>
              </ng-container>

              <!-- Purpose -->
              <ng-container matColumnDef="purpose">
                <th mat-header-cell *matHeaderCellDef>Purpose</th>
                <td mat-cell *matCellDef="let d">
                  <span class="purpose">{{ d.purpose || 'General' }}</span>
                </td>
              </ng-container>

              <!-- Consent -->
              <ng-container matColumnDef="consent">
                <th mat-header-cell *matHeaderCellDef>Consent</th>
                <td mat-cell *matCellDef="let d">
                  <mat-icon [color]="d.consent ? 'primary' : 'warn'" matTooltip="Consent given: {{ d.consent ? 'Yes' : 'No' }}">
                    {{ d.consent ? 'check_circle' : 'cancel' }}
                  </mat-icon>
                </td>
              </ng-container>

              <!-- Date -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let d">
                  {{ d.disclosed_at | date:'mediumDate' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination" *ngIf="total > limit">
            <button mat-icon-button (click)="prevPage()" [disabled]="offset === 0">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">
              {{ offset + 1 }} – {{ Math.min(offset + limit, total) }} of {{ total }}
            </span>
            <button mat-icon-button (click)="nextPage()" [disabled]="offset + limit >= total">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>

          <!-- Export -->
          <div class="export-area" *ngIf="total > 0">
            <button mat-raised-button color="accent" (click)="exportDisclosures()" class="export-btn">
              <mat-icon>download</mat-icon>
              Export Full Report (JSON)
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,

  styles: [`
    :host { display: block; min-height: 100vh; }

    .disclosures-page {
      padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 64px);
      max-width: 1200px;
      margin: 0 auto;
      transition: background 0.6s ease;
    }

    .disclosures-page.dark {
      background: linear-gradient(to bottom, #0f0f1a, #0a0a14);
      color: #e2e8f0;
    }

    /* Header */
    .page-header {
      text-align: center;
      margin-bottom: clamp(32px, 6vw, 64px);
    }

    .page-header h1 {
      font-size: clamp(2.2rem, 5.5vw, 3.8rem);
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px;
    }

    .subtitle {
      font-size: 1.15rem;
      color: #94a3b8;
      max-width: 720px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Wallet Card */
    .wallet-card {
      border-radius: 24px;
      background: rgba(255,255,255,0.78);
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(226,232,240,0.4);
      margin-bottom: 32px;
    }

    .disclosures-page.dark .wallet-card {
      background: rgba(30,41,59,0.48);
      border-color: rgba(100,116,139,0.3);
    }

    .header-icon {
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      color: white;
      border-radius: 14px;
    }

    .connected-state {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .did-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: rgba(226,232,240,0.4);
      border-radius: 14px;
    }

    .disclosures-page.dark .did-display {
      background: rgba(30,41,59,0.55);
    }

    .did-display code {
      font-family: 'JetBrains Mono', monospace;
      color: #1d4ed8;
      font-size: 1rem;
    }

    .disclosures-page.dark .did-display code {
      color: #c7d2fe;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 999px;
      font-size: 0.95rem;
    }

    .status-pill.success {
      background: rgba(34,197,94,0.15);
      color: #166534;
    }

    .disclosures-page.dark .status-pill.success {
      background: rgba(34,197,94,0.25);
      color: #86efac;
    }

    .connect-prompt {
      text-align: center;
      padding: 48px 24px;
      color: #94a3b8;
    }

    .prompt-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
      opacity: 0.7;
    }

    /* Table Card */
    .table-card {
      border-radius: 24px;
      background: rgba(255,255,255,0.78);
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(226,232,240,0.4);
      overflow: hidden;
    }

    .disclosures-page.dark .table-card {
      background: rgba(30,41,59,0.48);
      border-color: rgba(100,116,139,0.3);
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-input {
      flex: 1;
      min-width: 240px;
    }

    .filter-btn {
      height: 56px;
    }

    .clear-btn {
      height: 56px;
    }

    .table-scroll {
      max-height: 520px;
      overflow-y: auto;
      overflow-x: auto;
      border-radius: 12px;
    }

    /* Table */
    .disclosure-table {
      width: 100%;
    }

    .disclosure-table th {
      background: rgba(226,232,240,0.5);
      color: #1e293b;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 14px 16px;
    }

    .disclosures-page.dark .disclosure-table th {
      background: rgba(30,41,59,0.8);
      color: #f1f5f9;
    }

    .disclosure-table td {
      padding: 16px;
      vertical-align: middle;
      border-bottom: 1px solid rgba(226,232,240,0.3);
    }

    .disclosures-page.dark .disclosure-table td {
      border-bottom-color: rgba(100,116,139,0.3);
    }

    .verifier-did {
      font-family: 'JetBrains Mono', monospace;
      color: #1d4ed8;
    }

    .disclosures-page.dark .verifier-did {
      color: #c7d2fe;
    }

    .context-badge,
    .purpose {
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .context-badge {
      background: rgba(99,102,241,0.1);
      color: #6366f1;
    }

    .disclosures-page.dark .context-badge {
      background: rgba(99,102,241,0.2);
      color: #a5b4fc;
    }

    .purpose {
      background: rgba(99,102,241,0.08);
      color: #4f46e5;
    }

    .disclosures-page.dark .purpose {
      background: rgba(99,102,241,0.15);
      color: #c7d2fe;
    }

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
      padding: 16px;
    }

    .page-info {
      font-weight: 500;
      color: #64748b;
    }

    .disclosures-page.dark .page-info {
      color: #94a3b8;
    }

    /* Export */
    .export-area {
      text-align: right;
      margin-top: 32px;
    }

    .export-btn {
      height: 56px;
      font-size: 1rem;
    }

    /* Loading / Empty */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 100px 0;
    }

    .state-text h3 {
      margin: 0 0 8px;
      color: #1e293b;
    }

    .disclosures-page.dark .state-text h3 {
      color: #f1f5f9;
    }

    .empty-state {
      text-align: center;
      padding: 100px 32px;
    }

    .empty-icon {
      font-size: 96px;
      height: 96px;
      width: 96px;
      color: #94a3b8;
      margin-bottom: 24px;
    }

    .empty-state h3 {
      color: #1e293b;
      margin: 0 0 12px;
    }

    .disclosures-page.dark .empty-state h3 {
      color: #f1f5f9;
    }
      /* Dark mode Material fixes */
  .disclosures-page.dark {
    .mat-mdc-form-field-label,
    .mat-mdc-form-field-hint,
    .mat-mdc-input-element::placeholder {
      color: #94a3b8 !important;
      opacity: 1 !important;
    }

    .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: #a5b4fc !important;
    }

    .mat-mdc-input-element {
      color: #f1f5f9 !important;
    }
  }

    /* Responsive */
    @media (max-width: 960px) {
      .disclosures-page { padding: 32px 32px 80px; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .filter-input { width: 100%; }
    }

    @media (max-width: 600px) {
      .page-header h1 { font-size: 2.4rem; }
      .table-scroll { max-height: 400px; }
    }
  `]
})
export class DisclosuresComponent implements OnInit {
  disclosures: any[] = [];
  displayedColumns: string[] = ['verifier', 'claim', 'context', 'purpose', 'consent', 'date'];

  /** Signals + ngModel bridge */
  contextFilter = signal<string>('');
  contextFilterValue = ''; // ← used for ngModel

  /** Pagination */
  limit = 25;
  offset = 0;
  total = 0;

  /** UI State */
  loading = false;
  connecting = false;
  copied = false;
  Math = Math; // ← fixes template Math.min error

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  constructor(
    public wallet: WalletService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.wallet.address$.subscribe(addr => {
      if (addr) {
        this.resetPaging();
        this.loadDisclosures();
      } else {
        this.disclosures = [];
      }
    });
  }

  async connect() {
    this.connecting = true;
    try {
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || 'Wallet connection failed');
    } finally {
      this.connecting = false;
    }
  }

  copyDid() {
    if (!this.wallet.address) return;
    const did = `did:ethr:${this.wallet.address}`;
    navigator.clipboard.writeText(did);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  resetPaging() {
    this.offset = 0;
    this.total = 0;
  }

  applyFilter() {
    this.contextFilter.set(this.contextFilterValue);
    this.offset = 0;
    this.loadDisclosures();
  }

  clearFilter() {
    this.contextFilter.set('');
    this.contextFilterValue = '';
    this.offset = 0;
    this.loadDisclosures();
  }

  loadDisclosures() {
    if (!this.wallet.address) return;

    this.loading = true;
    const did = `did:ethr:${this.wallet.address}`;
    const context = this.contextFilter().trim() || undefined;

    this.api.getDisclosuresBySubject(did, this.limit, this.offset, context).subscribe({
      next: (res: any) => {
        this.disclosures = res.rows || res.disclosures || [];
        this.total = res.totalDisclosures || res.total || this.disclosures.length;
        
        this.loading = false;
      }
    });
  }

  nextPage() {
    if (this.offset + this.limit < this.total) {
      this.offset += this.limit;
      this.loadDisclosures();
    }
  }

  prevPage() {
    if (this.offset > 0) {
      this.offset -= this.limit;
      this.loadDisclosures();
    }
  }

  exportDisclosures() {
    if (!this.wallet.address) return;

    const did = `did:ethr:${this.wallet.address}`;
    this.api.exportDisclosures(did).subscribe({
      next: (bundle) => {
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `disclosure-report-${this.wallet.address?.substring(0, 8)}-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to export disclosures')
    });
  }
}

