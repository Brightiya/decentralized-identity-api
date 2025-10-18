import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
   selector: 'app-vc-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Verify Verifiable Credential</h2>
    <input placeholder="CID or ipfs://CID" [(ngModel)]="cid" />
    <input placeholder="Claim ID" [(ngModel)]="claimId" />
    <input placeholder="Subject address" [(ngModel)]="subject" />
    <button (click)="verify()">Verify</button>
    <pre *ngIf="result">{{result | json}}</pre>
  `
})
export class VcVerifyComponent {
  cid = '';
  claimId = 'identity.email';
  subject = '';
  result: any;
  constructor(private api: ApiService) {}
  verify(){
    const payload = { cid: this.cid.replace('ipfs://',''), claimId: this.claimId, subject: this.subject };
    this.api.verifyVC(payload).subscribe(r => this.result = r, e => this.result = e.error || e);
  }
}
