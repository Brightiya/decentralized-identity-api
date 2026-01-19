// src/app/services/wallet.service.ts
import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider, JsonRpcProvider, ethers } from 'ethers';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

declare const window: any;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private addressSubject = new BehaviorSubject<string | null>(null);
  address$ = this.addressSubject.asObservable();

  // Custom Hardhat RPC (user-configurable)
  customRpc = signal<string>('');

  // Authentication state
  private authState = new BehaviorSubject<{ token: string | null; isAuthenticated: boolean }>({
    token: null,
    isAuthenticated: false
  });
  authState$ = this.authState.asObservable();

  provider: BrowserProvider | JsonRpcProvider | null = null;
  signer: JsonRpcSigner | null = null;

  private snackBar = inject(MatSnackBar);

  constructor() {
    if (this.isBrowser) {
      const saved = localStorage.getItem('walletAddress');
      if (saved) {
        this.addressSubject.next(saved);
      }
    }
  }

  get address(): string | null {
    return this.addressSubject.value;
  }

  setCustomRpc(url: string) {
    if (!url) {
      this.customRpc.set('');
      this.snackBar.open('Custom RPC cleared - using default', 'Close', { duration: 4000 });
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.snackBar.open('Invalid RPC URL - must start with http(s)://', 'Close', { duration: 5000 });
      return;
    }

    this.customRpc.set(url.trim());
    this.snackBar.open(`Custom Hardhat RPC set: ${url}`, 'Close', { duration: 5000 });
  }

  async connect() {
    if (!this.isBrowser) {
      throw new Error('Wallet connection only available in browser');
    }

    try {
      // Always reset state
      this.signer = null;
      this.provider = null;

      console.log('Starting wallet connect...');

      if (this.customRpc()) {
        await this.useHardhat(this.customRpc());
      } else if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts?.length) throw new Error('No accounts returned from wallet');

        const addr = accounts[0];
        this.provider = new BrowserProvider(window.ethereum as Eip1193Provider);
        this.signer = await this.provider.getSigner();

        this.addressSubject.next(addr);
        localStorage.setItem('walletAddress', addr);

        this.snackBar.open(`MetaMask connected: ${addr.slice(0,6)}...${addr.slice(-4)}`, 'Close', { duration: 4000 });
      } else {
        await this.useHardhat(environment.PROVIDER_URL || 'http://127.0.0.1:8545');
      }

      let attempts = 0;
      while (!this.signer && attempts < 20) {
        console.log(`Waiting for signer... attempt ${attempts + 1}/20`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!this.signer) {
        throw new Error('Signer failed to initialize after 10s - reconnect wallet');
      }

      console.log('Connect complete - signer ready');
    } catch (err: any) {
      console.error('Wallet connect failed:', err);
      this.snackBar.open(err.message || 'Connection failed', 'Close', { duration: 8000 });
      throw err;
    }
  }

  private async useHardhat(rpcUrl: string) {
    try {
      this.provider = new JsonRpcProvider(rpcUrl);

      let signer: JsonRpcSigner | null = null;
      let addr: string | undefined = undefined; // ← Changed from null to undefined to match getSigner type

      if (environment.PRIVATE_KEY) {
        const wallet = new ethers.Wallet(environment.PRIVATE_KEY, this.provider);
        signer = wallet as unknown as JsonRpcSigner;
        addr = await wallet.getAddress();
      } else {
        try {
          const accounts = await this.provider.send('eth_accounts', []);
          if (accounts?.length > 0) {
            addr = accounts[0];
            // FIXED: Only call getSigner when addr is defined
            if (addr) {
              signer = await this.provider.getSigner(addr);
              console.log('Fetched Hardhat signer for account:', addr);
            }
          }
        } catch (fetchErr) {
          console.warn('Could not fetch/sign Hardhat accounts:', fetchErr);
        }
      }

      // Final fallback if no valid account
      if (!addr) {
        addr = '0x0000000000000000000000000000000000000000';
        console.warn('No Hardhat accounts - using dummy address (read-only mode)');
      }

      this.signer = signer;
      this.addressSubject.next(addr);
      if (this.isBrowser) {
        localStorage.setItem('walletAddress', addr);
      }

      this.snackBar.open(`Connected to Hardhat RPC: ${rpcUrl} (${addr.slice(0,6)}...)`, 'Close', { duration: 5000 });
    } catch (err: any) {
      this.snackBar.open('Failed to connect to Hardhat RPC', 'Close', { duration: 5000 });
      console.error('Hardhat connection error:', err);
      throw err;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.isBrowser) throw new Error('Signing only available in browser');
    if (!this.signer) throw new Error('No signer - connect wallet first');

    return this.signer.signMessage(message);
  }

  async signAndSendTransaction(unsignedTx: any): Promise<string> {
    if (!this.signer) throw new Error('No signer - connect wallet first');

    const txResponse = await this.signer.sendTransaction(unsignedTx);
    await txResponse.wait();

    return txResponse.hash;
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.addressSubject.next(null);
    this.clearAuth();

    if (this.isBrowser) {
      localStorage.removeItem('walletAddress');
    }

    this.snackBar.open('Wallet disconnected', 'Close', { duration: 3000 });
  }

  // Authentication helpers
  setAuthenticated(token: string) {
    this.authState.next({ token, isAuthenticated: true });
    if (this.isBrowser) localStorage.setItem('authToken', token);
  }

  clearAuth() {
    this.authState.next({ token: null, isAuthenticated: false });
    if (this.isBrowser) localStorage.removeItem('authToken');
  }

  getToken(): string | null {
    return this.authState.value.token || (this.isBrowser ? localStorage.getItem('authToken') : null);
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }
}