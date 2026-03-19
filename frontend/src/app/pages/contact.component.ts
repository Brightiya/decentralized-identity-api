import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-wrapper">
      <mat-card class="contact-card">
        <mat-card-header>
          <mat-card-title>Get in Touch</mat-card-title>
          <mat-card-subtitle>We reply within 48 hours</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="contactForm" (ngSubmit)="sendMessage()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" required>
              <mat-error *ngIf="contactForm.get('name')?.hasError('required')">
                Name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required>
              <mat-error *ngIf="contactForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="contactForm.get('email')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Subject</mat-label>
              <mat-select formControlName="subject" required>
                <mat-option value="support">Support / GDPR Request</mat-option>
                <mat-option value="feedback">Feedback</mat-option>
                <mat-option value="bug">Report a Bug</mat-option>
                <mat-option value="other">Other</mat-option>
              </mat-select>
              <mat-error *ngIf="contactForm.get('subject')?.hasError('required')">
                Subject is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Message</mat-label>
              <textarea matInput formControlName="message" rows="6" required></textarea>
              <mat-error *ngIf="contactForm.get('message')?.hasError('required')">
                Message is required
              </mat-error>
              <mat-error *ngIf="contactForm.get('message')?.hasError('minlength')">
                Message must be at least 10 characters
              </mat-error>
            </mat-form-field>

            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              [disabled]="contactForm.invalid || isLoading()"
              class="submit-btn">
              <mat-spinner *ngIf="isLoading()" diameter="20"></mat-spinner>
              <span *ngIf="!isLoading()">Send Message</span>
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 40px 20px; max-width: 620px; margin: 0 auto; }
    .contact-card { 
      background: rgba(255,255,255,0.85); 
      backdrop-filter: blur(20px); 
      border-radius: 24px; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.08); 
    }
    .dark .contact-card { background: rgba(20,25,35,0.85); }
    .full-width { width: 100%; margin-bottom: 20px; }
    .submit-btn { 
      width: 100%; 
      height: 56px; 
      font-size: 1.1rem; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 12px; 
    }
  `]
})
export class ContactComponent {
  // Angular component responsible for handling the contact form UI and submission logic

  private fb = inject(FormBuilder);
  // Injects Angular FormBuilder to create reactive forms

  private snackBar = inject(MatSnackBar);
  // Injects Angular Material SnackBar for user notifications

  contactForm = this.fb.group({
    name: ['', Validators.required],
    // Name field (required)

    email: ['', [Validators.required, Validators.email]],
    // Email field (required + must be valid email format)

    subject: ['', Validators.required],
    // Subject field (required)

    message: ['', [Validators.required, Validators.minLength(10)]]
    // Message field (required + minimum length of 10 characters)
  });

  isLoading = signal(false);
  // Reactive signal to track loading state (e.g., disable UI during submission)

  async sendMessage() {
  // Method to handle form submission asynchronously

  if (this.contactForm.invalid) return;
  // Prevent submission if form validation fails

  this.isLoading.set(true);
  // Set loading state to true

  try {
    // Use relative path (same origin on Fly) – preferred
    const apiUrl = '/api/contact';  
    // Relative API endpoint (resolved to deployed backend URL)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Sends JSON request

      body: JSON.stringify(this.contactForm.value),
      // Serializes form data into JSON payload
    });

    let result;
    try {
      result = await response.json();
      // Attempts to parse JSON response
    } catch {
      result = {};
      // Fallback if response is not valid JSON
    }

    if (response.ok && result.success) {
      // Checks for successful HTTP response and backend success flag

      this.snackBar.open('✅ Thank you! Your message has been received.', 'Close', {
        duration: 6000,
        panelClass: ['success-snack']
      });
      // Displays success notification

      this.contactForm.reset();
      // Resets the form after successful submission
    } else {
      const detail = result.detail || result.message || `Failed (HTTP ${response.status})`;
      // Extracts error message from response or constructs fallback message

      this.snackBar.open(`❌ ${detail}`, 'Close', {
        duration: 15000,
        panelClass: ['error-snack']
      });
      // Displays error notification with details
    }
  } catch (err) {
    // Handles network or unexpected errors

    this.snackBar.open('❌ Network/server error – check browser console!', 'Close', {
      duration: 12000,
      panelClass: ['error-snack']
    });
    // Displays generic error notification
  } finally {
    this.isLoading.set(false);
    // Resets loading state regardless of success or failure
  }
}
}