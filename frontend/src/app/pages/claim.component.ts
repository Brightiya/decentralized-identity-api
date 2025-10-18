import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimService } from '../services/claim.service';
import { WalletService } from '../services/wallet.service';

@Component({
  selector: 'app-claim',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Manage Claims</h2>
    <button (click)="connectWallet()">Connect Wallet</button>
    <div *ngIf="walletAddress">Connected: {{walletAddress}}</div>

    <hr>

    <section>
      <h3>Set Claim</h3>
      <input placeholder="Claim ID" [(ngModel)]="claimId">
      <input placeholder="Claim Hash" [(ngModel)]="claimHash">
      <button (click)="setClaim()">Set Claim</button>
    </section>

    <section>
      <h3>Get Claim</h3>
      <input placeholder="Claim ID" [(ngModel)]="queryClaimId">
      <button (click)="getClaim()">Fetch Claim</button>
    </section>

    <section>
      <h3>Remove Claim</h3>
      <input placeholder="Claim ID" [(ngModel)]="removeClaimId">
      <button (click)="removeClaim()">Remove Claim</button>
    </section>

    <pre *ngIf="result">{{ result | json }}</pre>
  `
})
export class ClaimComponent {
  walletAddress: string | null = null;
  claimId = '';
  claimHash = '';
  queryClaimId = '';
  removeClaimId = '';
  result: any;

  constructor(private claimService: ClaimService, private wallet: WalletService) {}

  async connectWallet() {
    const r = await this.wallet.connect();
    this.walletAddress = r.address;
  }

  setClaim() {
    if (!this.walletAddress) return alert('Connect wallet first');
    this.claimService.setClaim({
      owner: this.walletAddress,
      claimId: this.claimId,
      claimHash: this.claimHash
    }).subscribe(
      res => this.result = res,
      err => this.result = err.error || err
    );
  }

  getClaim() {
    if (!this.walletAddress) return alert('Connect wallet first');
    this.claimService.getClaim(this.walletAddress, this.queryClaimId)
      .subscribe(
        res => this.result = res,
        err => this.result = err.error || err
      );
  }

  removeClaim() {
    if (!this.walletAddress) return alert('Connect wallet first');
    this.claimService.removeClaim({
      owner: this.walletAddress,
      claimId: this.removeClaimId
    }).subscribe(
      res => this.result = res,
      err => this.result = err.error || err
    );
  }
}
