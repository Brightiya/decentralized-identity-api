// src/app/pages/profile/profile-overview.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ThemeService } from '../../../services/theme.service';
import { ApiService } from '../../../services/api.service';
import { WalletService } from '../../../services/wallet.service';

interface ProfileData {
  did: string;
  context: string;
  attributes: {
    gender?: { code: string; label: string } | null;
    pronouns?: string;
    bio?: string;
    [key: string]: any;
  };
  online_links?: { [key: string]: string };
  credentials?: Array<{ cid: string; claimId: string; context: string }>;
  note?: string;
}

@Component({
  selector: 'app-profile-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  template: `
    <div class="overview-container" [class.dark]="darkMode()">
      <div class="page-header">
        <h1>Profile Overview</h1>
        <p class="subtitle">Your current personal information across contexts</p>
      </div>

      <!-- Context Selector -->
      <mat-form-field appearance="outline" class="context-selector glass-select">
        <mat-label>Viewing Context</mat-label>
        <mat-select [(ngModel)]="selectedContext" 
                    (selectionChange)="loadProfile()"
                    panelClass="context-dropdown">
          <mat-option *ngFor="let ctx of allowedContexts" [value]="ctx">
            {{ ctx | titlecase }}
          </mat-option>
        </mat-select>
        <mat-hint>Switch to view different attribute sets</mat-hint>
      </mat-form-field>

      <ng-container *ngIf="loading(); else content">
        <div class="loading-state">
          <mat-spinner diameter="56"></mat-spinner>
          <div class="state-message">
            <h3>Loading profile data...</h3>
            <p class="muted">Fetching information for {{ selectedContext() | titlecase }}</p>
          </div>
        </div>
      </ng-container>

      <ng-template #content>
        <ng-container *ngIf="profile(); let data">
          <mat-card class="profile-card glass-card" appearance="outlined">
            <mat-card-header>
              <mat-icon class="avatar-icon" mat-card-avatar>person</mat-icon>
              <mat-card-title>Personal Information</mat-card-title>
              <mat-card-subtitle>Context: {{ data.context | titlecase }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="profile-grid">
                <!-- Gender -->
            <div class="profile-item" *ngIf="data.attributes?.gender as gender">
              <div class="label">Gender</div>
              <div class="value">
                {{ gender.label }}
                <span class="gender-code" *ngIf="gender.code">
                  ({{ gender.code }})          
                </span>
            </div>
                </div>

                <!-- Pronouns -->
                <div class="profile-item" *ngIf="data.attributes?.pronouns">
                  <div class="label">Pronouns</div>
                  <div class="value">{{ data.attributes.pronouns }}</div>
                </div>

                <!-- Bio -->
                <div class="profile-item bio-item" *ngIf="data.attributes?.bio">
                  <div class="label">About me</div>
                  <div class="value bio-content">
                    {{ data.attributes.bio }}
                  </div>
                </div>

                <!-- Online Presence -->
                <div class="profile-item links-item" *ngIf="hasLinks(data)">
                  <div class="label">Online Presence</div>
                  <div class="value links-grid">
                    <a *ngFor="let link of getLinks(data)"
                       [href]="link.url" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="link-chip external-link"
                       >
                      <mat-icon class="link-icon"
                      matTooltip="{{ link.platform | titlecase }} profile"
                      >{{ getIcon(link.platform) }}</mat-icon>
                      {{ link.platform | titlecase }}
                    </a>
                  </div>
                </div>

                <!-- Empty personal data state -->
                <div class="empty-personal" *ngIf="!hasPersonalData(data)">
                  <mat-icon class="empty-icon">info_outline</mat-icon>
                  <h3>No personal information yet</h3>
                  <p class="muted">
                    This context doesn't contain any personal details at the moment.
                  </p>
                  <button mat-stroked-button color="primary" routerLink="../edit">
                    Add Information
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Backend note (if any) -->
          <div class="backend-note glass-note" *ngIf="data.note">
            <mat-icon>info_outline</mat-icon>
            <span>{{ data.note }}</span>
          </div>

          <!-- Refresh -->
          <div class="refresh-area">
            <button mat-stroked-button (click)="loadProfile()">
              <mat-icon>refresh</mat-icon>
              Refresh Data
            </button>
          </div>
        </ng-container>

        <!-- Error state -->
        <ng-container *ngIf="error()">
          <mat-card class="error-card glass-card">
            <mat-card-content class="error-content">
              <mat-icon color="warn">error_outline</mat-icon>
              <h3>Failed to load profile</h3>
              <p class="muted">{{ error() }}</p>
              <button mat-raised-button color="primary" (click)="loadProfile()">
                Try Again
              </button>
            </mat-card-content>
          </mat-card>
        </ng-container>
      </ng-template>
    </div>
  `,

  styles: [`
    :host { display: block; }

    .overview-container {
      padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 64px);
      max-width: 900px;
      margin: 0 auto;
      transition: background 0.5s ease;
    }

    .overview-container.dark {
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

    /* Context Selector */
    .context-selector {
      width: 100%;
      max-width: 340px;
      margin: 0 auto 40px;
      display: block;
    }

    .glass-select {
      background: var(--card-bg, rgba(255,255,255,0.75));
      backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid var(--card-border, rgba(226,232,240,0.4));
    }

    ::ng-deep .context-dropdown {
      border-radius: 16px !important;
    }

    /* Card */
    .profile-card {
      border-radius: 24px;
      background: var(--card-bg, rgba(255,255,255,0.78));
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--card-border, rgba(226,232,240,0.4));
      overflow: hidden;
      margin-bottom: 32px;
    }

    .overview-container.dark .profile-card {
      background: rgba(30,41,59,0.48);
      border-color: rgba(100,116,139,0.3);
    }

    .avatar-icon {
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      color: white;
      border-radius: 12px;
    }

    /* Profile Grid */
    .profile-grid {
      display: grid;
      gap: 24px;
      padding: 8px 0;
    }

    .profile-item {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 16px;
      align-items: start;
      padding: 12px 0;
    }

    .label {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .value {
      line-height: 1.6;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .gender-code {
      font-size: 0.85rem;
      opacity: 0.65;
      margin-left: 8px;
      color: #64748b;
    }

    .bio-content {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.7;
    }

    .links-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .link-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--chip-bg, rgba(99,102,241,0.08));
      border-radius: 999px;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.25s ease;
    }
          .external-link {
      cursor: pointer;
      text-decoration: none;
    }

    /* Optional: make it more obviously clickable */
    .external-link:hover,
    .external-link:focus {
      text-decoration: underline;
      background: rgba(99,102,241,0.12);
    }

    .overview-container.dark .link-chip {
      background: rgba(99,102,241,0.18);
      color: #a5b4fc;
    }

    .link-chip:hover {
      background: var(--chip-hover, rgba(99,102,241,0.18));
      transform: translateY(-1px);
    }

    .link-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
    }

    /* Empty state */
    .empty-personal {
      text-align: center;
      padding: 64px 32px;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 56px;
      height: 56px;
      width: 56px;
      margin-bottom: 16px;
      opacity: 0.7;
    }

    /* Note & Refresh */
    .backend-note.glass-note {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--notice-bg, rgba(99,102,241,0.08));
      border-radius: 16px;
      margin: 24px 0;
      font-size: 0.95rem;
      color: #4f46e5;
    }

    .overview-container.dark .glass-note {
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
    }

    .refresh-area {
      text-align: center;
      margin-top: 32px;
    }

    /* Error */
    .error-card {
      border-radius: 20px;
      text-align: center;
      padding: 48px 32px;
    }

    .error-content mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }

    /* Responsive */
    @media (max-width: 720px) {
      .profile-item {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }

    @media (max-width: 480px) {
      .context-selector {
        max-width: 100%;
      }
    }
  `]
})
export class ProfileOverviewComponent implements OnInit {
  private apiService = inject(ApiService);
  public wallet = inject(WalletService);
  private themeService = inject(ThemeService);

  loading = signal(true);
  error = signal<string | null>(null);
  profile = signal<ProfileData | null>(null);
  darkMode = this.themeService.darkMode;
  selectedContext = signal('profile');
  allowedContexts = ['profile', 'identity', 'medical', 'professional', 'compliance'];

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading.set(true);
    this.error.set(null);

    this.wallet.address$.pipe(
      switchMap(address => {
        if (!address) {
          this.error.set("No wallet connected");
          this.loading.set(false);
          return of(null);
        }

        return this.apiService.getProfile(address, this.selectedContext());
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          this.profile.set(response);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Profile fetch error:', err);
        this.error.set("Failed to load profile. Please try again later.");
        this.loading.set(false);
      }
    });
  }

  hasPersonalData(data: ProfileData): boolean {
    const attr = data.attributes || {};
    return !!(
      attr.gender?.label ||
      attr.pronouns ||
      attr.bio ||
      this.hasLinks(data)
    );
  }

  hasLinks(data: ProfileData): boolean {
    return !!(data.online_links && Object.keys(data.online_links).length > 0);
  }

  getLinks(data: ProfileData): { platform: string; url: string }[] {
    if (!data.online_links) return [];
    return Object.entries(data.online_links).map(([platform, url]) => ({
      platform,
      url
    }));
  }

  getIcon(platform: string): string {
    const icons: Record<string, string> = {
      twitter: 'twitter',
      x: 'twitter',
      linkedin: 'linkedin',
      github: 'code',
      website: 'language',
      instagram: 'photo_camera',
      mastodon: 'language',
      facebook: 'facebook',
      youtube: 'play_circle',
      discord: 'group',
      telegram: 'send',
      default: 'link'
    };
    const lowerPlatform = platform.toLowerCase();
    return icons[lowerPlatform] || icons['default'] || 'link';
  }
}