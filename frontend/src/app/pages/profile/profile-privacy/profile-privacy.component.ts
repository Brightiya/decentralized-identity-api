// src/app/pages/profile/profile-privacy.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { ThemeService } from '../../../services/theme.service';
import { ApiService } from '../../../services/api.service';
import { WalletService } from '../../../services/wallet.service';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Consent {
  claimId: string;
  purpose: string;
  issuedAt: string;
  expiresAt?: string;
  verifierDid?: string;
}

@Component({
  selector: 'app-profile-privacy',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatListModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="privacy-container" [class.dark]="darkMode()">
      <div class="page-header">
        <h1>Privacy & Consents</h1>
        <p class="subtitle">Control who can access your personal data</p>
      </div>

      <mat-card class="privacy-card glass-card" appearance="outlined">
        <mat-card-content>
          <!-- Loading -->
          <div class="loading-state" *ngIf="loading()">
            <mat-spinner diameter="56"></mat-spinner>
            <div class="state-message">
              <h3>Loading your consents...</h3>
              <p class="muted">Please wait a moment</p>
            </div>
          </div>

          <!-- Error -->
          <div class="error-state" *ngIf="error()">
            <mat-icon color="warn">error_outline</mat-icon>
            <h3>Something went wrong</h3>
            <p class="muted">{{ error() }}</p>
            <button mat-raised-button color="primary" (click)="loadConsents()">
              Try Again
            </button>
          </div>

          <!-- Main content -->
          <ng-container *ngIf="!loading() && !error()">
            <ng-container *ngIf="wallet.address$ | async; else noWallet">
              <div class="consents-section" *ngIf="consents().length > 0; else emptyState">
                <div class="section-notice">
                  <mat-icon>info</mat-icon>
                  <p>The following entities have active access to parts of your profile data (context: profile)</p>
                </div>

                <mat-list class="consents-list">
                  <mat-list-item *ngFor="let consent of consents()" class="consent-item">
                    <mat-icon matListItemIcon color="primary">verified_user</mat-icon>

                    <div class="consent-content">
                      <h3 class="purpose">{{ consent.purpose }}</h3>
                      <div class="meta">
                        <span class="claim">Claim: <code>{{ consent.claimId }}</code></span>
                        <span class="dates">
                          Granted: {{ formatDate(consent.issuedAt) }}
                          <ng-container *ngIf="consent.expiresAt">
                            • Expires: {{ formatDate(consent.expiresAt) }}
                            <span *ngIf="isExpired(consent.expiresAt)" class="expired-tag">Expired</span>
                          </ng-container>
                        </span>
                      </div>
                    </div>

                    <button mat-icon-button color="warn" 
                            (click)="revokeConsent(consent)"
                            matTooltip="Revoke access"
                            aria-label="Revoke this consent">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </mat-list-item>
                </mat-list>

                <div class="refresh-area">
                  <button mat-stroked-button (click)="loadConsents()">
                    <mat-icon>refresh</mat-icon>
                    Refresh list
                  </button>
                </div>
              </div>

              <ng-template #emptyState>
                <div class="empty-state">
                  <mat-icon class="shield-icon">shield</mat-icon>
                  <h3>No active consents</h3>
                  <p class="muted">
                    Your profile data is currently not shared with any third parties.
                  </p>
                </div>
              </ng-template>

              <!-- GDPR Erasure -->
              <mat-divider class="divider"></mat-divider>

              <div class="erasure-section">
                <h3 class="warning-title">Right to Erasure (GDPR Article 17)</h3>
                <p class="muted">
                  Request permanent deletion of all your profile data stored in the system.
                  This action is irreversible.
                </p>

                <button mat-raised-button color="warn" 
                        class="erase-btn"
                        (click)="requestErasure()"
                        [disabled]="erasing()">
                  <mat-icon *ngIf="!erasing()">delete_forever</mat-icon>
                  <span *ngIf="!erasing()">Erase My Profile Data</span>
                  <mat-spinner *ngIf="erasing()" diameter="20"></mat-spinner>
                </button>
              </div>
            </ng-container>

            <ng-template #noWallet>
              <div class="empty-state">
                <mat-icon class="wallet-icon">wallet</mat-icon>
                <h3>Wallet not connected</h3>
                <p class="muted">
                  Connect your wallet to view and manage your privacy settings and consents.
                </p>
              </div>
            </ng-template>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `,

  styles: [`
    :host { display: block; }

    .privacy-container {
      padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 64px);
      max-width: 900px;
      margin: 0 auto;
      transition: background 0.5s ease;
    }

    .privacy-container.dark {
      background: linear-gradient(to bottom, #0f0f1a, #0a0a14);
      color: #e2e8f0;
    }

    /* Header */
    .page-header {
      text-align: center;
      margin-bottom: clamp(32px, 6vw, 56px);
    }

    .page-header h1 {
      font-size: clamp(2.2rem, 5.5vw, 3.4rem);
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px;
    }

    .subtitle {
      font-size: 1.1rem;
      color: #94a3b8;
      font-weight: 400;
    }

    /* Card */
    .privacy-card {
      border-radius: 24px;
      background: var(--card-bg, rgba(255,255,255,0.78));
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--card-border, rgba(226,232,240,0.4));
      overflow: hidden;
    }

    .privacy-container.dark .privacy-card {
      background: rgba(30,41,59,0.48);
      border-color: rgba(100,116,139,0.3);
      backdrop-filter: blur(20px);
    }

    /* States */
    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 80px 32px;
      color: #94a3b8;
    }

    .state-message h3, .empty-state h3 {
      margin: 16px 0 8px;
      color: var(--text-primary);
    }

    .shield-icon, .wallet-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
      opacity: 0.7;
    }

    /* Consents List */
    .consents-section {
      padding: 24px;
    }

    .section-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--notice-bg, rgba(99,102,241,0.08));
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      font-size: 0.95rem;
      color: #4f46e5;
    }

    .privacy-container.dark .section-notice {
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
    }

    .consents-list {
      background: var(--list-bg, rgba(0,0,0,0.02));
      border-radius: 16px;
      overflow: hidden;
    }

    .privacy-container.dark .consents-list {
      background: rgba(255,255,255,0.04);
    }

    .consent-item {
      height: auto !important;
      padding: 20px 24px !important;
      border-bottom: 1px solid var(--divider, rgba(226,232,240,0.3));
    }

    .privacy-container.dark .consent-item {
      border-bottom-color: rgba(100,116,139,0.3);
    }

    .consent-content {
      flex: 1;
    }

    .purpose {
      margin: 0 0 6px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.9rem;
      color: #64748b;
    }

    .privacy-container.dark .meta {
      color: #cbd5e1;
    }

    code {
      background: var(--code-bg, rgba(226,232,240,0.5));
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    .expired-tag {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      margin-left: 8px;
    }

    .privacy-container.dark .expired-tag {
      background: #7f1d1d;
      color: #fecaca;
    }

    .refresh-area {
      text-align: center;
      margin-top: 24px;
    }

    /* Erasure Section */
    .divider {
      margin: 40px 24px;
    }

    .erasure-section {
      padding: 0 24px 32px;
    }

    .warning-title {
      color: #ef4444;
      font-weight: 700;
      margin: 0 0 12px;
    }

    .erase-btn {
      margin-top: 16px;
      min-width: 240px;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .consents-section { padding: 20px; }
      .consent-item { padding: 16px !important; }
      .meta { font-size: 0.85rem; }
    }
  `]
})
export class ProfilePrivacyComponent implements OnInit {
  private apiService = inject(ApiService);
  public wallet = inject(WalletService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private themeService = inject(ThemeService);

  loading = signal(true);
  error = signal<string | null>(null);
  consents = signal<Consent[]>([]);
  erasing = signal(false);

  darkMode = this.themeService.darkMode;

  ngOnInit() {
    this.loadConsents();
  }

  loadConsents() {
    this.loading.set(true);
    this.error.set(null);

    this.wallet.address$.pipe(
      switchMap(address => {
        if (!address) {
          this.error.set('No wallet connected');
          this.loading.set(false);
          return of(null);
        }

        return this.apiService.getActiveConsents(address, 'profile');
      })
    ).subscribe({
      next: (data) => {
        if (data) {
          this.consents.set(data || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load consents:', err);
        this.error.set('Could not load consent information');
        this.loading.set(false);
      }
    });
  }

  revokeConsent(consent: Consent) {
    this.wallet.address$.pipe(take(1)).subscribe(address => {
      if (!address) return;

      this.apiService.revokeConsent({
        owner: address,
        claimId: consent.claimId,
        context: 'profile'
      }).subscribe({
        next: () => {
          this.snackBar.open('Consent revoked successfully', 'Close', { duration: 4000 });
          this.loadConsents();
        },
        error: (err) => {
          console.error('Revoke failed:', err);
          this.snackBar.open('Failed to revoke consent', 'Close', { duration: 5000 });
        }
      });
    });
  }

  requestErasure() {
    const dialogRef = this.dialog.open(ConfirmErasureDialog, {
      width: '400px',
      data: { title: 'Erase Profile', message: 'This will permanently delete your profile data. This action cannot be undone.' }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.erasing.set(true);

      this.wallet.address$.pipe(take(1)).subscribe(address => {
        if (!address) {
          this.erasing.set(false);
          this.snackBar.open('No wallet connected', 'Close', { duration: 3000 });
          return;
        }

        this.apiService.eraseProfile({ did: `did:ethr:${address}` }).subscribe({
          next: () => {
            this.snackBar.open('Erasure request submitted successfully', 'Close', { duration: 6000 });
            this.erasing.set(false);
            // Optional: navigate away or show success page
          },
          error: (err) => {
            console.error('Erasure failed:', err);
            this.snackBar.open('Failed to submit erasure request', 'Close', { duration: 6000 });
            this.erasing.set(false);
          }
        });
      });
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }
}

// ────────────────────────────────────────────────
// Confirmation Dialog (standalone component)
// ────────────────────────────────────────────────
@Component({
  selector: 'confirm-erasure-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <p class="warning">This action is permanent and cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-button color="warn" [mat-dialog-close]="true">Erase Profile</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning { color: #ef4444; font-weight: 500; margin-top: 16px; }
  `]
})
export class ConfirmErasureDialog {
  data = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmErasureDialog>);
}