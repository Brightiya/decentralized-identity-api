import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-did-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Welcome</h2>
    <p>Use the navigation to register DIDs, issue/verify VCs, and resolve DIDs.</p>
  `
})
export class HomeComponent {}
