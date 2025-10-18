import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service'; // ✅ use ApiService

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  owner = '';
  name = '';
  email = '';
  credentials: string[] = [];
  profileData: any = null;
  message = '';
  loading = false;

  constructor(private api: ApiService) {} // ✅ inject ApiService

  async connectWallet() {
    if ((window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      this.owner = accounts[0];
    } else {
      alert('Please install MetaMask');
    }
  }

  createProfile() {
    if (!this.owner || !this.name || !this.email) {
      this.message = 'Please fill all required fields';
      return;
    }

    this.loading = true;
    this.api.createProfile({
      owner: this.owner,
      name: this.name,
      email: this.email,
      credentials: this.credentials,
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = res.message;
        this.profileData = res;
      },
      error: (err: any) => {
        this.loading = false;
        this.message = err.error?.error || 'Error creating profile';
      }
    });
  }

  getProfile() {
    if (!this.owner) {
      this.message = 'Connect wallet first';
      return;
    }

    this.loading = true;
    this.api.getProfile(this.owner).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.profileData = res.profile;
        this.message = res.message;
      },
      error: (err: any) => {
        this.loading = false;
        this.message = err.error?.error || 'Error fetching profile';
      }
    });
  }
}
