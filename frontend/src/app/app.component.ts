import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="container">
      <header>
        <h1>Decentralized Identity UI</h1>
        <nav>
          <a routerLink="/">Home</a> |
          <a routerLink="/did/register">DID Register</a> |
          <a routerLink="/did/resolve">DID Resolve</a> |
          <a routerLink="/did/verify">DID Verify</a> |
          <a routerLink="/vc/issue">Issue VC</a> |
          <a routerLink="/vc/verify">Verify VC</a> |
          <a routerLink="/claims">Manage Claims</a> |
          <a routerLink="/profile">Manage Profiles</a>
        </nav>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .container { max-width:900px; margin:24px auto; font-family: Arial, sans-serif }
    header nav a { margin-right:8px; }
  `]
})
export class AppComponent {}
