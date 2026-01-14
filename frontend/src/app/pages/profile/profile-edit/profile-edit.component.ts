// src/app/pages/profile/profile-edit.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { ThemeService } from '../../../services/theme.service';
import { ApiService } from '../../../services/api.service';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="edit-profile-container" [class.dark]="darkMode()">
      <div class="page-header">
        <h1>Edit Profile</h1>
        <p class="subtitle">Update how others see you in the ecosystem</p>
      </div>

      <mat-card class="edit-card glass-card" appearance="outlined">
        <mat-card-content>
          <!-- Loading / Disconnected state -->
          <div class="connection-state" *ngIf="!(wallet.address$ | async)">
            <mat-spinner diameter="48"></mat-spinner>
            <div class="state-message">
              <h3>Waiting for wallet</h3>
              <p class="muted">Connect your wallet to edit your profile</p>
            </div>
          </div>

          <ng-container *ngIf="wallet.address$ | async">
            <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-edit-form">
              <div class="form-grid">
                <!-- Gender -->
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Gender</mat-label>
                  <mat-select formControlName="gender">
                    <mat-option value="">Prefer not to say</mat-option>
                    <mat-option *ngFor="let opt of genderOptions" [value]="opt.value">
                      {{ opt.label }}
                    </mat-option>
                  </mat-select>
                  <mat-hint>Optional • Private by default</mat-hint>
                </mat-form-field>

                <!-- Pronouns -->
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Pronouns</mat-label>
                  <input matInput formControlName="pronouns" 
                         placeholder="they/them, she/her, he/him, ze/zir...">
                  <mat-hint>Free text • Visible to others</mat-hint>
                </mat-form-field>

                <!-- Bio -->
                <mat-form-field appearance="outline" class="form-field full-width">
                  <mat-label>Bio / About me</mat-label>
                  <textarea matInput formControlName="bio" 
                            rows="5" 
                            maxlength="500"
                            placeholder="Share a bit about yourself, your interests, or what you do..."></textarea>
                  <mat-hint align="end">
                    {{ profileForm.get('bio')?.value?.length || 0 }}/500
                  </mat-hint>
                </mat-form-field>
              </div>

              <!-- Online Presence -->
              <div class="links-section">
                <div class="section-header">
                  <h3>Online Presence</h3>
                  <button mat-mini-fab color="primary" 
                          type="button" 
                          (click)="addLink()"
                          matTooltip="Add new link"
                          aria-label="Add link">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>

                <div formArrayName="online_links" class="links-container">
                  <div *ngFor="let link of onlineLinks.controls; let i = index" 
                       [formGroupName]="i" 
                       class="link-item glass-item">
                    <mat-form-field appearance="outline" class="platform">
                      <mat-label>Platform</mat-label>
                      <input matInput formControlName="platform" 
                             placeholder="Twitter / X, GitHub, LinkedIn, Website...">
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="url">
                      <mat-label>URL</mat-label>
                      <input matInput formControlName="url" 
                             placeholder="https://twitter.com/yourhandle">
                      <mat-icon matPrefix>link</mat-icon>
                    </mat-form-field>

                    <button mat-icon-button color="warn" 
                            type="button" 
                            (click)="removeLink(i)"
                            matTooltip="Remove this link">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>

                <div *ngIf="onlineLinks.length === 0" class="empty-links">
                  <mat-icon class="empty-icon">link_off</mat-icon>
                  <p>No links added yet</p>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="profileForm.invalid || saving()"
                        class="save-btn">
                  <mat-icon *ngIf="!saving()">save</mat-icon>
                  <span *ngIf="!saving()">Save Profile</span>
                  <mat-spinner *ngIf="saving()" diameter="20"></mat-spinner>
                </button>

                <button mat-stroked-button type="button" (click)="cancel()">
                  Cancel
                </button>
              </div>
            </form>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `,

  styles: [`
    :host { display: block; }

    .edit-profile-container {
      padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 64px);
      max-width: 900px;
      margin: 0 auto;
      transition: background 0.5s ease;
    }

    .edit-profile-container.dark {
      background: linear-gradient(to bottom, #0f0f1a 0%, #0a0a14 100%);
      color: #e2e8f0;
    }

    /* Header */
    .page-header {
      text-align: center;
      margin-bottom: clamp(32px, 5vw, 56px);
    }

    .page-header h1 {
      font-size: clamp(2.2rem, 5vw, 3.2rem);
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

    /* Card */
    .edit-card {
      border-radius: 24px;
      background: var(--card-bg, rgba(255,255,255,0.78));
      backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--card-border, rgba(226,232,240,0.4));
      overflow: hidden;
      transition: all 0.4s ease;
    }

    .edit-profile-container.dark .edit-card {
      background: rgba(30,41,59,0.48);
      border-color: rgba(100,116,139,0.3);
      backdrop-filter: blur(20px);
    }

    /* Connection State */
    .connection-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 420px;
      gap: 24px;
      color: #94a3b8;
      text-align: center;
    }

    .state-message h3 {
      margin: 0 0 8px;
      color: var(--text-primary);
    }

    /* Form Layout */
    .profile-edit-form {
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 24px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .form-field.full-width {
      grid-column: 1 / -1;
    }

    @media (max-width: 720px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Links */
    .links-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .link-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
      padding: 16px;
      border-radius: 16px;
      background: var(--row-bg, rgba(0,0,0,0.03));
      transition: all 0.25s ease;
    }

    .edit-profile-container.dark .link-item {
      background: rgba(255,255,255,0.05);
    }

    .link-item:hover {
      background: var(--row-hover, rgba(99,102,241,0.08));
    }

    .platform { flex: 1 1 180px; min-width: 140px; }
    .url      { flex: 3 1 340px; min-width: 240px; }

    .empty-links {
      text-align: center;
      padding: 48px 24px;
      color: #94a3b8;
      background: var(--row-bg, rgba(0,0,0,0.02));
      border-radius: 16px;
    }

    .empty-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 12px;
      opacity: 0.7;
    }

    /* Actions */
    .form-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--divider, rgba(226,232,240,0.3));
    }

    .save-btn {
      min-width: 160px;
    }

    @media (max-width: 480px) {
      .form-actions {
        flex-direction: column;
        gap: 12px;
      }
      
      .save-btn {
        width: 100%;
      }
    }
  `]
})
export class ProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  public wallet = inject(WalletService);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute); // ← NEW: inject ActivatedRoute

  profileForm!: FormGroup;
  saving = signal(false);
  loading = signal(true);
  darkMode = this.themeService.darkMode;

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'genderqueer', label: 'Genderqueer' },
    { value: 'transgender', label: 'Transgender' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
    { value: 'other', label: 'Other' }
  ];

  ngOnInit() {
    this.initForm();
    this.loadCurrentProfile();
  }

  private initForm() {
    this.profileForm = this.fb.group({
      gender: [''],
      pronouns: [''],
      bio: ['', [Validators.maxLength(500)]],
      online_links: this.fb.array([])
    });
  }

  get onlineLinks(): FormArray {
    return this.profileForm.get('online_links') as FormArray;
  }

  addLink() {
    this.onlineLinks.push(
      this.fb.group({
        platform: ['', Validators.required],
        url: ['', [Validators.required, Validators.pattern(/^https?:\/\/[^\s$.?#].[^\s]*$/)]]
      })
    );
  }

  removeLink(index: number) {
    this.onlineLinks.removeAt(index);
  }

  private loadCurrentProfile() {
    this.wallet.address$.pipe(take(1)).subscribe(address => {
      if (!address) {
        this.snackBar.open('No wallet connected', 'Close', { duration: 4000 });
        this.loading.set(false);
        return;
      }

      this.apiService.getProfile(address, 'profile').subscribe({
        next: (data: any) => {
          const attr = data.attributes || {} as Record<string, any>; // ← Fix TS7053: broader type

          this.profileForm.patchValue({
            gender: (attr.gender as any)?.code || '',
            pronouns: attr.pronouns || '',
            bio: attr.bio || ''
          });

          // Load existing online links
          if (data.online_links && typeof data.online_links === 'object') {
            Object.entries(data.online_links).forEach(([platform, url]) => {
              this.onlineLinks.push(
                this.fb.group({
                  platform: [platform],
                  url: [url]
                })
              );
            });
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load profile for editing:', err);
          this.snackBar.open('Could not load current profile data', 'Close', { duration: 5000 });
          this.loading.set(false);
        }
      });
    });
  }

  onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.snackBar.open('Please fill required fields correctly', 'Close', { duration: 4000 });
      return;
    }

    this.saving.set(true);

    this.wallet.address$.pipe(take(1)).subscribe(address => {
      if (!address) {
        this.saving.set(false);
        this.snackBar.open('No wallet connected', 'Close', { duration: 3000 });
        return;
      }

      // Prepare online links
      const linksArray = this.onlineLinks.value;
      const online_links = linksArray.reduce((acc: Record<string, string>, item: any) => {
        if (item.platform && item.url) acc[item.platform.trim()] = item.url.trim();
        return acc;
      }, {});

      // Build proper nested structure backend expects
      const payload = {
      owner: address,
      contexts: {
        profile: {
          attributes: {
            gender: this.profileForm.value.gender || undefined,
            pronouns: this.profileForm.value.pronouns || undefined,
            bio: this.profileForm.value.bio || undefined
          },
          online_links: online_links
        }
      },
      credentials: [] // keep empty for now
    };

      // Save profile (using the correct method name)
      this.apiService.createProfile(payload).subscribe({
        next: (response) => {
          this.saving.set(false);
          this.snackBar.open('Profile updated successfully!', 'Close', { duration: 4000 });

          // Navigate back to overview (relative to current route)
          this.router.navigate(['../overview'], { relativeTo: this.activatedRoute });
        },
        error: (err) => {
          console.error('Profile update failed:', err);
          this.saving.set(false);
          this.snackBar.open('Failed to update profile. Try again.', 'Close', { duration: 6000 });
        }
      });
    });
  }

  cancel() {
    this.router.navigate(['../overview'], { relativeTo: this.activatedRoute });
  }
}