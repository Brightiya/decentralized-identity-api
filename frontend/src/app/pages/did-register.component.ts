import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-did-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Register DID</h2>
    <div>
      <button (click)="connectWallet()">Connect Wallet</button>
      <div *ngIf="walletAddress">Connected: {{ walletAddress }}</div>

      <form (ngSubmit)="register()" #f="ngForm">
        <label>
          Address (optional)
          <input name="address" [(ngModel)]="address" />
        </label><br>

        <label>
          Name
          <input name="name" [(ngModel)]="name" />
        </label><br>

        <label>
          Email
          <input name="email" [(ngModel)]="email" />
        </label><br>

        <button type="submit">Register DID</button>
      </form>

      <pre *ngIf="result">{{ result | json }}</pre>
    </div>
  `
})
export class DidRegisterComponent {
  walletAddress: string | null = null;
  address = '';
  name = '';
  email = '';
  result: any;

  constructor(private wallet: WalletService, private api: ApiService) {}

  async connectWallet() {
    try {
      const r = await this.wallet.connect();
      this.walletAddress = r.address;
      this.address = this.address || r.address;
    } catch (e: any) {
      alert(e.message || e);
    }
  }

  register() {
    const payload = { address: this.address, name: this.name, email: this.email };
    this.api.registerDID(payload).subscribe(
      res => (this.result = res),
      err => (this.result = err.error || err)
    );
  }
}
