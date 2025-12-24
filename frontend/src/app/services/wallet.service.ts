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

  provider: BrowserProvider | null = null;
  signer: JsonRpcSigner | null = null;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ✅ Restore wallet ONLY in browser
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
    if (!this.signer) {
      throw new Error('Not connected');
    }
    return this.signer.signMessage(message);
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.addressSubject.next(null);

    if (this.isBrowser) {
      localStorage.removeItem('walletAddress');
    }
  }
}