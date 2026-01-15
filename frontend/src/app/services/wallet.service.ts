import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { BehaviorSubject } from 'rxjs';

declare const window: any;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private isBrowser: boolean;

  private addressSubject = new BehaviorSubject<string | null>(null);
  address$ = this.addressSubject.asObservable();

  // New: Authentication state (JWT + isAuthenticated flag)
  private authState = new BehaviorSubject<{ token: string | null; isAuthenticated: boolean }>({
    token: null,
    isAuthenticated: false
  });
  authState$ = this.authState.asObservable();

  provider: BrowserProvider | null = null;
  signer: JsonRpcSigner | null = null;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ✅ Restore wallet address ONLY in browser
    if (this.isBrowser) {
      const saved = localStorage.getItem('walletAddress');
      if (saved) {
        this.addressSubject.next(saved);
      }

      // Optional: Restore auth token if you want persistence across refresh
      // (but usually JWT is short-lived, so you may want to re-login instead)
      // const savedToken = localStorage.getItem('authToken');
      // if (savedToken) {
      //   this.authState.next({ token: savedToken, isAuthenticated: true });
      // }

      // 🔄 Keep address in sync with MetaMask
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (!accounts || accounts.length === 0) {
            this.disconnect();
          } else {
            const addr = accounts[0];
            this.addressSubject.next(addr);
            localStorage.setItem('walletAddress', addr);
            this.signer = null; // force re-bind
          }
        });
      }
    }
  }

  get address(): string | null {
    return this.addressSubject.value;
  }

  async connect() {
    if (!this.isBrowser) {
      throw new Error('Wallet connection only available in browser');
    }

    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    this.provider = new BrowserProvider(
      window.ethereum as Eip1193Provider
    );

    await this.provider.send('eth_requestAccounts', []);

    this.signer = await this.provider.getSigner();
    const address = await this.signer.getAddress();

    // ✅ Persist + publish state
    this.addressSubject.next(address);
    localStorage.setItem('walletAddress', address);

    return { address };
  }

  async signMessage(message: string) {
    if (!this.isBrowser) {
      throw new Error('Signing only available in browser');
    }

    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    // 🔁 Lazy-init provider
    if (!this.provider) {
      this.provider = new BrowserProvider(
        window.ethereum as Eip1193Provider
      );
    }

    // 🔁 Lazy-init signer
    if (!this.signer) {
      this.signer = await this.provider.getSigner();
    }

    const signerAddress = await this.signer.getAddress();

    if (
      this.address &&
      signerAddress.toLowerCase() !== this.address.toLowerCase()
    ) {
      throw new Error('Active MetaMask account does not match connected wallet');
    }

    return this.signer.signMessage(message);
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.addressSubject.next(null);
    this.clearAuth(); // Clears auth state on disconnect

    if (this.isBrowser) {
      localStorage.removeItem('walletAddress');
    }
  }

  // ────────────────────────────────────────────────
  // NEW METHODS FOR AUTHENTICATION STATE
  // ────────────────────────────────────────────────

  /**
   * Call this after successful SIWE login (when you receive JWT from backend)
   */
  setAuthenticated(token: string) {
    this.authState.next({ token, isAuthenticated: true });
    // Optional: persist token (only if your JWT is long-lived / refreshable)
    if (this.isBrowser) {
      localStorage.setItem('authToken', token);
    }
  }

  /**
   * Clears auth state (call on logout or when disconnecting wallet)
   */
  clearAuth() {
    this.authState.next({ token: null, isAuthenticated: false });
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
    }
  }

  /**
   * Get current JWT token (useful for HTTP interceptors)
   */
  getToken(): string | null {
    return this.authState.value.token || (this.isBrowser ? localStorage.getItem('authToken') : null);
  }

  /**
   * Convenience getter for auth status
   */
  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }
}