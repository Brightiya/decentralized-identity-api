import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-vc-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Issue Verifiable Credential</h2>
    <div>
      <button (click)="connect()">Connect Wallet</button>
      <div *ngIf="address">Connected: {{address}}</div>
      <form (ngSubmit)="issue()">
        <label>Subject address <input [(ngModel)]="subject" name="subject"></label><br>
        <label>Claim ID <input [(ngModel)]="claimId" name="claimId"></label><br>
        <label>Claim JSON <textarea [(ngModel)]="claim" name="claim"></textarea></label><br>
        <button type="submit">Issue VC</button>
      </form>
      <pre *ngIf="result">{{result | json}}</pre>
    </div>
  `
})
export class VcIssueComponent {
  address: string | null = null;
  subject = '';
  claimId = 'identity.email';
  claim = '{"email":"bright@example.com"}';
  result: any;

  constructor(private wallet: WalletService, private api: ApiService) {}

  async connect(){ try{ const r = await this.wallet.connect(); this.address = r.address;}catch(e:any){alert(e.message||e)} }

  issue(){
    let claimObj;
    try { claimObj = JSON.parse(this.claim); } catch(e){ alert('Claim must be JSON'); return; }
    const payload = {
      issuer: this.address,
      subject: this.subject,
      claimId: this.claimId,
      claim: claimObj
    };
    this.api.issueVC(payload).subscribe(r => this.result = r, e => this.result = e.error || e);
  }
}
