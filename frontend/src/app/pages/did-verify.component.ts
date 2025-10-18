import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-did-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Verify DID</h2>
    <div>
      <button (click)="connect()">Connect Wallet</button>
      <div *ngIf="address">Wallet: {{address}}</div>
      <button (click)="signAndVerify()" [disabled]="!address">Sign + Verify DID</button>
      <pre *ngIf="result">{{result | json}}</pre>
    </div>
  `
})
export class DidVerifyComponent {
  address: string | null = null;
  result: any;

  constructor(private wallet: WalletService, private api: ApiService) {}

  async connect() {
    try {
      const r = await this.wallet.connect();
      this.address = r.address;
    } catch (e: any) {
      alert(e.message || e);
    }
  }

  async signAndVerify() {
    if (!this.address) return;
    const did = `did:ethr:${this.address}`;
    const message = `Verifying DID ownership for ${did}`;
    const signature = await this.wallet.signMessage(message);
    this.api.verifyDID({ address: this.address, signature }).subscribe(
      r => this.result = r,
      e => this.result = e.error || e
    );
  }
}
