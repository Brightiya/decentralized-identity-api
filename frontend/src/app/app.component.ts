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
import { ThemeService } from './services/theme.service';

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

    <!-- Sidebar (shown when authenticated) -->
    <mat-sidenav
      *ngIf="auth.isAuthenticated()"
      mode="side"
      opened
      fixedInViewport
      class="sidenav">

      <div 
        class="logo" 
        (click)="toggleMini()"
        matTooltip="Privacy Identity Management Vault"
        matTooltipPosition="right"
        matTooltipClass="logo-tooltip">
        <div class="logo-icon-wrapper">
          <mat-icon class="logo-icon">shield</mat-icon>
        </div>
        <div class="logo-text" [class.hidden]="miniSidebar()">
          <div class="logo-title">PIMV</div>
          <div class="logo-subtitle">Identity Vault</div>
        </div>
      </div>

      <mat-nav-list class="nav-list">

        <!-- USER NAVIGATION -->
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

        <!-- ADMIN NAVIGATION -->
        <ng-container *ngIf="auth.role() === 'ADMIN'">
          <a mat-list-item routerLink="/advanced" routerLinkActive="active">
            <mat-icon matListItemIcon>settings_suggest</mat-icon>
            <span matListItemTitle>Advanced</span>
          </a>
        </ng-container>

        <!-- VERIFIER NAVIGATION -->
        <ng-container *ngIf="auth.role() === 'VERIFIER'">
          <a mat-list-item routerLink="/verifier" routerLinkActive="active">
            <mat-icon matListItemIcon>verified_user</mat-icon>
            <span matListItemTitle>Verifier</span>
          </a>
        </ng-container>

      </mat-nav-list>
    </mat-sidenav>

    <!-- Main Content Area + Footer -->
    <mat-sidenav-content class="sidenav-content">

      <mat-toolbar color="primary" class="toolbar">
        <button mat-icon-button (click)="toggleMini()" aria-label="Toggle sidebar">
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

        <!-- Wallet Info -->
        <div class="wallet-info" *ngIf="wallet.address; else connectBtn">
          <code class="address">
            {{ wallet.address | slice:0:6 }}...{{ wallet.address | slice:-4 }}
          </code>
          <button mat-icon-button (click)="copyAddress()" aria-label="Copy address">
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
          (change)="toggleDarkMode()"
          aria-label="Toggle dark mode">
          <mat-icon>{{ darkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </mat-slide-toggle>

        <!-- User Menu -->
        <ng-container *ngIf="wallet.address">
          <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
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

      <!-- ── Professional Footer ── -->
      <footer class="app-footer">
        <div class="footer-content">
          <div class="footer-left">
            <span class="footer-logo">PIMV</span>
            <span class="footer-name">Privacy Identity Management Vault</span>
          </div>

          <div class="footer-center">
            <span>© {{ currentYear }} Privacy Identity Management Vault. All rights reserved.</span>
          </div>

          <div class="footer-right">
            <a href="#" class="footer-link">Privacy Policy</a>
            <a href="#" class="footer-link">Terms of Use</a>
            <a href="#" class="footer-link">Contact</a>
          </div>
        </div>
      </footer>

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
    transition: background 0.3s ease;
  }

  /* ── Sidebar ── */
  .sidenav {
    width: 260px;
    background: var(--sidebar-bg, #ffffff);
    border-right: none;
    box-shadow: 4px 0 20px rgba(0,0,0,0.06);
    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-x: hidden;
  }

  .container.mini .sidenav {
    width: 80px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 20px;
    cursor: pointer;
    transition: padding 0.35s ease;
  }

  .logo:hover {
    background: var(--hover-bg);
  }

  .logo-icon-wrapper {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .logo-icon {
    font-size: 32px;
    color: white;
  }

  .logo-title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text-primary);
  }

  .logo-subtitle {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    opacity: 0.85;
  }

  .logo-text.hidden {
    opacity: 0;
    width: 0;
    overflow: hidden;
    transition: opacity 0.3s ease;
  }

  ::ng-deep .logo-tooltip {
    font-size: 13px !important;
    padding: 8px 12px !important;
    background: rgba(30, 41, 59, 0.96) !important;
    color: white !important;
    border-radius: 8px !important;
  }

  .nav-list a {
    border-radius: 0 28px 28px 0;
    margin: 6px 16px;
    height: 52px;
    transition: all 0.25s ease;
    color: var(--text-primary) !important;
  }

  .nav-list a:hover {
    background: var(--hover-bg);
  }

  .nav-list a.active {
    background: var(--primary-light);
    color: #6366f1 !important;
    font-weight: 600;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.18);
  }

  .nav-list a mat-icon[matListItemIcon] {
    color: var(--text-secondary) !important;
  }

  .nav-list a.active mat-icon[matListItemIcon] {
    color: #a5b4fc !important;
  }

  mat-icon[matListItemIcon] {
    margin-right: 20px;
    color: var(--text-secondary);
    font-size: 22px;
    width: 22px;
    height: 22px;
    line-height: 22px;
  }

  /* ── Toolbar ── */
  .toolbar {
    height: 72px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    padding: 0 28px;
    z-index: 10;
  }

  .breadcrumb {
    font-size: 19px;
    font-weight: 600;
    color: white;
    letter-spacing: 0.2px;
  }

  .spacer {
    flex: 1 1 auto;
  }

  .role-badge {
    padding: 7px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.18);
  }

  .role-badge.user    { background: rgba(255,255,255,0.28); color: #1e293b; }
  .role-badge.admin   { background: #fee2e2; color: #991b1b; }
  .role-badge.verifier { background: #e0f2fe; color: #0c4a6e; }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 20px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.22);
    border-radius: 999px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 0.94rem;
    border: 1px solid rgba(255,255,255,0.15);
  }

  .address {
    font-weight: 500;
  }

  .dark-toggle {
    margin: 0 20px;
    color: white;
  }

  /* ── Main Content + Footer Container ── */
  .sidenav-content {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .content {
    flex: 1 0 auto;
    padding: 36px;
    background: #f8fafc;
    transition: background 0.3s ease;
  }

  /* ── Footer ── */
  .app-footer {
    flex-shrink: 0;
    background: var(--footer-bg, #f1f5f9);
    border-top: 1px solid rgba(0,0,0,0.11);
    padding: 32px 40px;
    font-size: 15px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
    /* Removed max-width + margin auto → full bleed */
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-logo {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text-primary);
  }

  .footer-name {
    font-size: 15px;
    font-weight: 600;
    opacity: 1;
  }

  .footer-center {
    text-align: center;
    flex: 1;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .footer-center span {
    font-weight: 600;
  }

  .footer-right {
    display: flex;
    gap: 32px;
  }

  .footer-link {
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease, transform 0.2s ease;
  }

  .footer-link:hover {
    color: #6366f1;
    transform: translateY(-1px);
  }

  /* ── Dark Mode ── */
  .dark {
    --sidebar-bg: #171725;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --hover-bg: rgba(255,255,255,0.09);
    --primary-light: rgba(99,102,241,0.20);
    --footer-bg: #1a1a2e;
    background: #0f0f1a;
  }

  .dark .content {
    background: #11111b;
  }

  .dark .sidenav {
    background: #171725;
    border-right: 1px solid #2d2d44;
  }

  /* Stronger dark mode overrides for sidebar visibility */
  .dark .nav-list a,
  .dark .nav-list a span,
  .dark .nav-list a mat-icon {
    color: #f1f5f9 !important;
  }

  .dark .nav-list a:hover {
    background: rgba(255,255,255,0.07) !important;
  }

  .dark .nav-list a.active {
    background: rgba(99,102,241,0.25) !important;
    color: #c7d2fe !important;
  }

  .dark .nav-list a.active mat-icon {
    color: #c7d2fe !important;
  }

  .dark .logo-title,
  .dark .logo-subtitle {
    color: #f1f5f9 !important;
  }

  .dark .role-badge.user    { background: rgba(30,41,59,0.75); color: #f1f5f9; }
  .dark .role-badge.admin   { background: #7f1d1d; color: #fecaca; }
  .dark .role-badge.verifier { background: #0c4a6e; color: #bae6fd; }

  .dark .wallet-info {
    background: rgba(30,41,59,0.65);
    border-color: rgba(255,255,255,0.12);
  }

  /* Dark mode footer */
  .dark .app-footer {
    background: #1a1a2e;
    border-top-color: #2d2d44;
    color: #f1f5f9;
  }

  .dark .footer-logo,
  .dark .footer-name,
  .dark .footer-link,
  .dark .footer-center span {
    color: #f1f5f9;
  }

  .dark .footer-center {
    color: #cbd5e1;
  }

  .dark .footer-link:hover {
    color: #c7d2fe;
  }
`]
})

export class AppComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);

  wallet = inject(WalletService);
  auth = inject(AuthService);
  currentYear = new Date().getFullYear();

  private currentUrl = signal<string>(this.router.url);

  miniSidebar = signal(false);
  darkMode = this.themeService.darkMode;
  copied = false;

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects.toLowerCase());
      }
    });
  }

  ngOnInit() {
    this.themeService.initialize();  // ensure <html> class is set on load
  }

  toggleMini() {
    this.miniSidebar.update(v => !v);
  }

  breadcrumb = computed(() => {
    const segment = this.router.url.split('/').pop() || 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  toggleDarkMode() {
    this.themeService.toggle();
    this.cdr.detectChanges();
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