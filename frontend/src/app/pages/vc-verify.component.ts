/*** 
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-verify-vc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Verify Verifiable Credential</h2>

    <section class="card">
      <label>VC CID</label>
      <input class="input" [(ngModel)]="cid" placeholder="Qm..." />

      <label>Claim ID</label>
      <input class="input" [(ngModel)]="claimId" placeholder="identity.email" />

      <label>Subject DID</label>
      <input class="input" [(ngModel)]="subject" placeholder="did:ethr:0x..." />

      <label>Verifier DID</label>
      <input class="input" [(ngModel)]="verifierDid" placeholder="did:web:verifier.com" />

      <label>Disclosure Purpose</label>
      <input
        class="input"
        [(ngModel)]="purpose"
        placeholder="e.g. employment verification"
      />

      <div class="checkbox">
        <input type="checkbox" [(ngModel)]="consent" />
        <span>
          I confirm I have the subject’s explicit consent for this purpose
        </span>
      </div>

      <button class="btn" (click)="verify()" [disabled]="loading">
        Verify Credential
      </button>
    </section>

    <section *ngIf="error" class="error">
      ❌ {{ error }}
    </section>

    <section *ngIf="result" class="success">
      ✅ Credential verified successfully
      <pre>{{ result | json }}</pre>
    </section>
  `,
  styles: [`
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      max-width: 520px;
      box-shadow: 0 2px 6px rgba(0,0,0,.05);
    }
    .input {
      width: 100%;
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .btn {
      margin-top: 12px;
      padding: 10px;
      width: 100%;
      border-radius: 8px;
      border: none;
      background: #1976d2;
      color: white;
      cursor: pointer;
    }
    .checkbox {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 10px 0;
    }
    .error {
      margin-top: 16px;
      color: #b00020;
    }
    .success {
      margin-top: 16px;
      color: #2e7d32;
    }
  `]
})
export class VerifyVcComponent {
  cid = '';
  claimId = '';
  subject = '';
  verifierDid = '';
  purpose = '';
  consent = false;

  loading = false;
  error = '';
  result: any = null;

  constructor(private api: ApiService) {}

  verify() {
    this.error = '';
    this.result = null;

    if (!this.consent) {
      this.error = 'Explicit consent is required';
      return;
    }

    this.loading = true;

    this.api.verifyVC({
      cid: this.cid,
      claimId: this.claimId,
      subject: this.subject,
      verifierDid: this.verifierDid,
      purpose: this.purpose,
      consent: true
    }).subscribe({
      next: res => {
        this.loading = false;
        this.result = res;
      },
      error: err => {
        this.loading = false;

        if (err.status === 410) {
          this.error = 'This credential has been erased by the subject';
        } else {
          this.error = err.error?.error || 'Verification failed';
        }
      }
    });
  }
}
  */
