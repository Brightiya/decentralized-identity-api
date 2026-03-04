import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <mat-card class="policy-card">
        <mat-card-header>
          <mat-card-title>Privacy Policy</mat-card-title>
          <mat-card-subtitle>Last updated: March 2026</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p class="intro">At PIMV, your identity is yours. We built this vault with privacy-by-design and full GDPR compliance.</p>

          <section>
            <h2><mat-icon>shield</mat-icon> What Data We Collect</h2>
            <ul>
              <li>Wallet address (pseudonymous identifier)</li>
              <li>Contextual identity profiles (encrypted)</li>
              <li>Consent records & disclosure logs</li>
              <li>Minimal on-chain audit hashes (no PII)</li>
            </ul>
          </section>

          <mat-divider></mat-divider>

          <section>
            <h2><mat-icon>lock</mat-icon> How We Protect You</h2>
            <p>We use AES-256-GCM encryption for sensitive attributes, zero-knowledge-style selective disclosure, and client-controlled erasure. No third-party trackers or advertising.</p>
          </section>

          <mat-divider></mat-divider>

          <section>
            <h2><mat-icon>gavel</mat-icon> Your GDPR Rights</h2>
            <ul>
              <li>Right to access & portability</li>
              <li>Right to rectification & erasure (one-click in /gdpr)</li>
              <li>Right to withdraw consent at any time</li>
              <li>Right to object to processing</li>
            </ul>
          </section>

          <p class="note">We never sell your data. We never share it without explicit, granular consent.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 40px 20px; max-width: 860px; margin: 0 auto; }
    .policy-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
    .dark .policy-card { background: rgba(20,25,35,0.85); }
    h2 { display: flex; align-items: center; gap: 12px; margin-top: 2rem; color: #6366f1; }
    .intro { font-size: 1.1rem; line-height: 1.7; }
    .note { font-style: italic; color: #64748b; margin-top: 2rem; }
  `]
})
export class PrivacyPolicyComponent {}