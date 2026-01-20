// src/app/services/wallet.service.ts
import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ethers,
  BrowserProvider,
  JsonRpcProvider,
  Eip1193Provider,
  Wallet,
  JsonRpcSigner,
  TransactionResponse,
  TransactionReceipt
} from 'ethers';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

declare const window: any;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private addressSubject = new BehaviorSubject<string | null>(null);
  address$ = this.addressSubject.asObservable();

  customRpc = signal<string>('');

  private authState = new BehaviorSubject<{ token: string | null; isAuthenticated: boolean }>({
    token: null,
    isAuthenticated: false
  });
  authState$ = this.authState.asObservable();

  provider: BrowserProvider | JsonRpcProvider | null = null;
  signer: JsonRpcSigner | Wallet | null = null;

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

    if (!/^https?:\/\//i.test(url)) {
      this.snackBar.open('Invalid RPC URL - must start with http(s)://', 'Close', { duration: 5000 });
      return;
    }

    this.customRpc.set(url.trim());
    this.snackBar.open(`Custom Hardhat RPC set: ${url}`, 'Close', { duration: 5000 });
  }

  async connect() {
    if (!this.isBrowser) throw new Error('Wallet connection only available in browser');

    this.signer = null;
    this.provider = null;

    try {
      if (this.customRpc()) {
        await this.useHardhat(this.customRpc());
      } else if (window.ethereum) {
        await this.useMetaMask();
      } else {
        await this.useHardhat(environment.PROVIDER_URL || 'http://127.0.0.1:8545');
      }

      if (!this.signer) throw new Error('Signer did not initialize, please refresh the browser and try again');

    } catch (err: any) {
      console.error('Wallet connect failed:', err);
      this.snackBar.open(err.message || 'Connection failed', 'Close', { duration: 8000 });
      throw err;
    }
  }

  private async useMetaMask() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) throw new Error('No accounts returned from MetaMask');

    const addr = accounts[0];

    this.provider = new BrowserProvider(window.ethereum as Eip1193Provider);
    this.signer = await this.provider.getSigner();

    this.addressSubject.next(addr);
    localStorage.setItem('walletAddress', addr);

    this.snackBar.open(`MetaMask connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`, 'Close', { duration: 4000 });
  }

  private async useHardhat(rpcUrl: string) {
    try {
      this.provider = new JsonRpcProvider(rpcUrl);

      let addr: string | undefined;
      let signer: Wallet | null = null;

      if (environment.PRIVATE_KEY) {
        signer = new Wallet(environment.PRIVATE_KEY, this.provider);
        addr = await signer.getAddress();
      } else {
        const accounts = await this.provider.send('eth_accounts', []);
        if (accounts?.length > 0) {
          addr = accounts[0];
          // No signer for JSON-RPC without private key
          signer = null;
        }
      }

      if (!addr) {
        addr = ethers.ZeroAddress;
        console.warn('Hardhat returned no accounts - using zero address (read-only)');
      }

      this.signer = signer;
      this.addressSubject.next(addr);
      localStorage.setItem('walletAddress', addr);

      this.snackBar.open(`Connected to Hardhat RPC: ${rpcUrl} (${addr.slice(0, 6)}...)`, 'Close', { duration: 5000 });
    } catch (err: any) {
      console.error('Hardhat connection error:', err);
      this.snackBar.open('Failed to connect to Hardhat RPC', 'Close', { duration: 5000 });
      throw err;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) throw new Error('No signer - connect wallet first');
    return await this.signer.signMessage(message);
  }

  /**
   * Sends a transaction and waits for confirmation
   * Returns both hash and receipt for more flexibility
   */
  async signAndSendTransaction(unsignedTx: any): Promise<{ hash: string; receipt: TransactionReceipt }> {
    if (!this.signer) throw new Error('No signer - connect wallet first');
    if (!this.provider) throw new Error('Provider not initialized');

    try {
      const tx: TransactionResponse = await this.signer.sendTransaction({
        ...unsignedTx,
        gasLimit: unsignedTx.gasLimit ? BigInt(unsignedTx.gasLimit) : undefined,
        maxFeePerGas: unsignedTx.maxFeePerGas ? BigInt(unsignedTx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: unsignedTx.maxPriorityFeePerGas ? BigInt(unsignedTx.maxPriorityFeePerGas) : undefined,
        value: unsignedTx.value ? BigInt(unsignedTx.value) : 0n,
      });

      console.log('[WalletService] Transaction sent:', tx.hash);

      // Wait for at least 1 confirmation
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error('Transaction receipt is null - likely dropped or timeout');
      }

      console.log('[WalletService] Confirmed in block:', receipt.blockNumber);

      return { hash: tx.hash, receipt };
    } catch (err: any) {
      console.error('[WalletService] Transaction failed:', err);

      // Improve error messages for common MetaMask codes
      if (err.code === 4001) {
        throw new Error('User rejected transaction');
      }
      if (err.code === -32603 && err.message?.includes('nonce')) {
        throw new Error('Nonce too low/high - try resetting MetaMask account');
      }
      if (err.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for gas');
      }

      throw err;
    }
  }

  setAuthenticated(token: string) {
    this.authState.next({ token, isAuthenticated: true });
    localStorage.setItem('authToken', token);
  }

  clearAuth() {
    this.authState.next({ token: null, isAuthenticated: false });
    localStorage.removeItem('authToken');
  }

  getToken(): string | null {
    return this.authState.value.token || localStorage.getItem('authToken');
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.addressSubject.next(null);
    this.clearAuth();
    localStorage.removeItem('walletAddress');
    this.snackBar.open('Wallet disconnected', 'Close', { duration: 3000 });
  }
}
