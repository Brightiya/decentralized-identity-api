import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-did-resolve',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Resolve DID</h2>
    <input placeholder="Address" [(ngModel)]="address" />
    <button (click)="resolve()">Resolve</button>
    <pre *ngIf="result">{{ result | json }}</pre>
  `
})
export class DidResolveComponent {
  address = '';
  result: any;
  constructor(private api: ApiService) {}
  resolve() {
    this.api.resolveDID(this.address).subscribe(r => this.result = r, e => this.result = e.error || e);
  }
}
