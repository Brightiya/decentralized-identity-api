// src/app/pages/profile/profile.component.ts
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { WalletService } from '../services/wallet.service';
import { ThemeService } from '../services/theme.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="profile-container" [class.dark]="darkMode()">
      <!-- Hero-like Header -->
      <div class="profile-hero">
        <div class="hero-content">
          <h1>My Profile</h1>
          <p class="hero-subtitle">
            Manage your decentralized identity • personal data • privacy controls
          </p>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Identity Card – prominent & sticky on wide screens -->
        <mat-card class="identity-card glass-card elevated" appearance="outlined">
          <mat-card-header>
            <mat-icon class="avatar-icon" mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>Connected Identity</mat-card-title>
            <mat-card-subtitle>
              {{ (wallet.address$ | async) ? 'Active • Verified' : 'Not connected' }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <ng-container *ngIf="wallet.address$ | async as address; else noWallet">
              <div class="identity-details">
                <div class="detail-item">
                  <div class="label">Wallet Address</div>
                  <div class="value-row">
                    <code class="mono">{{ address | slice:0:8 }}…{{ address | slice:-6 }}</code>
                    <button mat-icon-button size="small"
                            (click)="copyAddress(address)"
                            matTooltip="Copy address"
                            [matTooltipPosition]="'above'">
                      <mat-icon size="small">{{ copied() ? 'check_circle' : 'content_copy' }}</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="detail-item">
                  <div class="label">Decentralized ID</div>
                  <div class="value-row">
                    <code class="mono">did:ethr:{{ address | slice:0:8 }}…</code>
                    <button mat-icon-button size="small"
                            (click)="copyDid(address)"
                            matTooltip="Copy DID"
                            [matTooltipPosition]="'above'">
                      <mat-icon size="small">{{ copiedDid() ? 'check_circle' : 'content_copy' }}</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="detail-item status-item">
                  <div class="label">Connection Status</div>
                  <div class="status success">
                    <mat-icon inline>verified</mat-icon>
                    Active & Verified
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #noWallet>
              <div class="empty-identity">
                <mat-icon class="empty-icon">wallet</mat-icon>
                <h3>No wallet connected</h3>
                <p class="muted">
                  Connect your wallet to access and manage your decentralized identity.
                </p>
              </div>
            </ng-template>
          </mat-card-content>
        </mat-card>

        <!-- Tabs + Content Area -->
        <mat-card class="content-card glass-card elevated" appearance="outlined" *ngIf="wallet.address$ | async">
          <mat-tab-group 
            mat-stretch-tabs 
            animationDuration="0ms"
            [selectedIndex]="activeTabIndex()"
            (selectedTabChange)="onTabChange($event)"
            class="profile-tabs">

            <mat-tab label="Overview"></mat-tab>
            <mat-tab label="Edit Profile"></mat-tab>
            <mat-tab label="Privacy & Consents"></mat-tab>
          </mat-tab-group>

          <div class="tab-content-wrapper">
            <div class="tab-content-inner">
              <router-outlet></router-outlet>
            </div>
          </div>
        </mat-card>

        <!-- Quick Actions Panel -->
        <mat-card class="quick-actions glass-card elevated" appearance="outlined">
          <mat-card-header>
            <mat-icon class="header-icon" mat-card-avatar>auto_awesome</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
          </mat-card-header>

          <mat-card-content>
            <div class="actions-grid">
              <a mat-stroked-button color="primary" routerLink="/credentials" class="action-btn">
                <mat-icon>badge</mat-icon>
                <span>Issue Credential</span>
              </a>
              <a mat-stroked-button color="primary" routerLink="/contexts" class="action-btn">
                <mat-icon>layers</mat-icon>
                <span>Manage Contexts</span>
              </a>
              <a mat-stroked-button color="primary" routerLink="/disclosures" class="action-btn">
                <mat-icon>share</mat-icon>
                <span>View Disclosures</span>
              </a>
              <a mat-stroked-button color="warn" routerLink="/gdpr" class="action-btn">
                <mat-icon>policy</mat-icon>
                <span>GDPR Erasure</span>
              </a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,

  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .profile-container {
      padding: clamp(24px, 4vw, 40px) clamp(16px, 5vw, 48px) 100px;
      max-width: 1280px;
      margin: 0 auto;
      transition: background 0.5s ease, color 0.5s ease;
    }

    .profile-container.dark {
      background: linear-gradient(to bottom, #0f0f1a, #0a0a14);
      color: #e2e8f0;
    }

    /* Hero Header */
    .profile-hero {
      text-align: center;
      margin-bottom: clamp(40px, 6vw, 72px);
      padding: 0 16px;
    }

    .hero-content h1 {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1 0%, #a78bfa 40%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 12px;
      letter-spacing: -1px;
    }

    .hero-subtitle {
      font-size: clamp(1rem, 2.2vw, 1.25rem);
      color: var(--text-secondary, #94a3b8);
      max-width: 680px;
      margin: 0 auto;
      font-weight: 400;
    }

    /* Grid Layout */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Glass Cards */
    .glass-card {
      background: var(--card-bg, rgba(255,255,255,0.75));
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--card-border, rgba(226,232,240,0.5));
      border-radius: 24px;
      overflow: hidden;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .profile-container.dark .glass-card {
      background: rgba(30,41,59,0.45);
      border-color: rgba(100,116,139,0.3);
      backdrop-filter: blur(20px) saturate(160%);
    }

    .glass-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
    }

    .profile-container.dark .glass-card:hover {
      box-shadow: 0 24px 48px rgba(0,0,0,0.45);
    }

    /* Identity Card */
    .identity-card {
      position: relative;
    }

    .avatar-icon {
      font-size: 48px;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      color: white;
      border-radius: 16px;
    }

    .identity-details {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 12px 0;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    code.mono {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      background: var(--code-bg, rgba(226,232,240,0.5));
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.95rem;
      color: #1d4ed8;
      letter-spacing: 0.5px;
    }

    .profile-container.dark code.mono {
      background: rgba(30,41,59,0.7);
      color: #c7d2fe;
    }

    .status-item .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34,197,94,0.15);
      color: #166534;
      padding: 8px 14px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .profile-container.dark .status-item .status.success {
      background: rgba(34,197,94,0.25);
      color: #86efac;
    }

    /* Empty State */
    .empty-identity {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 72px;
      width: 96px;
      height: 96px;
      color: #94a3b8;
      margin-bottom: 16px;
    }

    .empty-identity h3 {
      margin: 12px 0 8px;
      color: var(--text-primary);
    }

    /* Tabs */
    .profile-tabs {
      border-bottom: 1px solid var(--divider, rgba(226,232,240,0.5));
    }

    .profile-container.dark .profile-tabs {
      border-bottom-color: rgba(100,116,139,0.3);
    }

    ::ng-deep .mat-mdc-tab-label {
      min-width: 120px;
      padding: 0 24px;
      font-weight: 600;
      font-size: 0.95rem;
      opacity: 0.7;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-tab-label.mat-mdc-tab-active {
      opacity: 1;
      color: #6366f1;
    }

    .tab-content-wrapper {
      padding: 32px;
      min-height: 360px;
    }

    /* Quick Actions */
    .quick-actions {
      margin-top: 8px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      padding: 16px 0;
    }

    .action-btn {
      height: 64px;
      justify-content: flex-start;
      gap: 16px;
      padding: 0 20px;
      font-weight: 500;
      border-radius: 16px;
      transition: all 0.3s ease;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99,102,241,0.15);
    }

    /* Responsive */
    @media (max-width: 960px) {
      .profile-grid { gap: 24px; }
      .tab-content-wrapper { padding: 24px; }
    }

    @media (max-width: 600px) {
      .profile-hero { margin-bottom: 48px; }
      .actions-grid { grid-template-columns: 1fr; }
      .action-btn { height: 56px; }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  wallet = inject(WalletService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  darkMode = this.themeService.darkMode;

  copied = signal(false);
  copiedDid = signal(false);

  activeTabIndex = signal(0);

  private subscription: any;

  ngOnInit() {
    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveTab();
    });

    this.updateActiveTab();
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  private updateActiveTab() {
    const url = this.router.url;
    if (url.includes('/profile/edit')) {
      this.activeTabIndex.set(1);
    } else if (url.includes('/profile/privacy')) {
      this.activeTabIndex.set(2);
    } else {
      this.activeTabIndex.set(0);
    }
  }

  onTabChange(event: any) {
    const index = event.index;
    this.activeTabIndex.set(index);

    const commands = index === 0 ? ['.'] : index === 1 ? ['edit'] : ['privacy'];
    this.router.navigate(commands, { relativeTo: this.route });
  }

  copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  copyDid(address: string) {
    const did = `did:ethr:${address}`;
    navigator.clipboard.writeText(did);
    this.copiedDid.set(true);
    setTimeout(() => this.copiedDid.set(false), 2000);
  }
}