// src/app/pages/profile.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../services/wallet.service';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
  <div class="profile-container" [class.dark]="darkMode()">
    <div class="profile-header">
      <h1>Profile</h1>
      <p class="subtitle">
        Your decentralized identity overview and settings.
      </p>
    </div>

    <!-- Connected Identity Card -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>account_circle</mat-icon>
        <mat-card-title>Connected Identity</mat-card-title>
        <mat-card-subtitle>
          <ng-container *ngIf="wallet.address$ | async">
            Active wallet and DID
          </ng-container>
          <ng-container *ngIf="!(wallet.address$ | async)">
            No wallet connected
          </ng-container>
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Show details only if address exists -->
        <div class="identity-info" *ngIf="wallet.address$ | async as address; else noWallet">
          <div class="field">
            <strong>Wallet Address</strong>
            <div class="value">
              <code>{{ address | slice:0:6 }}…{{ address | slice:-4 }}</code>
              <button mat-icon-button (click)="copyAddress(address)" matTooltip="Copy address">
                <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
          </div>

          <div class="field">
            <strong>Decentralized Identifier (DID)</strong>
            <div class="value">
              <code>did:ethr:{{ address }}</code>
              <button mat-icon-button (click)="copyDid(address)" matTooltip="Copy DID">
                <mat-icon>{{ copiedDid ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
          </div>

          <div class="field">
            <strong>Connection Status</strong>
            <div class="status success">
              <mat-icon inline>check_circle</mat-icon>
              Connected and active
            </div>
          </div>
        </div>

        <!-- No Wallet Connected State -->
        <ng-template #noWallet>
          <div class="empty-state">
            <mat-icon class="empty-icon">wallet</mat-icon>
            <p>No wallet connected</p>
            <p class="muted small">
              Connect your wallet from the top bar to view your identity details.
            </p>
          </div>
        </ng-template>
      </mat-card-content>
    </mat-card>

    <!-- Future Features Placeholder -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>settings</mat-icon>
        <mat-card-title>Identity Settings</mat-card-title>
        <mat-card-subtitle>Coming soon</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <p class="muted">
          Future features:
        </p>
        <ul class="feature-list">
          <li>View full DID document</li>
          <li>Manage verification methods</li>
          <li>Export identity backup</li>
          <li>Connected dApps list</li>
          <li>Privacy preferences</li>
        </ul>
      </mat-card-content>
    </mat-card>

    <!-- Quick Actions -->
    <mat-card class="card elevated" appearance="outlined">
      <mat-card-header>
        <mat-icon class="header-icon" mat-card-avatar>bolt</mat-icon>
        <mat-card-title>Quick Actions</mat-card-title>
      </mat-card-header>

      <mat-card-content class="actions-grid">
        <button mat-stroked-button routerLink="/credentials">
          <mat-icon>badge</mat-icon>
          Issue Credential
        </button>
        <button mat-stroked-button routerLink="/contexts">
          <mat-icon>layers</mat-icon>
          Manage Contexts
        </button>
        <button mat-stroked-button routerLink="/disclosures">
          <mat-icon>share</mat-icon>
          View Disclosures
        </button>
        <button mat-stroked-button routerLink="/gdpr">
          <mat-icon>policy</mat-icon>
          GDPR Erasure
        </button>
      </mat-card-content>
    </mat-card>
  </div>
`,

styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .profile-container {
    padding: 32px 40px 80px;
    max-width: 960px;
    margin: 0 auto;
    transition: background 0.4s ease;
  }

  .profile-container.dark {
    background: #0f0f1a;
    color: #e2e8f0;
  }

  /* Header */
  .profile-header {
    text-align: center;
    margin-bottom: 48px;
  }

  h1 {
    font-size: clamp(1.4rem, 4vw + 1rem, 2.8rem);
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 16px;
    letter-spacing: -0.6px;
  }

  .subtitle {
    font-size: clamp(0.95rem, 2.5vw + 0.4rem, 1.15rem);
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

  .profile-container.dark .card {
    background: rgba(30, 41, 59, 0.65);
    border-color: #2d2d44;
    backdrop-filter: blur(10px);
  }

  .elevated {
    box-shadow: 0 10px 30px rgba(0,0,0,0.09);
  }

  .profile-container.dark .elevated {
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.14);
  }

  .profile-container.dark .card:hover {
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

  .profile-container.dark .header-icon {
    background: rgba(99,102,241,0.28);
    color: #a5b4fc;
  }

  /* Identity Info */
  .identity-info {
    display: grid;
    gap: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field strong {
    color: var(--text-primary);
    font-size: 0.98rem;
    font-weight: 600;
  }

  .value {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--code-bg, #f8fafc);
    padding: 14px 18px;
    border-radius: 14px;
    border: 1px solid var(--card-border, #e2e8f0);
  }

  .profile-container.dark .value {
    background: rgba(30,41,59,0.6);
    border-color: #4b5563;
  }

  .value code {
    flex: 1;
    font-family: 'Courier New', monospace;
    color: #1d4ed8;
    word-break: break-all;
    font-size: clamp(0.85rem, 1.8vw + 0.5rem, 0.98rem);
  }

  .profile-container.dark .value code {
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
    font-weight: 500;
  }

  .profile-container.dark .status.success {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.45);
    color: #86efac;
  }

  /* Future Features */
  .feature-list {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-left: 8px;
    list-style: disc;
  }

  .profile-container.dark .feature-list {
    color: #cbd5e1;
  }

  /* Quick Actions Grid */
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .actions-grid button {
    justify-content: flex-start;
    height: 56px;
    font-size: 1rem;
    padding: 0 20px;
    border-radius: 12px;
    transition: all 0.25s ease;
  }

  .actions-grid button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }

  .profile-container.dark .actions-grid button {
    background: rgba(30,41,59,0.6);
    color: #e2e8f0;
    border-color: #4b5563;
  }

  .actions-grid mat-icon {
    margin-right: 12px;
  }

  /* Empty / Misc States */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 64px;
    width: 80px;
    height: 80px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  .muted { color: var(--text-secondary); }
  .small { font-size: 0.9rem; }

  /* Dark mode Material fixes */
  .profile-container.dark {
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
    /* Universal scalable responsive layer */
@media (max-width: 960px) {
  .profile-container {
    padding: 28px 32px 60px;
  }
}
  
@media (max-width: 600px) {
  .profile-container {
    padding: 24px 20px 48px;
  }

  /* Stop card hover on touch devices */
  .card:hover {
    transform: none;
    box-shadow: none;
  }

  .profile-header {
    margin-bottom: 32px;
  }

  .identity-info {
    gap: 20px;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid button {
    width: 100%;
    justify-content: center;
    font-size: 0.95rem;
    height: 52px;
  }

  .empty-state {
    padding: 36px 16px;
  }

  .feature-list {
    margin-left: 0;
    padding-left: 18px;
  }
}

@media (max-width: 360px) {
  .profile-container {
    padding: 20px 16px 40px;
  }

  h1 {
    letter-spacing: -0.3px;
  }

  .actions-grid button {
    height: 48px;
    font-size: 0.9rem;
  }

  .value {
    padding: 12px 14px;
    gap: 8px;
  }

  .value code {
    font-size: 0.88rem;
  }

  .empty-icon {
    font-size: 52px;
    width: 64px;
    height: 64px;
  }
}

`]
})
export class ProfileComponent {
  wallet = inject(WalletService);

  copied = false;
  copiedDid = false;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;   // readonly signal

  copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

 copyDid(address: string) {
    const did = `did:ethr:${address}`;
    navigator.clipboard.writeText(did);
    this.copiedDid = true;
    setTimeout(() => this.copiedDid = false, 2000);
  }
}

export default ProfileComponent;
