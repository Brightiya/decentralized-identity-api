/**
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service'; // ✅ use ApiService

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  owner = '';
  name = '';
  email = '';
  credentials: string[] = [];
  profileData: any = null;
  message = '';
  loading = false;

  constructor(private api: ApiService) {} // ✅ inject ApiService

  async connectWallet() {
    if ((window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      this.owner = accounts[0];
    } else {
      alert('Please install MetaMask');
    }
  }

  createProfile() {
    if (!this.owner || !this.name || !this.email) {
      this.message = 'Please fill all required fields';
      return;
    }

    this.loading = true;
    this.api.createProfile({
      owner: this.owner,
      name: this.name,
      email: this.email,
      credentials: this.credentials,
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = res.message;
        this.profileData = res;
      },
      error: (err: any) => {
        this.loading = false;
        this.message = err.error?.error || 'Error creating profile';
      }
    });
  }

  getProfile() {
    if (!this.owner) {
      this.message = 'Connect wallet first';
      return;
    }

    this.loading = true;
    this.api.getProfile(this.owner).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.profileData = res.profile;
        this.message = res.message;
      },
      error: (err: any) => {
        this.loading = false;
        this.message = err.error?.error || 'Error fetching profile';
      }
    });
  }
}
*/

// src/app/pages/profile.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../services/wallet.service';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

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
              <code>{{ address }}</code>
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
  `,
  styles: [`
    .profile-header {
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
      margin-bottom: 24px;
      max-width: 760px;
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
      margin-bottom: 20px;
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

    .identity-info {
      display: grid;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field strong {
      color: #374151;
      font-size: 0.95rem;
    }

    .value {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .value code {
      flex: 1;
      font-family: 'Courier New', monospace;
      color: #1e40af;
      word-break: break-all;
    }

    .status.success {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #166534;
      background: #f0fdf4;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 500;
    }

    .feature-list {
      color: #64748b;
      line-height: 1.8;
      margin-left: 4px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .actions-grid button {
      justify-content: flex-start;
    }

    .actions-grid mat-icon {
      margin-right: 8px;
    }

    .muted {
      color: #64748b;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }

    .empty-icon {
      font-size: 64px;
      width: 80px;
      height: 80px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .status.warning {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9a3412;
      background: #fffbeb;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 500;
    }

    .small {
      font-size: 0.9rem;
    }
  `]
})
export class ProfileComponent {
  wallet = inject(WalletService);

  copied = false;
  copiedDid = false;

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
