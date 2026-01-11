import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-disclosures',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  template: `
  <div class="disclosures-container" [class.dark]="darkMode()">
    <div class="disclosures-header">
      <h1>Disclosure History</h1>
      <p class="subtitle">
        View all past verifiable credential disclosures, including who accessed your data and for what purpose.
      </p>
    </div>

    <!-- Wallet Connection Card -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>account_balance_wallet</mat-icon>
        <mat-card-title>Identity</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <ng-container *ngIf="wallet.address; else connectPrompt">
          <div class="connected-state">
            <div class="did-display">
              <strong>Subject DID:</strong>
              <code>did:ethr:{{ wallet.address }}</code>
              <button mat-icon-button (click)="copyDid()" matTooltip="Copy DID">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <p class="status success">
              <mat-icon inline>check_circle</mat-icon>
              Wallet connected — disclosure log loaded
            </p>
          </div>
        </ng-container>

        <ng-template #connectPrompt>
          <p class="muted">
            Connect your wallet to view your disclosure history.
          </p>
          <button mat-raised-button color="primary" (click)="connect()" [disabled]="connecting">
            <mat-icon *ngIf="!connecting">wallet</mat-icon>
            <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
          </button>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <!-- Disclosure Table -->
    <mat-card class="card elevated table-card" appearance="outlined" *ngIf="wallet.address">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>history</mat-icon>
        <mat-card-title>Disclosure Records</mat-card-title>
        <div class="badge" *ngIf="disclosures.length > 0">
          {{ disclosures.length }} record{{ disclosures.length === 1 ? '' : 's' }}
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Loading State -->
        <div class="loading-state" *ngIf="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading disclosure history...</p>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!loading && disclosures.length === 0">
          <mat-icon class="empty-icon">privacy_tip</mat-icon>
          <h3>No disclosures yet</h3>
          <p class="muted">
            Your data has not been shared with any verifier. Privacy preserved!
          </p>
        </div>

        <!-- Scrollable Table Wrapper -->
        <div class="table-scroll" *ngIf="!loading && disclosures.length > 0">
          <table mat-table [dataSource]="disclosures" class="disclosure-table">

            <!-- Verifier Column -->
            <ng-container matColumnDef="verifier">
              <th mat-header-cell *matHeaderCellDef>Verifier</th>
              <td mat-cell *matCellDef="let d">
                <code class="verifier-did">{{ d.verifier_did || 'Unknown' }}</code>
              </td>
            </ng-container>

            <!-- Claim Column -->
            <ng-container matColumnDef="claim">
              <th mat-header-cell *matHeaderCellDef>Claim</th>
              <td mat-cell *matCellDef="let d">
                {{ d.claim_id || '—' }}
              </td>
            </ng-container>

            <!-- Context Column -->
            <ng-container matColumnDef="context">
              <th mat-header-cell *matHeaderCellDef>Context</th>
              <td mat-cell *matCellDef="let d">
                <span class="context-badge">{{ d.context }}</span>
              </td>
            </ng-container>

            <!-- Purpose Column -->
            <ng-container matColumnDef="purpose">
              <th mat-header-cell *matHeaderCellDef>Purpose</th>
              <td mat-cell *matCellDef="let d">
                <span class="purpose">{{ d.purpose || 'General' }}</span>
              </td>
            </ng-container>

            <!-- Consent Column -->
            <ng-container matColumnDef="consent">
              <th mat-header-cell *matHeaderCellDef>Consent</th>
              <td mat-cell *matCellDef="let d">
                <mat-icon
                  [color]="d.consent ? 'primary' : 'warn'"
                  matTooltip="{{ d.consent ? 'Consent granted' : 'Consent denied' }}">
                  {{ d.consent ? 'check_circle' : 'cancel' }}
                </mat-icon>
              </td>
            </ng-container>

            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let d">
                {{ d.disclosed_at | date:'medium' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <!-- Export Button -->
        <div class="actions" *ngIf="disclosures.length > 0">
          <button mat-raised-button color="accent" (click)="exportDisclosures()">
            <mat-icon>download</mat-icon>
            Download Disclosure Report (JSON)
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .disclosures-container {
    padding: 32px 40px 80px;
    max-width: 1200px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .disclosures-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .disclosures-header {
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

  .disclosures-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .disclosures-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .disclosures-container.dark .card:hover {
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

  .disclosures-container.dark .header-icon {
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

  .disclosures-container.dark .badge {
    background: rgba(99,102,241,0.2);
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

  .disclosures-container.dark .did-display {
    background: rgba(30,41,59,0.6);
  }

  .did-display code {
    flex: 1;
    color: #1d4ed8;
    font-family: 'Courier New', monospace;
  }

  .disclosures-container.dark .did-display code {
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

  .disclosures-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  /* Table Card */
  .table-card {
    overflow: hidden;
  }

  .table-scroll {
    max-height: 500px;                    /* Adjust as needed — 500px is comfortable */
    overflow-y: auto;
    overflow-x: auto;
    border-radius: 12px;
    scroll-behavior: smooth;
  }

  /* Custom scrollbar styling */
  .table-scroll::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .table-scroll::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }

  .table-scroll::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 10px;
  }

  .disclosures-container.dark .table-scroll::-webkit-scrollbar-thumb {
    background: #6b7280;
  }

  .table-scroll::-webkit-scrollbar-thumb:hover {
    background: #6366f1;
  }

  /* Table */
  .disclosure-table {
    width: 100%;
    border-collapse: collapse;
  }

  .disclosure-table th {
    font-weight: 600;
    color: var(--text-primary);
    background: var(--card-bg, white);
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 12px 16px;
    text-align: left;
    font-size: 0.92rem;
    border-bottom: 1px solid var(--card-border);
  }

  .disclosures-container.dark .disclosure-table th {
    background: rgba(30,41,59,0.85);
    color: #f1f5f9;
    border-bottom-color: #2d2d44;
  }

  .disclosure-table td {
    padding: 14px 16px;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--card-border);
    vertical-align: middle;
  }

  .disclosures-container.dark .disclosure-table td {
    border-bottom-color: #2d2d44;
  }

  .verifier-did {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: #1d4ed8;
    word-break: break-all;
  }

  .disclosures-container.dark .verifier-did {
    color: #c7d2fe;
  }

  .context-badge,
  .purpose {
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .context-badge {
    background: var(--badge-bg, #eef2ff);
    color: #6366f1;
  }

  .disclosures-container.dark .context-badge {
    background: rgba(99,102,241,0.2);
    color: #a5b4fc;
  }

  .purpose {
    background: #f3f4f6;
    color: #4b5563;
  }

  .disclosures-container.dark .purpose {
    background: rgba(255,255,255,0.08);
    color: #cbd5e1;
  }

  /* Actions */
  .actions {
    margin-top: 24px;
    text-align: right;
  }

  /* Empty / Loading States */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 80px 0;
    color: var(--text-secondary);
    min-height: 300px;
  }

  .disclosures-container.dark .loading-state {
    color: #cbd5e1;
  }

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
  .disclosures-container.dark {
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
    /***********************
 * <= 960px (Tablet / Small Laptop)
 ***********************/
@media (max-width: 960px) {
  .disclosures-container {
    padding: 24px 24px 60px;
    max-width: 1000px;
  }

  h1 {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1.05rem;
  }

  .table-scroll {
    max-height: 420px;
  }
}

/***********************
 * <= 480px (Phones)
 ***********************/
@media (max-width: 480px) {
  /* Remove hover transforms */
  .card:hover {
    transform: none;
    box-shadow: none;
  }

  .disclosures-container {
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

  .badge {
    font-size: 0.8rem;
    padding: 4px 10px;
  }

  .did-display {
    flex-direction: column;
    align-items: stretch;
    font-size: 0.9rem;
  }

  .status.success {
    font-size: 0.9rem;
    padding: 12px;
  }

  .table-scroll {
    max-height: 320px;
  }

  .disclosure-table th,
  .disclosure-table td {
    padding: 10px 12px;
    font-size: 0.85rem;
  }

  .verifier-did {
    font-size: 0.8rem;
  }

  .context-badge,
  .purpose {
    font-size: 0.75rem;
    padding: 3px 10px;
  }

  .actions {
    text-align: center;
  }

  .actions button {
    width: 100%;
  }

  .empty-state {
    padding: 60px 20px;
  }

  .empty-icon {
    font-size: 64px;
    width: 82px;
    height: 82px;
  }
}

/***********************
 * <= 320px (Very small phones)
 ***********************/
@media (max-width: 320px) {
  h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .header-icon {
    width: 38px;
    height: 38px;
    font-size: 22px;
  }

  .badge {
    font-size: 0.7rem;
    padding: 3px 8px;
  }

  .did-display {
    padding: 10px 12px;
    font-size: 0.8rem;
  }

  .status.success {
    padding: 10px;
    font-size: 0.82rem;
  }

  .disclosure-table th,
  .disclosure-table td {
    font-size: 0.78rem;
    padding: 8px 10px;
  }

  .verifier-did {
    font-size: 0.7rem;
  }

  .context-badge,
  .purpose {
    font-size: 0.7rem;
  }

  .empty-icon {
    font-size: 52px;
    width: 64px;
    height: 64px;
  }
}

`]
})
export class DisclosuresComponent implements OnInit {
  disclosures: any[] = [];
  displayedColumns: string[] = ['verifier', 'claim', 'context', 'purpose', 'consent', 'date'];
  loading = false;
  connecting = false;
  copied = false;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  constructor(
    public wallet: WalletService,
    private api: ApiService
  ) {}

  ngOnInit() {
    // Auto-load if already connected
    this.wallet.address$.subscribe(addr => {
      if (addr) {
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
      // loadDisclosures triggered by address$ subscription
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

  loadDisclosures() {
    if (!this.wallet.address) return;

    this.loading = true;
    const did = `did:ethr:${this.wallet.address}`;

    this.api.getDisclosuresForSubject(did).subscribe({
      next: (res: any) => {
        this.disclosures = (res.disclosures || []).sort(
          (a: any, b: any) => new Date(b.disclosed_at).getTime() - new Date(a.disclosed_at).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Failed to load disclosure history');
      }
    });
  }

  exportDisclosures() {
    if (!this.wallet.address || this.disclosures.length === 0) return;

    const exportData = {
      subject_did: `did:ethr:${this.wallet.address}`,
      exported_at: new Date().toISOString(),
      total_disclosures: this.disclosures.length,
      disclosures: this.disclosures
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disclosure-report-${this.wallet.address.substring(0, 8)}-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

export default DisclosuresComponent;