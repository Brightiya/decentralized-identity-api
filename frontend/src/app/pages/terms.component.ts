import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <mat-card class="policy-card">
        <mat-card-header>
          <mat-card-title>Terms of Use</mat-card-title>
          <mat-card-subtitle>Privacy Identity Management Vault</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p>By connecting your wallet and using PIMV, you agree to these terms.</p>

          <section>
            <h2><mat-icon>account_balance_wallet</mat-icon> Wallet-Based Access</h2>
            <p>You are solely responsible for the security of your private keys. PIMV never stores or sees your seed phrase.</p>
          </section>

          <mat-divider></mat-divider>

          <section>
            <h2><mat-icon>verified</mat-icon> Service Description</h2>
            <p>PIMV provides a self-sovereign identity vault with contextual profiles, selective disclosure, and verifiable credentials. We make no guarantees of absolute security — cryptography is hard.</p>
          </section>

          <mat-divider></mat-divider>

          <section>
            <h2><mat-icon>warning</mat-icon> Acceptable Use</h2>
            <p>You may not use PIMV for illegal activities, spam, or to impersonate others. We reserve the right to suspend access for violations.</p>
          </section>

          <p class="note">These terms may be updated. Continued use constitutes acceptance.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 40px 20px; max-width: 860px; margin: 0 auto; }
    .policy-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
    .dark .policy-card { background: rgba(20,25,35,0.85); }
    h2 { display: flex; align-items: center; gap: 12px; margin-top: 2rem; color: #6366f1; }
    .note { font-style: italic; color: #64748b; margin-top: 2rem; }
  `]
})
export class TermsComponent {}