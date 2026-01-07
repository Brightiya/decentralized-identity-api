import {
  Component,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationEnd
} from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

import { WalletService } from './services/wallet.service';
import { AuthService } from './services/auth.service';

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
  <mat-sidenav-container
    class="container"
    [class.dark]="darkMode()"
    [class.mini]="miniSidebar()">

    <!-- ========================= -->
    <!-- Sidebar (AUTH ONLY) -->
    <!-- ========================= -->
    <mat-sidenav
      *ngIf="auth.isAuthenticated()"
      mode="side"
      opened
      fixedInViewport
      class="sidenav">

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

        <!-- ===================== -->
        <!-- USER NAVIGATION -->
        <!-- ===================== -->
        <ng-container *ngIf="auth.role() === 'USER'">

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

          <a mat-list-item routerLink="/gdpr" routerLinkActive="active">
            <mat-icon matListItemIcon>policy</mat-icon>
            <span matListItemTitle>GDPR</span>
          </a>

        </ng-container>

        <!-- ===================== -->
        <!-- ADMIN NAVIGATION -->
        <!-- ===================== -->
        <ng-container *ngIf="auth.role() === 'ADMIN'">

          <a mat-list-item routerLink="/advanced" routerLinkActive="active">
            <mat-icon matListItemIcon>settings_suggest</mat-icon>
            <span matListItemTitle>Advanced</span>
          </a>

        </ng-container>

        <!-- ===================== -->
        <!-- VERIFIER NAVIGATION -->
        <!-- ===================== -->
        <ng-container *ngIf="auth.role() === 'VERIFIER'">

          <a mat-list-item routerLink="/verifier" routerLinkActive="active">
            <mat-icon matListItemIcon>verified_user</mat-icon>
            <span matListItemTitle>Verifier</span>
          </a>

        </ng-container>

      </mat-nav-list>
    </mat-sidenav>

    <!-- ========================= -->
    <!-- Main Content -->
    <!-- ========================= -->
    <mat-sidenav-content>

      <mat-toolbar color="primary" class="toolbar">
        <button mat-icon-button (click)="toggleMini()">
          <mat-icon>menu</mat-icon>
        </button>

        <div class="breadcrumb">{{ breadcrumb() }}</div>
        <span class="spacer"></span>

        <!-- Role Badge -->
        <div
          class="role-badge"
          *ngIf="auth.isAuthenticated() && wallet.address"
          [ngClass]="{
            'user': auth.role() === 'USER',
            'admin': auth.role() === 'ADMIN',
            'verifier': auth.role() === 'VERIFIER'
          }">
          {{ displayRole() }}
        </div>

        <!-- Wallet -->
        <div class="wallet-info" *ngIf="wallet.address; else connectBtn">
          <code class="address">
            {{ wallet.address | slice:0:6 }}...{{ wallet.address | slice:-4 }}
          </code>
          <button mat-icon-button (click)="copyAddress()">
            <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
          </button>
        </div>

        <ng-template #connectBtn>
          <button mat-stroked-button (click)="connectWallet()">
            <mat-icon>wallet</mat-icon>
            Connect Wallet
          </button>
        </ng-template>

        <!-- Dark Mode -->
        <mat-slide-toggle
          class="dark-toggle"
          [checked]="darkMode()"
          (change)="toggleDarkMode()">
          <mat-icon>{{ darkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </mat-slide-toggle>

        <!-- User Menu -->
        <ng-container *ngIf="wallet.address">
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>Profile</span>
            </button>

            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </ng-container>
      </mat-toolbar>

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

    /* Role Badge - base styles */
    .role-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      backdrop-filter: blur(10px);
    }

    /* USER (default) */
    .role-badge.user {
      background: rgba(255,255,255,0.25);
      color: #1e293b;
    }

    /* ADMIN */
    .role-badge.admin {
      background: #fee2e2;
      color: #991b1b;
    }

    /* VERIFIER */
    .role-badge.verifier {
      background: #e0f2fe;
      color: #0c4a6e;
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

    /* Dark mode role badge adjustments */
    .dark .role-badge.user {
      background: rgba(255,255,255,0.12);
      color: #e2e8f0;
    }

    .dark .role-badge.gdpr {
      background: #14532d;
      color: #bbf7d0;
    }

    .dark .role-badge.admin {
      background: #7f1d1d;
      color: #fecaca;
    }

    .dark .role-badge.verifier {
      background: #0c4a6e;
      color: #bae6fd;
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

export class AppComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  wallet = inject(WalletService);
  auth = inject(AuthService);

  private currentUrl = signal<string>(this.router.url);

  miniSidebar = signal(false);
  darkMode = signal(this.isBrowser && localStorage.getItem('darkMode') === 'true');
  copied = false;

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects.toLowerCase());
      }
    });
  }

  ngOnInit() {
    if (this.darkMode()) {
      document.documentElement.classList.add('dark');
    }
  }

  toggleMini() {
    this.miniSidebar.update(v => !v);
  }

  breadcrumb = computed(() => {
    const segment = this.router.url.split('/').pop() || 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  toggleDarkMode() {
    this.darkMode.update(v => !v);
    if (this.isBrowser) {
      localStorage.setItem('darkMode', String(this.darkMode()));
      document.documentElement.classList.toggle('dark', this.darkMode());
    }
  }

  async connectWallet() {
    try {
      await this.wallet.connect();
      this.cdr.detectChanges();
    } catch (e: any) {
      alert(e.message || 'Wallet connection failed');
    }
  }

  logout() {
    this.auth.logout();
    this.cdr.detectChanges();
  }

  displayRole = computed(() => {
    switch (this.auth.role()) {
      case 'ADMIN': return 'Admin / Auditor';
      case 'VERIFIER': return 'Verifier';
      default: return 'User';
    }
  });

  copyAddress() {
    if (!this.wallet.address) return;
    navigator.clipboard.writeText(this.wallet.address);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 2000);
  }
}