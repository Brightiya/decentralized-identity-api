import { Component, OnInit } from '@angular/core';
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

        <!-- Table -->
        <table mat-table [dataSource]="disclosures" class="disclosure-table" *ngIf="!loading && disclosures.length > 0">

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
              <mat-icon [color]="d.consent ? 'primary' : 'warn'">
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

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- Export Button -->
        <div class="actions" *ngIf="disclosures.length > 0">
          <button mat-raised-button color="accent" (click)="exportDisclosures()">
            <mat-icon>download</mat-icon>
            Download Disclosure Report (JSON)
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .disclosures-header {
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
      max-width: 960px;
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
      margin-bottom: 16px;
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

    .badge {
      margin-left: auto;
      padding: 4px 12px;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .did-display {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0;
      padding: 12px;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 0.95rem;
    }

    .did-display code {
      color: #1e40af;
      font-family: 'Courier New', monospace;
      flex: 1;
    }

    .status.success {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #166534;
      background: #f0fdf4;
      padding: 12px;
      border-radius: 10px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 0;
      color: #64748b;
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

    .disclosure-table {
      width: 100%;
    }

    .disclosure-table th {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    .disclosure-table td {
      font-size: 0.9rem;
      padding: 12px 8px;
    }

    .verifier-did {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: #1e40af;
      word-break: break-all;
    }

    .purpose {
      padding: 4px 10px;
      background: #f3f4f6;
      border-radius: 12px;
      font-size: 0.85rem;
      color: #4b5563;
    }

    .actions {
      margin-top: 24px;
      text-align: right;
    }

    .muted { color: #64748b; }
  `]
})
export class DisclosuresComponent implements OnInit {
  disclosures: any[] = [];
  displayedColumns: string[] = ['verifier', 'claim', 'purpose', 'consent', 'date'];
  loading = false;
  connecting = false;
  copied = false;

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