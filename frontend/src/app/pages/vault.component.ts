// src/app/pages/vault/vault.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../services/api.service';
import { ProfileStateService } from '../services/profile-state.service';
import { StorageService } from '../services/storage.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GSNService } from '../services/gsn.service';
import { MetaTxService } from '../services/metaTx.service';
import ForwarderArtifact from '../abi/Forwarder.json';
import IdentityRegistryArtifact from '../abi/IdentityRegistry.json';
import { HttpClient } from '@angular/common/http';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../environments/environment';

const ForwarderAbi = ForwarderArtifact.abi;
const IdentityRegistryAbi = IdentityRegistryArtifact.abi;


@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatCheckboxModule
  ],
  template: `
<div class="vault-container" [class.dark]="darkMode()">
  <!-- Hero Header -->
  <header class="vault-header">
    <div class="header-content">
      <div class="header-icon-wrapper">
            <!-- Custom SVG Keyhole Shield -->
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
                class="custom-shield">
              <path d="M16 2C8.5 2 3 7.5 3 15C3 25 16 30 16 30C16 30 29 25 29 15C29 7.5 23.5 2 16 2Z"
                    fill="#6366f1" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round"/>
              <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.5"/>
              <rect x="14" y="19" width="4" height="9" rx="2" fill="#ffffff"/>
              <circle cx="16" cy="16" r="3" fill="#ffffff" opacity="0.4"/>
            </svg>
          </div>
      <h1>Identity Vault</h1>
      <p class="subtitle">
        Securely manage your sovereign digital identity. Connect your wallet to control your credentials, contexts, and consents.
      </p>
    </div>
  </header>

  <main class="vault-content">
    <!-- Wallet Connection -->
    <section class="vault-card primary-card">
      <div class="card-header">
        <mat-icon class="header-icon">account_balance_wallet</mat-icon>
        <h2>Wallet Connection</h2>
      </div>

      <div class="card-body">
        <div *ngIf="wallet.address$ | async as address; else connectPrompt" class="wallet-connected">
          <div class="address-container">
            <div class="address-display">
              <span class="address">{{ address | slice:0:6 }}...{{ address | slice:-4 }}</span>
              <span class="full-address-tooltip">{{ address }}</span>
            </div>
            <button mat-icon-button class="copy-button" (click)="copyAddress(address)" matTooltip="Copy address">
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>

          <div class="did-row">
            <span class="label">DID:</span>
            <code class="did">did:ethr:{{ address }}</code>
          </div>

          <div class="connection-status success">
            <mat-icon>check_circle</mat-icon>
            <span>Wallet connected successfully</span>
          </div>
        </div>

        <ng-template #connectPrompt>
          <div class="connect-prompt">
            <p class="muted">
              Connect your Ethereum wallet to unlock your personal identity vault.
            </p>
            <button class="connect-wallet-btn" (click)="connect()" [disabled]="loading()">
              <mat-icon *ngIf="!loading()">wallet</mat-icon>
              <span>{{ loading() ? 'Connecting...' : 'Connect Wallet' }}</span>
            </button>
          </div>
        </ng-template>
      </div>
    </section>

    <!-- Vault Profile & Settings (only shown when wallet is connected) -->
    <section class="vault-card" *ngIf="wallet.address$ | async">
      <div class="card-header">
        <mat-icon class="header-icon">shield</mat-icon>
        <h2>Vault Profile</h2>
      </div>

      <div class="card-body settings-grid">
        <!-- Pinata JWT -->
        <div class="setting-card">
          <div class="setting-header">
            <mat-icon class="setting-icon">vpn_key</mat-icon>
            <h3>Pinata JWT</h3>
          </div>
          <div class="setting-content">
            <p class="help-text">
              Use your own Pinata account for pinning (recommended for production).
              <strong>Security tip:</strong> Create a dedicated Admin key.
            </p>

            <form (ngSubmit)="saveUserPinataJwt()" #jwtForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Pinata JWT</mat-label>
                <input matInput
                       type="password"
                       name="jwt"
                       [(ngModel)]="userPinataJwt"
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                       required
                       autocomplete="new-password" />
                <mat-hint>
                  <a href="https://app.pinata.cloud/keys" target="_blank" class="external-link">
                    Get your key → Pinata Dashboard
                  </a>
                </mat-hint>
              </mat-form-field>

              <div class="button-group">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="!userPinataJwt().trim() || jwtForm.invalid">
                  Save JWT
                </button>
                <button mat-stroked-button color="warn" type="button"
                        *ngIf="hasUserJwt()"
                        (click)="clearUserPinataJwt()">
                  Remove
                </button>
              </div>
            </form>

            <div class="status-pill" *ngIf="hasUserJwt()" [ngClass]="{ 'success': true }">
              <mat-icon>check_circle</mat-icon>
              Using your own Pinata account
            </div>
            <div class="status-pill warning" *ngIf="!hasUserJwt()">
              <mat-icon>warning</mat-icon>
              Using shared test key
            </div>
          </div>
        </div>

        <!-- Custom IPFS Gateway -->
        <div class="setting-card">
          <div class="setting-header">
            <mat-icon class="setting-icon">cloud_download</mat-icon>
            <h3>IPFS Gateway (Reading)</h3>
          </div>
          <div class="setting-content">
            <p class="help-text">
              Where your credentials are fetched from. Default = public gateways.
            </p>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Gateway URL</mat-label>
              <input matInput
                     [(ngModel)]="customGateway"
                     placeholder="https://ipfs.io/ipfs/"
                     (blur)="saveCustomGateway()" />
              <mat-hint>
                Examples: https://dweb.link/ipfs/, http://localhost:8080/ipfs/, your-pinata-subdomain...
              </mat-hint>
            </mat-form-field>
           
            <div class="gateway-status">
              <div class="status-pill" *ngIf="customGateway()">
                <mat-icon color="primary">check_circle</mat-icon>
                Custom: <code>{{ customGateway() }}</code>
              </div>

              <div class="status-pill" *ngIf="!customGateway()">
                <mat-icon>info</mat-icon>
                Using public gateways
              </div>
            </div>
          </div>
        </div>

        <!-- GASLESS SETTINGS CARD - NEW -->
        <div class="setting-card gasless-settings">
          <div class="setting-header">
            <mat-icon class="setting-icon">rocket_launch</mat-icon>
            <h3>Gasless Transactions</h3>
          </div>
          <div class="setting-content">
            <p class="help-text">
              Create profiles and manage your identity without paying gas fees. 
              <strong>Powered by GSN on Base Sepolia testnet.</strong>
            </p>

            
              
              <div class="gasless-status-detail" *ngIf="useGasless()">
               
                  <mat-icon>check_circle</mat-icon>
                  <span>🎉 Your transactions will be gas-free!</span>

                </div>
            

            <!-- Gasless statistics -->
           
              <div class="stat-item">
                <mat-icon class="stat-icon">flash_on</mat-icon>
                <div class="stat-content">
                  <div class="stat-label">Gas Savings</div>
                  <div class="stat-value">100%</div>
                </div>
            
              <div class="stat-item">
                <mat-icon class="stat-icon">speed</mat-icon>
                <div class="stat-content">
                  <div class="stat-label">Network</div>
                  <div class="stat-value">Base Sepolia</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- nft.storage -->
        <div class="setting-card">
          <div class="setting-header">
            <mat-icon class="setting-icon">cloud_upload</mat-icon>
            <h3>nft.storage Key</h3>
          </div>
          <div class="setting-content">
            <p class="help-text">
              Optional: Use <strong>nft.storage</strong> for permanent, decentralized pinning (free).
            </p>

            <form (ngSubmit)="saveNftStorageKey()" #nftForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>nft.storage API Key</mat-label>
                <input matInput
                       type="password"
                       name="nftKey"
                       [(ngModel)]="nftStorageKey"
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
                <mat-hint>
                  <a href="https://nft.storage" target="_blank" class="external-link">
                    Get key at nft.storage →
                  </a>
                </mat-hint>
              </mat-form-field>

              <div class="button-group">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="!nftStorageKey().trim()">
                  Save Key
                </button>
                <button mat-stroked-button color="warn" type="button"
                        *ngIf="hasNftStorageKey()"
                        (click)="clearNftStorageKey()">
                  Remove
                </button>
              </div>
            </form>

            <div class="status-pill accent" *ngIf="hasNftStorageKey()">
              <mat-icon>check_circle</mat-icon>
              Pinning via nft.storage (decentralized)
            </div>
            <div class="status-pill" *ngIf="!hasNftStorageKey()">
              <mat-icon>info</mat-icon>
              Pinning via Pinata
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Status -->
      <div class="profile-status-section">
        <ng-container *ngIf="loading(); else profileLoaded">
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Checking vault status...</p>
          </div>
        </ng-container>

        <ng-template #profileLoaded>
          <!-- Erased -->
          <div class="status-card erased" *ngIf="isErased()">
            <mat-icon class="status-icon">privacy_tip</mat-icon>
            <div class="status-content">
              <h3>Identity Permanently Erased</h3>
              <p class="muted">
                Exercised Right to be Forgotten on {{ erasedAt() | date:'mediumDate' }}
              </p>
              <p class="muted small">
                Cryptographically proven on-chain — no data recoverable.
              </p>
            </div>
          </div>

          <!-- Active Profile -->
          <div class="status-card success" *ngIf="!isErased() && profileExists()">
            <mat-icon class="status-icon">verified</mat-icon>
            <div class="status-content">
              <h3>Vault Active</h3>
              <p class="muted">Your identity is ready. Manage contexts and credentials.</p>
              <div class="action-buttons">
                <a routerLink="/contexts" mat-flat-button color="primary">
                  <mat-icon>layers</mat-icon> Manage Contexts
                </a>
                <a routerLink="/credentials" mat-stroked-button color="primary">
                  <mat-icon>badge</mat-icon> Issue Credential
                </a>
              </div>
            </div>
          </div>

          <!-- No Profile -->
          <div class="status-card warning" *ngIf="!isErased() && !profileExists()">
            <mat-icon class="status-icon">info</mat-icon>
            <div class="status-content">
              <h3>No Vault Profile Found</h3>
              <p class="muted">Create your vault profile to get started.</p>

              <!-- Gas info + faucet guide – only shown when wallet is connected -->
              <div class="gas-info" *ngIf="wallet.address">
                <details>
                  <summary>Need testnet ETH? (click to expand)</summary>
                  <p>
                    Creating a vault profile requires a small amount of testnet ETH on Base Sepolia.<br>
                    Get free test ETH here:
                    <a href="https://faucet.quicknode.com/base/sepolia" target="_blank">QuickNode</a> or
                    <a href="https://www.infura.io/faucet/base" target="_blank">Infura</a>
                  </p>
                </details>
              </div>

              <!-- GASLESS CREATION OPTION - NEW -->

                <div class="creation-mode-selector">
                  <div class="mode-option" [class.active]="!useGasless()" (click)="useGasless.set(false)">
                    <mat-icon class="mode-icon">paid</mat-icon>
                    <div class="mode-content">
                      <h4>Regular</h4>
                      <p>Pay gas with your wallet</p>
                      <ul class="mode-features">
                        <li>• Uses your ETH balance</li>
                        <li>• Standard transaction</li>
                        <li>• Immediate confirmation</li>
                      </ul>
                    </div>
              
                  
                  <div class="mode-option" [class.active]="useGasless()" 
                       
                       (click)="useGasless.set(true)">
                    <mat-icon class="mode-icon">rocket_launch</mat-icon>
                    <div class="mode-content">
                      <h4>Gasless</h4>
                      <p>No ETH required</p>
                      <ul class="mode-features">
                        <li>• Zero gas fees</li>
                        <li>• Powered by GSN</li>
                        <li>• Sponsored by app</li>
                      </ul>
                  
                    </div>
                  </div>
                </div>

            
              </div>

              <!-- CREATE PROFILE BUTTON - UPDATED -->
              <button mat-flat-button 
                      color="primary" 
                      (click)="createProfile()" 
                      [disabled]="loading()"
                      class="create-profile-btn"
                      [ngClass]="{
                        'gasless-btn': useGasless(),
                        'regular-btn': !useGasless()
                      }">
                <mat-icon *ngIf="!loading()">
                  {{ useGasless() ? 'rocket_launch' : 'add_box' }}
                </mat-icon>
                <span>{{ getCreateButtonText() }}</span>
              </button>

              <!-- Fallback notice -->
              <p class="fallback-notice" *ngIf="useGasless()">
                <small>If gasless fails, you'll be prompted to use regular mode.</small>
              </p>
            </div>
          </div>

          <div class="refresh-section">
            <button mat-stroked-button (click)="checkProfile()" [disabled]="loading()">
              <mat-icon>refresh</mat-icon> Refresh Status
            </button>
          </div>
        </ng-template>
      </div>
    </section>
  </main>
</div>
`,

  styles: [`
  :host {
    display: block;
    min-height: 100vh;
  }

  .vault-container {
    background: var(--bg, #f8fafc);
    color: var(--text-primary, #1e293b);
    transition: background 0.4s ease, color 0.4s ease;
  }

  .vault-container.dark {
    --bg: #0f0f1a;
    --card-bg: rgba(30, 41, 59, 0.65);
    --card-border: rgba(59, 69, 94, 0.6);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --input-bg: rgba(30, 41, 59, 0.7);
    --input-border: #4b5563;
    --header-bg: rgba(99, 102, 241, 0.12);
    --status-success-bg: rgba(34, 197, 94, 0.22);
    --status-warning-bg: rgba(245, 158, 11, 0.22);
    --status-erased-bg: rgba(239, 68, 68, 0.22);
    --pill-bg: rgba(99, 102, 241, 0.15);
    --muted: #94a3b8;
  }

  .vault-header {
    text-align: center;
    padding: 4rem 1rem 5rem;
    background: var(--header-bg, linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(167, 139, 250, 0.05) 100%));
  }

  .vault-container.dark .vault-header {
    background: var(--header-bg, linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(167, 139, 250, 0.08) 100%));
  }

  .header-content {
    max-width: 720px;
    margin: 0 auto;
  }

  .header-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(99,102,241,0.45);
    overflow: hidden;
    transition: transform 0.3s ease;
  }

  .header-icon-wrapper:hover {
    transform: scale(1.08);
  }

  .custom-shield {
    width: 56px;
    height: 56px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
  }

  h1 {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 1rem;
    letter-spacing: -1px;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .vault-content {
    max-width: 1100px;
    margin: -3.5rem auto 0;
    padding: 0 1.5rem;
  }

  .vault-card {
    background: var(--card-bg, white);
    border-radius: 24px;
    border: 1px solid var(--card-border, #e2e8f0);
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    overflow: hidden;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .primary-card {
    margin-bottom: 2.5rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.75rem 2rem;
    border-bottom: 1px solid var(--card-border);
    background: var(--header-bg, rgba(99, 102, 241, 0.05));
  }

  .header-icon {
    font-size: 32px;
    width: 48px;
    height: 48px;
    background: rgba(99, 102, 241, 0.15);
    border-radius: 14px;
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .vault-container.dark .header-icon {
    background: rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
  }

  h2, h3 {
    margin: 0;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
  }

  .card-body {
    padding: 2rem;
  }

  /* Wallet Connected */
  .address-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 16px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.25rem;
    position: relative;
  }

  .address-display {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 1.05rem;
    color: var(--text-primary);
    position: relative;
  }

  .full-address-tooltip {
    visibility: hidden;
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    z-index: 10;
  }

  .vault-container.dark .full-address-tooltip {
    background: #334155;
  }

  .address-display:hover .full-address-tooltip {
    visibility: visible;
  }

  .address {
    font-weight: 500;
  }

  .copy-button {
    color: var(--text-secondary);
  }

  .vault-container.dark .copy-button {
    color: #cbd5e1;
  }

  .did-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .gateway-status {
  margin-top: 8px; /* separation from mat-hint */
}

@media (max-width: 768px) {
  .gateway-status {
    margin-top: 12px; /* extra breathing room on mobile */
  }
}


  .label {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .did {
    background: var(--pill-bg, rgba(99, 102, 241, 0.1));
    padding: 0.35rem 0.75rem;
    border-radius: 10px;
    font-family: 'Courier New', monospace;
    color: #6366f1;
    word-break: break-all;
  }

  .vault-container.dark .did {
    background: rgba(99, 102, 241, 0.2);
    color: #c7d2fe;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 16px;
    background: rgba(34, 197, 94, 0.1);
    color: #166534;
    font-weight: 500;
  }

  .vault-container.dark .connection-status.success {
    background: var(--status-success-bg, rgba(34, 197, 94, 0.2));
    color: #86efac;
  }

  .connect-wallet-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2.25rem;
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
    color: white;
    border: none;
    border-radius: 16px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.35);
  }

  .connect-wallet-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(99, 102, 241, 0.45);
  }

  /* Settings Grid */
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 1.75rem;
    padding: 2rem;
  }

  .setting-card {
    background: var(--card-bg);
    border-radius: 20px;
    border: 1px solid var(--card-border);
    overflow: hidden;
    transition: transform 0.3s ease;
  }

  .setting-card:hover {
    transform: translateY(-6px);
  }

  .setting-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.75rem;
    border-bottom: 1px solid var(--card-border);
    background: var(--header-bg, rgba(99, 102, 241, 0.06));
  }

  .setting-icon {
    font-size: 28px;
    width: 44px;
    height: 44px;
    background: rgba(99, 102, 241, 0.15);
    border-radius: 12px;
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .vault-container.dark .setting-icon {
    background: rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
  }

  .setting-content {
    padding: 1.75rem;
  }

  .help-text {
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }

  .external-link {
    color: #6366f1;
    text-decoration: underline;
    font-weight: 500;
  }

  .vault-container.dark .external-link {
    color: #a5b4fc;
  }

  .full-width {
    width: 100%;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1.25rem;
    flex-wrap: wrap;
  }

  .status-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 999px;
    background: var(--pill-bg);
    color: #1e40af;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .status-pill.success {
    background: var(--status-success-bg);
    color: #166534;
  }

  .vault-container.dark .status-pill.success {
    background: var(--status-success-bg);
    color: #86efac;
  }

  .status-pill.warning {
    background: var(--status-warning-bg);
    color: #92400e;
  }

  .vault-container.dark .status-pill.warning {
    background: var(--status-warning-bg);
    color: #fbbf24;
  }

  .status-pill.accent {
    background: var(--pill-bg);
    color: #6b21a8;
  }

  .vault-container.dark .status-pill.accent {
    color: #c4b5fd;
  }

  /* Profile Status Section */
  .profile-status-section {
    margin-top: 2.5rem;
    padding: 2rem;
    background: var(--card-bg);
    border-radius: 24px;
    border: 1px solid var(--card-border);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 4rem 0;
    color: var(--text-secondary);
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    border-radius: 20px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

    .gas-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin: 16px 0;
    background: rgba(33, 150, 243, 0.08);
    border-radius: 12px;
    color: #1e40af;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .gas-info mat-icon {
    font-size: 28px;
    width: 28px;
    height: 28px;
    color: #1e88e5;
  }

  .gas-info p {
    margin: 0;
  }

  .gas-info a {
    color: #1e88e5;
    text-decoration: underline;
    font-weight: 500;
  }

  .vault-container.dark .gas-info {
    background: rgba(33, 150, 243, 0.15);
    color: #90caf9;
  }

  .vault-container.dark .gas-info mat-icon {
    color: #64b5f6;
  }

  .vault-container.dark .gas-info a {
    color: #90caf9;
  }

  // Add these styles to the end of your existing styles array

/* Gasless Status Indicator */
.gasless-status {
  margin: 1rem 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.status-indicator.success {
  background: rgba(34, 197, 94, 0.15);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-indicator.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.gasless-hint {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0.5rem;
}

.gasless-hint a {
  color: #6366f1;
  text-decoration: underline;
  cursor: pointer;
}

.whitelist-link {
  color: #6366f1;
  text-decoration: underline;
  margin-left: 0.5rem;
  cursor: pointer;
}

/* Gasless Settings Card */
.gasless-settings {
  border: 2px solid rgba(99, 102, 241, 0.2);
}

.gasless-toggle {
  margin: 1rem 0;
}

.gasless-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.toggle-icon {
  color: #6366f1;
}

.gasless-status-detail {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.08);
}

.gasless-benefit {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #166534;
  font-weight: 500;
}

.gasless-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #92400e;
  font-weight: 500;
  flex-wrap: wrap;
}

.gasless-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
}

.stat-icon {
  font-size: 24px;
  color: #6366f1;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Gasless Creation Options */
.gasless-creation-option {
  margin: 1.5rem 0;
}

.creation-mode-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.mode-option {
  padding: 1.5rem;
  border: 2px solid var(--card-border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--card-bg);
}

.mode-option:hover {
  transform: translateY(-2px);
  border-color: #6366f1;
}

.mode-option.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
}

.mode-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-option.disabled:hover {
  transform: none;
  border-color: var(--card-border);
}

.mode-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.mode-content h4 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.mode-content p {
  color: var(--text-secondary);
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.mode-features li {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.mode-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(34, 197, 94, 0.2);
  color: #166534;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.mode-badge.warning {
  background: rgba(245, 158, 11, 0.2);
  color: #92400e;
}

/* Gasless Instructions */
.gasless-instructions {
  margin: 1.5rem 0;
}

.instructions-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: 1rem;
}

.instructions-card.success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.instructions-card.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.instructions-icon {
  font-size: 24px;
  margin-top: 0.25rem;
}

.instructions-card.success .instructions-icon {
  color: #166534;
}

.instructions-card.warning .instructions-icon {
  color: #92400e;
}

.instructions-content h4 {
  margin: 0 0 0.5rem;
}

.instructions-content p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Create Profile Button */
.create-profile-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
}

.create-profile-btn.gasless-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

.create-profile-btn.gasless-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(99, 102, 241, 0.5);
}

.create-profile-btn.regular-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.fallback-notice {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
}

/* Refresh Section */
.gsn-refresh-btn {
  margin-left: 1rem;
}

/* Dark mode adjustments */
.vault-container.dark {
  /* Existing dark mode variables... */
  
  /* Gasless dark mode */
  --gasless-success-bg: rgba(34, 197, 94, 0.2);
  --gasless-warning-bg: rgba(245, 158, 11, 0.2);
  --gasless-info-bg: rgba(99, 102, 241, 0.15);
}

.vault-container.dark .status-indicator.success {
  background: var(--gasless-success-bg);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.4);
}

.vault-container.dark .status-indicator.warning {
  background: var(--gasless-warning-bg);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.4);
}

.vault-container.dark .gasless-hint a {
  color: #a5b4fc;
}

.vault-container.dark .whitelist-link {
  color: #a5b4fc;
}

.vault-container.dark .gasless-settings {
  border-color: rgba(99, 102, 241, 0.3);
}

.vault-container.dark .gasless-status-detail {
  background: var(--gasless-info-bg);
}

.vault-container.dark .stat-item {
  background: rgba(99, 102, 241, 0.1);
}

.vault-container.dark .mode-option.active {
  background: var(--gasless-info-bg);
}

.vault-container.dark .instructions-card.success {
  background: var(--gasless-success-bg);
  border-color: rgba(34, 197, 94, 0.4);
  color: #86efac;
}

.vault-container.dark .instructions-card.warning {
  background: var(--gasless-warning-bg);
  border-color: rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

/* Responsive */
@media (max-width: 768px) {
  .creation-mode-selector {
    grid-template-columns: 1fr;
  }
  
  .gasless-stats {
    grid-template-columns: 1fr;
  }
  
  .refresh-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .gsn-refresh-btn {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}

@media (max-width: 600px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .gasless-status-detail {
    padding: 0.75rem;
  }
  
  .mode-option {
    padding: 1rem;
  }
}

  .status-card.success {
    background: var(--status-success-bg);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .status-card.warning {
    background: var(--status-warning-bg);
    border-color: rgba(245, 158, 11, 0.4);
  }

  .status-card.erased {
    background: var(--status-erased-bg);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .status-icon {
    font-size: 48px;
    width: 64px;
    height: 64px;
  }

  .status-content h3 {
    margin: 0 0 0.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .refresh-section {
    text-align: center;
    margin-top: 2rem;
  }

  @media (max-width: 960px) {
    .vault-content {
      padding: 0 1rem;
    }
    .settings-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    h1 { font-size: 2.25rem; }
    .vault-header { padding: 3rem 1rem 4rem; }
    .action-buttons { flex-direction: column; }
  }
`]

})
export class VaultComponent implements OnInit, OnDestroy {
  loading = signal(false);
  copied = signal(false);
  private lastErrorShown: number | null = null;

  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  public wallet = inject(WalletService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private profileState = inject(ProfileStateService);
  private storage = inject(StorageService);
  
 
  private metaTx = inject(MetaTxService);
  private http = inject(HttpClient);


  profileExists = this.profileState.profileExists;
  isErased = this.profileState.isErased;
  erasedAt = this.profileState.erasedAt;

 
  useGasless = signal<boolean>(true); // Default to gasless if available

  private sub?: Subscription;

  // Pinata JWT fields
  userPinataJwt = signal<string>('');
  hasUserJwt = signal<boolean>(false);

  // Custom Gateway
  customGateway = signal<string>('');

  // nft.storage fields
  nftStorageKey = signal<string>('');
  hasNftStorageKey = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngOnInit() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      const erasedDid = sessionStorage.getItem('erasedDid');
      const erasedAtStr = sessionStorage.getItem('erasedAt');

      if (erasedDid) {
        this.profileState.setProfileStatus(false, true, erasedAtStr);
      }

      // Initialize secure storage (wallet-based encryption)
      const encryptionReady = await this.storage.initEncryption();

      // Load all settings from IndexedDB (encrypted)
      try {
        const savedJwt = await this.storage.getItem('user_pinata_jwt');
        if (savedJwt) {
          this.userPinataJwt.set(savedJwt);
          this.hasUserJwt.set(true);
        }

        const savedNft = await this.storage.getItem('nft_storage_api_key');
        if (savedNft) {
          this.nftStorageKey.set(savedNft);
          this.hasNftStorageKey.set(true);
        }

        const savedGateway = await this.storage.getItem('custom_ipfs_gateway');
        if (savedGateway) {
          this.customGateway.set(savedGateway);
        }
        
        // NEW: Load gasless preference
        const gaslessPref = await this.storage.getItem('prefer_gasless');
        if (gaslessPref !== null) {
          this.useGasless.set(gaslessPref === 'true');
        }
      } catch (err) {
        console.error('Failed to load settings from secure storage:', err);
        this.snackBar.open('Failed to load saved settings - may need to reconnect wallet', 'Close', { duration: 5000 });
      }
    }

    this.sub = this.wallet.address$.subscribe(async (address) => {
      if (address) {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.removeItem('erasedDid');
          sessionStorage.removeItem('erasedAt');
        }
        this.checkProfile();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async checkProfile() {
    const address = this.wallet.address;
    if (!address) {
      this.profileState.reset();
      return;
    }

    if (this.profileExists() || this.isErased()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    try {
      const profile: any = await firstValueFrom(
        this.api.getProfile(address)
      );
      this.profileState.setProfileStatus(true, false, null);
    } catch (err: any) {
      if (err.status === 410) {
        this.profileState.setProfileStatus(false, true, err.error?.erasedAt || null);
      } else if (err.status === 404) {
        this.profileState.setProfileStatus(false, false, null);
      } else {
        console.error('Unexpected profile check failed', err);
        if (!this.lastErrorShown || Date.now() - this.lastErrorShown > 10000) {
          this.snackBar.open('Failed to check vault status', 'Close', { duration: 5000 });
          this.lastErrorShown = Date.now();
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  async connect() {
    try {
      this.loading.set(true);
      await this.wallet.connect();
      await this.storage.initEncryption();
    } catch (e: any) {
      this.snackBar.open(e.message || 'Wallet connection failed', 'Close', { duration: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  // NEW: Get create button text based on mode
  getCreateButtonText(): string {
  if (this.loading()) {
    return 'Creating...';
  }

  return this.useGasless()
    ? 'Create Profile (Gasless)'
    : 'Create Vault Profile';
}


  // ────────────────────────────────────────────────
  // UPDATED: createProfile with gasless support
  // ────────────────────────────────────────────────

  async createProfile() {
    const address = this.wallet.address;
    if (!address || this.isErased()) {
      this.snackBar.open('Wallet not connected or identity erased', 'Close', { duration: 4000 });
      return;
    }

    this.loading.set(true);

    try {
      if (this.useGasless()) {
        // NEW: GASLESS FLOW
        await this.createProfileGasless(address);
      } else {
        // EXISTING HYBRID FLOW (UNCHANGED)
        await this.createProfileRegular(address);
      }
      
      // Refresh profile status
      await this.checkProfile();
      
    } catch (err: any) {
      console.error('Create profile failed:', err);
      this.snackBar.open(err.message || 'Failed to create profile', 'Close', { duration: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

      
      
    // NEW: Gasless profile creation (FIXED – uses meta contract properly)
    private async createProfileGasless(address: string) {
      this.snackBar.open('🎉 Creating profile gaslessly...', 'Close', { duration: 4000 });

      try {
        // 1️⃣ Call backend WITH gasless header
        const payload = { owner: address };

        const response = await firstValueFrom(
          this.http.post<any>(
            `${environment.backendUrl}/api/profile`,
            payload,
            {
              headers: {
                'x-transaction-mode': 'gasless'
              }
            }
          )
        );
         console.log("UnsignedTx  Response from backend: ",response.unsignedTx)
        if (!response.unsignedTx) {
          throw new Error("Backend did not return unsignedTx for gasless mode");
        }

        // 2️⃣ Extract encoded contract call data
        const { to, data } = response.unsignedTx;

        // 3️⃣ Build & sign meta transaction
        const { req, signature } = await this.metaTx.buildAndSignMetaTx({
          forwarderAbi: ForwarderAbi,
          targetAddress: to,
          rawData: data
        });

        // 4️⃣ Send to relayer
        const relayResponse: any = await firstValueFrom(
          this.http.post(`${environment.backendUrl}/meta/relay`, {
            request: req,
            signature
          })
        );

        const txHash = relayResponse.txHash;
        const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;

        const snackBarRef = this.snackBar.open(
          `✅ Profile created GASLESSLY! Tx: ${txHash.slice(0, 10)}...`,
          'View',
          { duration: 10000 }
        );

        snackBarRef.onAction().subscribe(() => {
          window.open(explorerUrl, '_blank');
        });

        this.profileState.setProfileStatus(true, false, null);

      } catch (error: any) {
        console.error('Gasless profile creation failed:', error);

        const fallback = confirm('Gasless creation failed. Try regular transaction?');
        if (fallback) {
          await this.createProfileRegular(address);
        } else {
          throw error;
        }
      }
    }




  // EXISTING: Regular profile creation (UNCHANGED)
  private async createProfileRegular(address: string) {
    const payload = { owner: address };
    const response = await firstValueFrom(this.api.createProfile(payload));

    if (response.unsignedTx) {
      // Hybrid mode: User signs & sends
      this.snackBar.open('Please sign the profile creation transaction in your wallet...', 'Close', { duration: 8000 });

      const txResponse = await this.wallet.signAndSendTransaction(response.unsignedTx);
      const txHash = txResponse.hash;
      const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;

      const snackBarRef = this.snackBar.open(
            `Profile created! Tx: ${txHash.slice(0, 10)}...`,
            'View',
            {
              duration: 10000,
              panelClass: ['success-snackbar']
            }
          );

          snackBarRef.onAction().subscribe(() => {
            window.open(explorerUrl, '_blank');
          });
    } else if (response.txHash) {
      // Backend signed (when HYBRID_SIGNING=false)
      this.snackBar.open('Profile created by the app! (no gas paid by you)', 'Close', { duration: 6000 });
    }

    this.profileState.setProfileStatus(true, false, null);
  }

  // ────────────────────────────────────────────────
  // Hybrid signing for eraseProfile (UNCHANGED)
  // ────────────────────────────────────────────────

  async eraseProfile() {
    const address = this.wallet.address;
    if (!address || this.isErased()) return;

    if (!confirm('This action is permanent (GDPR Right to be Forgotten). Continue?')) return;

    this.loading.set(true);

    try {
      const payload = { did: `did:ethr:${address}` };
      const response = await firstValueFrom(this.api.eraseProfile(payload));

      if (response.unsignedTx) {
        // Hybrid mode
        this.snackBar.open('Please sign the erasure transaction in your wallet...', 'Close', { duration: 8000 });

        const { hash: txHash } = await this.wallet.signAndSendTransaction(response.unsignedTx);

        this.snackBar.open(`Identity erased permanently! Tx: ${txHash.slice(0, 10)}...`, 'Close', { duration: 6000 });
      } else if (response.txHash) {
        // Dev mode
        this.snackBar.open('Identity erased successfully!', 'Close', { duration: 4000 });
      }

      this.profileState.setProfileStatus(false, true, new Date().toISOString());
    } catch (err: any) {
      console.error('Erase profile failed:', err);
      this.snackBar.open(err.message || 'Failed to erase identity', 'Close', { duration: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  // ────────────────────────────────────────────────
  // Pinata JWT, Custom Gateway, nft.storage methods (UNCHANGED)
  // ────────────────────────────────────────────────

  async saveUserPinataJwt() {
    const jwt = this.userPinataJwt().trim();
    if (!jwt) {
      this.snackBar.open('Please enter a JWT', 'Close', { duration: 4000 });
      return;
    }

    if (!jwt.startsWith('eyJ') || jwt.split('.').length !== 3) {
      this.snackBar.open('Invalid JWT format', 'Close', { duration: 5000 });
      return;
    }

    try {
      await this.storage.setItem('user_pinata_jwt', jwt);
      this.hasUserJwt.set(true);
      this.snackBar.open('Your Pinata JWT saved — uploads will use your account', 'Close', { duration: 6000 });
    } catch (err) {
      console.error('Failed to save Pinata JWT:', err);
      this.snackBar.open('Failed to save JWT - storage error', 'Close', { duration: 5000 });
    }
  }

  async clearUserPinataJwt() {
    try {
      await this.storage.removeItem('user_pinata_jwt');
      this.userPinataJwt.set('');
      this.hasUserJwt.set(false);
      this.snackBar.open('Removed — now using shared test key', 'Close', { duration: 5000 });
    } catch (err) {
      console.error('Failed to clear Pinata JWT:', err);
      this.snackBar.open('Failed to clear JWT - storage error', 'Close', { duration: 5000 });
    }
  }

  async saveCustomGateway() {
    let url = this.customGateway().trim();

    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.snackBar.open('Gateway must start with http:// or https://', 'Close', { duration: 4000 });
        return;
      }
      if (!url.endsWith('/')) {
        url += '/';
        this.customGateway.set(url);
      }

      try {
        await this.storage.setItem('custom_ipfs_gateway', url);
        this.snackBar.open('Custom gateway saved', 'Close', { duration: 3000 });
      } catch (err) {
        console.error('Failed to save custom gateway:', err);
        this.snackBar.open('Failed to save gateway - storage error', 'Close', { duration: 5000 });
      }
    } else {
      try {
        await this.storage.removeItem('custom_ipfs_gateway');
        this.snackBar.open('Reverted to default gateways', 'Close', { duration: 3000 });
      } catch (err) {
        console.error('Failed to clear custom gateway:', err);
      }
    }
  }

  async saveNftStorageKey() {
    const key = this.nftStorageKey().trim();
    if (!key) {
      this.snackBar.open('Please enter a valid API key', 'Close', { duration: 4000 });
      return;
    }

    if (!key.startsWith('eyJ') || key.split('.').length !== 3) {
      this.snackBar.open('Invalid nft.storage API key format', 'Close', { duration: 5000 });
      return;
    }

    try {
      await this.storage.setItem('nft_storage_api_key', key);
      this.hasNftStorageKey.set(true);
      this.snackBar.open('nft.storage key saved — pinning will use it', 'Close', { duration: 6000 });
    } catch (err) {
      console.error('Failed to save nft.storage key:', err);
      this.snackBar.open('Failed to save key - storage error', 'Close', { duration: 5000 });
    }
  }

  async clearNftStorageKey() {
    try {
      await this.storage.removeItem('nft_storage_api_key');
      this.nftStorageKey.set('');
      this.hasNftStorageKey.set(false);
      this.snackBar.open('Removed — now using Pinata for pinning', 'Close', { duration: 5000 });
    } catch (err) {
      console.error('Failed to clear nft.storage key:', err);
      this.snackBar.open('Failed to clear key - storage error', 'Close', { duration: 5000 });
    }
  }

  // NEW: Toggle gasless preference
  async toggleGaslessPreference() {
    const newValue = !this.useGasless();
    this.useGasless.set(newValue);
    
    try {
      await this.storage.setItem('prefer_gasless', newValue.toString());
      this.snackBar.open(
        newValue ? 'Gasless mode enabled' : 'Gasless mode disabled',
        'Close',
        { duration: 3000 }
      );
    } catch (err) {
      console.error('Failed to save gasless preference:', err);
    }
  }
}