import { Component, signal, computed, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { WalletService } from './services/wallet.service';  // ← ADD THIS

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,

    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatBadgeModule
  ],
  template: `
    <mat-sidenav-container class="container" [class.dark]="darkMode()" [class.mini]="miniSidebar()">

      <!-- Sidebar -->
      <mat-sidenav #sidenav mode="side" opened fixedInViewport class="sidenav">
        <div class="logo" (click)="toggleMini()">
          <div class="logo-icon-wrapper">
            <mat-icon class="logo-icon">shield</mat-icon>
          </div>
          <div class="logo-text" [class.hidden]="miniSidebar()">
            <div class="logo-title">PIMV</div>
            <div class="logo-subtitle">Identity Vault</div>
          </div>
        </div>

        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/vault" routerLinkActive="active">
            <mat-icon matListItemIcon>lock_outline</mat-icon>
            <span matListItemTitle>Vault</span>
          </a>

          <a mat-list-item routerLink="/credentials" routerLinkActive="active">
            <mat-icon matListItemIcon>badge</mat-icon>
            <span matListItemTitle>Credentials</span>
          </a>

          <a mat-list-item routerLink="/contexts" routerLinkActive="active">
            <mat-icon matListItemIcon>layers</mat-icon>
            <span matListItemTitle>Contexts</span>
          </a>

          <a mat-list-item routerLink="/consent" routerLinkActive="active">
            <mat-icon matListItemIcon>task_alt</mat-icon>
            <span matListItemTitle>Consent</span>
          </a>

          <a mat-list-item routerLink="/disclosures" routerLinkActive="active">
            <mat-icon matListItemIcon>share</mat-icon>
            <span matListItemTitle>Disclosures</span>
          </a>

          <a *ngIf="isGdpr()" mat-list-item routerLink="/gdpr" routerLinkActive="active">
            <mat-icon matListItemIcon>policy</mat-icon>
            <span matListItemTitle>GDPR</span>
          </a>

          <a *ngIf="isAdmin()" mat-list-item routerLink="/advanced" routerLinkActive="active">
            <mat-icon matListItemIcon>settings_suggest</mat-icon>
            <span matListItemTitle>Advanced</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content>
        <!-- Top Toolbar -->
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="toggleMini()" class="menu-btn">
            <mat-icon>menu</mat-icon>
          </button>

          <div class="breadcrumb">
            <span>{{ breadcrumb() }}</span>
          </div>

          <span class="spacer"></span>

          <!-- Role Badge - Now dynamic based on wallet -->
          <div class="role-badge" 
               [class.admin]="isAdmin()" 
               [class.gdpr]="isGdpr() && !isAdmin()"
               *ngIf="wallet.address">
            {{ role() | uppercase }}
          </div>

          <!-- Wallet Address / Connect -->
          <div class="wallet-info" *ngIf="wallet.address; else connectBtn">
            <code class="address">{{ wallet.address | slice:0:6 }}...{{ wallet.address | slice:-4 }}</code>
            <button mat-icon-button (click)="copyAddress()" matTooltip="Copy address">
              <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>

          <ng-template #connectBtn>
            <button mat-stroked-button (click)="connectWallet()">
              <mat-icon>wallet</mat-icon>
              Connect Wallet
            </button>
          </ng-template>

          <!-- Dark Mode Toggle -->
          <mat-slide-toggle
            class="dark-toggle"
            [checked]="darkMode()"
            (change)="toggleDarkMode()">
            <mat-icon>{{ darkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
          </mat-slide-toggle>

          <!-- User Menu -->
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>Profile</span>
            </button>
            <button mat-menu-item (click)="disconnectWallet()">
              <mat-icon>logout</mat-icon>
              <span>Disconnect Wallet</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Page Content -->
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }

    .container {
      height: 100%;
      background: #f8fafc;
      transition: background 0.3s;
    }

    /* Sidebar */
    .sidenav {
      width: 260px;
      background: var(--sidebar-bg);
      border-right: none;
      box-shadow: 4px 0 12px rgba(0,0,0,0.08);
      transition: width 0.3s ease;
      overflow-x: hidden;
    }

    .container.mini .sidenav {
      width: 72px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 16px;
      cursor: pointer;
      transition: padding 0.3s;
    }

    .logo-icon-wrapper {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon {
      font-size: 28px;
      color: white;
    }

    .logo-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .logo-text.hidden {
      opacity: 0;
      width: 0;
      overflow: hidden;
    }

    .nav-list a {
      border-radius: 0 24px 24px 0;
      margin: 4px 12px;
      transition: all 0.2s;
    }

    .nav-list a:hover {
      background: var(--hover-bg);
    }

    .nav-list a.active {
      background: var(--primary-light);
      color: #6366f1;
      font-weight: 600;
    }

    .nav-list a.active mat-icon {
      color: #6366f1;
    }

    mat-icon[matListItemIcon] {
      margin-right: 16px;
      color: var(--text-secondary);
    }

    /* Toolbar */
    .toolbar {
      height: 70px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 0 24px;
    }

    .breadcrumb {
      font-size: 18px;
      font-weight: 500;
      color: white;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .role-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #4f46e5;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
    }

    .role-badge.admin {
      background: #fee2e2;
      color: #991b1b;
    }

    .role-badge.gdpr {
      background: #dcfce7;
      color: #166534;
    }

    .dark-toggle {
      margin: 0 16px;
      color: white;
    }

    /* Content */
    .content {
      padding: 32px;
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      transition: background 0.3s;
    }

    /* Dark Mode */
    .dark {
      --sidebar-bg: #1e1e2d;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --hover-bg: rgba(255,255,255,0.08);
      --primary-light: rgba(99,102,241,0.15);
      background: #0f0f1a;
    }

    .dark .content {
      background: #11111b;
    }

    .dark .sidenav {
      background: #1e1e2d;
    }

    .dark .role-badge:not(.admin):not(.gdpr) {
      background: rgba(255,255,255,0.1);
      color: #cbd5e1;
    }

    .wallet-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 16px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.2);
      border-radius: 20px;
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .address {
      font-weight: 500;
    }
  `]
})
export class AppComponent {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private router = inject(Router);
  // Inject WalletService
  wallet = inject(WalletService);

  /* Role */
  role = signal<'user' | 'gdpr' | 'admin'>('admin');
  isAdmin = computed(() => this.role() === 'admin');
  isGdpr = computed(() => this.role() === 'gdpr' || this.role() === 'admin');

  /* Mini Sidebar */
  miniSidebar = signal(false);
  toggleMini() {
    this.miniSidebar.update(v => !v);
  }

  /* Breadcrumb - auto from route */
  breadcrumb = computed(() => {
    const url = this.router.url;
    const segment = url.split('/').pop() || 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  /* Dark Mode */
  darkMode = signal(this.isBrowser && localStorage.getItem('darkMode') === 'true');

  toggleDarkMode() {
    this.darkMode.update(v => !v);
    if (this.isBrowser) {
      localStorage.setItem('darkMode', String(this.darkMode()));
      document.documentElement.classList.toggle('dark', this.darkMode());
    }
  }
 copied = false;
  ngOnInit() {
    if (this.darkMode()) {
      document.documentElement.classList.add('dark');
    }
  }

  async connectWallet() {
    try {
      await this.wallet.connect();
    } catch (e: any) {
      alert(e.message || 'Connection failed');
    }
  }

  disconnectWallet() {
    this.wallet.disconnect(); // Implement in WalletService if needed
    // Or just reload for demo
    window.location.reload();
  }

  copyAddress() {
    if (!this.wallet.address) return;
    navigator.clipboard.writeText(this.wallet.address);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }
}