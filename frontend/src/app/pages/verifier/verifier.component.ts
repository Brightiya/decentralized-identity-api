import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';      // ← Import ApiService
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-verifier',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './verifier.component.html',
 styleUrls: ['./verifier.component.scss']
})
export class VerifierComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);          // ← Use ApiService
  wallet = inject(WalletService);

  form: FormGroup;
  isSubmitting = false;
  result: any = null;
  error: string | null = null;

  get credentialsArray(): FormArray {
    return this.form.get('credentials') as FormArray;
  }

  constructor() {
    this.form = this.fb.group({
      subject: ['', Validators.required],
      verifierDid: ['', Validators.required],
      purpose: ['', Validators.required],
      consent: [false, Validators.requiredTrue],
      credentials: this.fb.array([])
    });

    this.wallet.address$.subscribe(addr => {
      if (addr) {
        this.form.patchValue({
          subject: `did:ethr:${addr}`
        });
      }
    });
  }

  addCredential() {
    this.credentialsArray.push(
      this.fb.group({
        claimId: ['', Validators.required],
        cid: ['', Validators.required]
      })
    );
  }

  removeCredential(index: number) {
    this.credentialsArray.removeAt(index);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.result = null;
    this.error = null;

    const payload = {
      subject: this.form.value.subject,
      verifierDid: this.form.value.verifierDid,
      purpose: this.form.value.purpose,
      consent: this.form.value.consent,
      credentials: this.credentialsArray.value
    };

    try {
      const response = await this.api.verifyVC(payload).toPromise();  // ← Use ApiService method
      this.result = response;
    } catch (err: any) {
      this.error = err.error?.error || err.message || 'Verification failed';
      console.error('Verification error:', err);
    } finally {
      this.isSubmitting = false;
    }
  }
}