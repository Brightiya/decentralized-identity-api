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
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

import { WalletService } from './services/wallet.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <mat-sidenav-container 
  class="sidenav-container"
  [class.dark]="darkMode()"
  [class.mini]="miniSidebar()">

  <!-- ── Responsive Sidebar ── -->
  <mat-sidenav
    *ngIf="auth.isAuthenticated()"
    #sidenav
    [fixedInViewport]="isMobile()"
    [mode]="isMobile() ? 'over' : 'side'"
    [opened]="!isMobile() || sidenavOpened()"
    (openedChange)="sidenavOpened.set($event)"
    hasBackdrop="false"
    class="sidenav glass-sidebar">

    <!-- Logo / Brand -->
    <div class="brand-header" 
         (click)="toggleMini()"
         matTooltip="Privacy Identity Management Vault"
         matTooltipPosition="right">
      <div class="header-icon-wrapper">
        <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
             class="custom-shield">
          <path d="M16 2C8.5 2 3 7.5 3 15C3 25 16 30 16 30C16 30 29 25 29 15C29 7.5 23.5 2 16 2Z"
                fill="#6366f1" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.5"/>
          <rect x="14" y="19" width="4" height="9" rx="2" fill="#ffffff"/>
          <circle cx="16" cy="16" r="3" fill="#ffffff" opacity="0.4"/>
        </svg>
      </div>
      <div class="brand-text" [class.collapsed]="miniSidebar()">
        <div class="brand-name">PIMV</div>
        <div class="brand-subtitle">Identity Vault</div>
      </div>
    </div>

    <!-- Navigation -->
    <mat-nav-list class="nav-list">
      <!-- USER -->
      <ng-container *ngIf="auth.role() === 'USER'">
        <a mat-list-item routerLink="/vault" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>lock_outline</mat-icon>
          <span matListItemTitle>Vault</span>
        </a>
        <a mat-list-item routerLink="/credentials" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>badge</mat-icon>
          <span matListItemTitle>Credentials</span>
        </a>
        <a mat-list-item routerLink="/contexts" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>layers</mat-icon>
          <span matListItemTitle>Contexts</span>
        </a>
        <a mat-list-item routerLink="/consent" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>task_alt</mat-icon>
          <span matListItemTitle>Consent</span>
        </a>
        <a mat-list-item routerLink="/disclosures" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>share</mat-icon>
          <span matListItemTitle>Disclosures</span>
        </a>
        <a mat-list-item routerLink="/gdpr" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>policy</mat-icon>
          <span matListItemTitle>GDPR</span>
        </a>
      </ng-container>

      <!-- ADMIN -->
      <ng-container *ngIf="auth.role() === 'ADMIN'">
        <a mat-list-item routerLink="/advanced" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>settings_suggest</mat-icon>
          <span matListItemTitle>Advanced</span>
        </a>
      </ng-container>

      <!-- VERIFIER -->
      <ng-container *ngIf="auth.role() === 'VERIFIER'">
        <a mat-list-item routerLink="/verifier" routerLinkActive="active" class="nav-item">
          <mat-icon matListItemIcon>verified_user</mat-icon>
          <span matListItemTitle>Verifier</span>
        </a>
      </ng-container>
    </mat-nav-list>
  </mat-sidenav>

  <!-- ── Main Area ── -->
  <mat-sidenav-content class="main-content">

    <!-- Modern Toolbar -->
    <mat-toolbar color="primary" class="main-toolbar">
      <!-- Menu button (mobile only) -->
      <button mat-icon-button class="menu-btn" 
              (click)="sidenav.toggle()" 
              *ngIf="isMobile() && auth.isAuthenticated()">
        <mat-icon>menu</mat-icon>
      </button>

      <!-- Mini toggle (desktop only) -->
      <button mat-icon-button class="menu-btn mini-toggle" 
              (click)="toggleMini()" 
              *ngIf="!isMobile() && auth.isAuthenticated()"
              matTooltip="Toggle sidebar">
        <mat-icon>menu_open</mat-icon>
      </button>

      <div class="breadcrumb">{{ breadcrumb() }}</div>

      <span class="toolbar-spacer"></span>

      <!-- Role Indicator -->
      <div class="role-pill"
           *ngIf="auth.isAuthenticated() && wallet.address"
           [ngClass]="{
             'role-user': auth.role() === 'USER',
             'role-admin': auth.role() === 'ADMIN',
             'role-verifier': auth.role() === 'VERIFIER'
           }">
        {{ displayRole() }}
      </div>

      <!-- Wallet Connection -->
      <div class="wallet-section" *ngIf="wallet.address; else connectWalletBtn">
        <div class="address-pill">
          <code>{{ wallet.address | slice:0:6 }}…{{ wallet.address | slice:-4 }}</code>
          <button mat-icon-button class="copy-btn" (click)="copyAddress()" matTooltip="Copy address">
            <mat-icon>{{ copied ? 'check_circle' : 'content_copy' }}</mat-icon>
          </button>
        </div>
      </div>

      <ng-template #connectWalletBtn>
        <button mat-stroked-button class="connect-btn" (click)="connectWallet()">
          <mat-icon>wallet</mat-icon>
          Connect Wallet
        </button>
      </ng-template>

      <!-- Dark Mode Toggle -->
      <mat-slide-toggle
        class="theme-toggle"
        [checked]="darkMode()"
        (change)="toggleDarkMode()"
        aria-label="Toggle theme">
      </mat-slide-toggle>

      <!-- User Menu -->
      <ng-container *ngIf="wallet.address">
        <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
          <mat-icon style="color: white !important;">account_circle</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
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

    <!-- Page Content -->
    <main class="page-content">
      <router-outlet></router-outlet>
    </main>

    <!-- Modern Footer -->
    <footer class="main-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <span class="footer-logo">PIMV</span>
          <span class="footer-title">Privacy Identity Management Vault</span>
        </div>

        <div class="footer-copyright">
          © {{ currentYear }} • All rights reserved
        </div>

        <div class="footer-links">
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
    overflow: hidden;
  }

  .sidenav-container {
    height: 100%;
    background: #f9fafb;
    transition: background 0.5s ease;
  }

  .sidenav-container.dark {
    background: #0d1117;
  }

  /* ── Glassmorphic Sidebar ── */
  .glass-sidebar {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(20px) saturate(160%);
    border-right: 1px solid rgba(226,232,240,0.4);
    box-shadow: 4px 0 30px rgba(0,0,0,0.08);
    transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
  }

  .sidenav-container.dark .glass-sidebar {
    background: rgba(20,25,35,0.65);
    border-right-color: rgba(100,116,139,0.35);
    box-shadow: 4px 0 40px rgba(0,0,0,0.45);
  }

  .sidenav-container.mini .glass-sidebar {
    width: 84px !important;
  }

  /* Brand Header */
  .brand-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 28px 20px;
    cursor: pointer;
    transition: all 0.35s ease;
  }

  .brand-header:hover {
    background: rgba(99,102,241,0.08);
  }

  .brand-text {
    transition: opacity 0.4s ease;
  }

  .brand-text.collapsed {
    opacity: 0;
    width: 0;
  }

  .brand-name {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.8px;
    background: linear-gradient(90deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .brand-subtitle {
    font-size: 0.78rem;
    font-weight: 500;
    color: #94a3b8;
    margin-top: 2px;
  }

  .header-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(99,102,241,0.45);
    overflow: hidden;
    transition: transform 0.3s ease;
  }

  .header-icon-wrapper:hover {
    transform: scale(1.08);
  }

  .custom-shield {
    width: 56px;
    height: 56px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
  }

  /* Navigation */
  .nav-list .nav-item {
    margin: 8px 12px;
    border-radius: 16px;
    height: 54px;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .nav-list .nav-item:hover {
    background: rgba(99,102,241,0.09);
  }

  .nav-list .nav-item.active {
    background: rgba(99,102,241,0.18);
    color: #6366f1;
    font-weight: 600;
  }

  .nav-list .nav-item mat-icon {
    color: #64748b;
  }

  .nav-list .nav-item.active mat-icon {
    color: #6366f1;
  }

  /* Toolbar – full width fix + visibility */
  .main-toolbar {
  background: rgba(99,102,241,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.15);
  padding: 0 28px;
  min-height: 72px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);

  /* Full-width fixes */
  width: 100vw;
  max-width: 100vw;
  margin: 0 calc(-50vw + 50%);
  box-sizing: border-box;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

  .sidenav-container.dark .main-toolbar {
    background: rgba(30,41,59,0.88);
  }

  .menu-btn {
    margin-right: 16px;
    color: white;
  }

  .breadcrumb {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    letter-spacing: 0.3px;
  }

  .toolbar-spacer {
    flex: 1 1 auto;
  }

  /* Role Pill */
  .role-pill {
    padding: 6px 18px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.6px;
    color: white;
    backdrop-filter: blur(8px);
  }

  .role-user    { background: rgba(34,197,94,0.75); }
  .role-admin   { background: rgba(239,68,68,0.75); }
  .role-verifier { background: rgba(59,130,246,0.75); }

  /* Wallet & Icons – ensure visibility */
  .wallet-section {
    margin-right: 24px;
  }

  .address-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.92rem;
    border: 1px solid rgba(255,255,255,0.12);
  }

  .copy-btn,
  .user-menu-btn mat-icon,
  .theme-toggle mat-slide-toggle-thumb,
  .connect-btn mat-icon {
    color: white !important;
  }

  .user-menu-btn {
    margin-left: 8px;
  }

  /* Content Area */
  .page-content {
    flex: 1;
    padding: clamp(24px, 4vw, 40px);
    overflow-y: auto;
    background: transparent;
  }

  /* Modern Footer */
  .main-footer {
    background: rgba(30,41,59,0.04);
    border-top: 1px solid rgba(226,232,240,0.3);
    padding: 28px 40px;
    font-size: 0.92rem;
    color: #64748b;
  }

  .sidenav-container.dark .main-footer {
    background: rgba(15,17,26,0.45);
    border-top-color: rgba(100,116,139,0.3);
    color: #94a3b8;
  }

  .footer-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .footer-logo {
    font-size: 1.4rem;
    font-weight: 800;
    background: linear-gradient(90deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .footer-title {
    font-weight: 600;
  }

  .footer-copyright {
    text-align: center;
    flex: 1;
  }

  .footer-links {
    display: flex;
    gap: 32px;
  }

  .footer-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.25s ease;
  }

  .footer-link:hover {
    color: #6366f1;
  }

  /* ── Mobile & Tablet responsiveness ── */

  @media (max-width: 960px) {
  .main-toolbar {
    padding: 0 16px;
    min-height: 64px;
    /* Remove centering hack on small screens — just full width */
    margin: 0 !important;
    left: 0 !important;
    transform: none !important;
    width: 100% !important;
  }
}
  @media (max-width: 960px) {
    .sidenav-container {
      overflow: hidden;
    }

    .glass-sidebar {
      width: 280px !important;
      box-shadow: -8px 0 32px rgba(0,0,0,0.4);
      z-index: 1000;
    }

    .sidenav-container.mini .glass-sidebar {
      width: 280px !important;
    }

    .main-content {
      transition: margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .main-toolbar {
      padding: 0 16px;
      min-height: 64px;
    }

    .page-content {
      padding: 16px;
    }

    .footer-container {
      flex-direction: column;
      text-align: center;
      gap: 16px;
      padding: 24px 16px;
    }

    .footer-links {
      gap: 24px;
      justify-content: center;
    }

    .menu-btn {
      display: inline-flex;
    }

    .mini-toggle {
      display: none !important;
    }

    .toolbar-spacer {
      flex: 0.5 1 auto !important;
    }

    .wallet-section, .role-pill, .theme-toggle {
      margin-right: 8px !important;
    }

    .user-menu-btn {
      margin-right: 0 !important;
    }
  }

  /* Drawer backdrop */
  .mat-drawer-backdrop {
    background-color: rgba(0,0,0,0.5) !important;
  }

  /* Extra small screens */
  @media (max-width: 600px) {
    .main-toolbar {
      padding: 0 12px;
    }
  }
    @media (max-width: 600px) {
  .main-toolbar {
    padding: 0 12px;
  }
}

  @media (max-width: 360px) {
    button, .actions button {
      font-size: 0.8rem;
      padding: 6px 10px;
    }

    .badge {
      padding: 2px 8px;
      font-size: 0.7rem;
    }

    h1 {
      font-size: 1.3rem;
    }
  }
    /* Desktop toolbar — respects sidenav width */
    @media (min-width: 961px) {
      .main-toolbar {
        width: 100%;
        margin: 0;
        left: auto;
        transform: none;
        max-width: none;
      }
    }

    .main-toolbar {
      overflow: visible !important;
    }

    .user-menu-btn {
      flex-shrink: 0;
      margin-left: 8px;
    }



`]
})

export class AppComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private router = inject(Router);
  private titleService = inject(Title);
  private cdr = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);

  wallet = inject(WalletService);
  auth = inject(AuthService);
  currentYear = new Date().getFullYear();

  private currentUrl = signal<string>(this.router.url);

  miniSidebar = signal(false);
  darkMode = this.themeService.darkMode;
  copied = false;

  // NEW: controls drawer open/close on mobile
  sidenavOpened = signal(false);
  // NEW: reference to the sidenav component
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects.toLowerCase());
      }
    });
  }

  ngOnInit() {
    this.themeService.initialize();  // ensure <html> class is set on load

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      let title = 'PIMV – Identity Vault'; // fallback

      // Get the current route snapshot (last child)
      let currentRoute = this.router.routerState.snapshot.root;
      while (currentRoute.firstChild) {
        currentRoute = currentRoute.firstChild;
      }

      // Use route data.title if set, or fallback to capitalized path
      const routeTitle = currentRoute.data?.['title'];
      if (routeTitle) {
        title = `${routeTitle} • PIMV`;
      } else {
        // Fallback: capitalize last URL segment
        const path = currentRoute.url.map(segment => segment.path).join(' ');
        if (path) {
          title = `${this.capitalize(path)} • PIMV`;
        }
      }

      this.titleService.setTitle(title);
    });

    // Optional: close drawer on navigation on mobile
    if (this.isBrowser) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        if (this.isMobile()) {
          this.sidenavOpened.set(false);
        }
      });
    }
  }

  private capitalize(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    this.wallet.disconnect();
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

  // NEW: detect mobile/tablet screens
  isMobile() {
    if (!this.isBrowser) return false;
    return window.innerWidth <= 960; // breakpoint for mobile/tablet
  }
}