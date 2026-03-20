import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
// Injectable: marks service for DI
// inject: functional DI
// PLATFORM_ID: used to detect runtime environment
// signal: reactive state primitive

import { isPlatformBrowser } from '@angular/common';
// Utility to check if running in browser

import {
  BrowserProvider,
  JsonRpcProvider,
  Wallet,
  JsonRpcSigner,
  TransactionResponse,
  TransactionReceipt
  
} from 'ethers';
// Imports ethers.js classes for blockchain interaction

import { BehaviorSubject } from 'rxjs';
// Reactive stream for state updates

import { MatSnackBar } from '@angular/material/snack-bar';
// UI notifications

declare const window: any;
// Declares global window object (for MetaMask access)

@Injectable({ providedIn: 'root' })
// Registers service as singleton
export class WalletService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // Detects if running in browser environment

  private addressSubject = new BehaviorSubject<string | null>(null);
  // Holds current wallet address

  address$ = this.addressSubject.asObservable();
  // Observable stream for address changes

  customRpc = signal<string>('');
  // Reactive signal storing custom RPC URL

  private authState = new BehaviorSubject<{ token: string | null; isAuthenticated: boolean }>({
    token: null,
    isAuthenticated: false
  });
  // Holds authentication state

  authState$ = this.authState.asObservable();
  // Observable stream for auth state

  provider: BrowserProvider | JsonRpcProvider | null = null;
  // Blockchain provider instance

  signer: JsonRpcSigner | Wallet | null = null;
  // Signer for transactions and messages

  private snackBar = inject(MatSnackBar);
  // Injects snackbar for notifications

  
  readonly expectedChainId = 84532;
  // Expected chain ID

  readonly expectedChainName = 'Base Sepolia Testnet';
  // Expected network name

  constructor() {
   
  }

  get address(): string | null {
    return this.addressSubject.value;
    // Returns current wallet address synchronously
  }

  setCustomRpc(url: string) {

    if (!url) {
      this.customRpc.set('');
      this.snackBar.open('Custom RPC cleared - using default', 'Close', { duration: 4000 });
      return;
      // Clears custom RPC if empty input
    }

    if (!/^https?:\/\//i.test(url)) {
      this.snackBar.open('Invalid RPC URL - must start with http(s)://', 'Close', { duration: 5000 });
      return;
      // Validates URL format
    }

    this.customRpc.set(url.trim());
    // Stores trimmed RPC URL

    this.snackBar.open(`Custom Hardhat RPC set: ${url}`, 'Close', { duration: 5000 });
    // Notifies user
  }

  async connect() {

  if (!this.isBrowser) throw new Error('Wallet connection only available in browser');
  // Ensures execution only in browser

  this.signer = null;
  this.provider = null;
  this.addressSubject.next(null); 
  // Resets previous connection state

  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected, please install MetaMask to use this application');
      // Ensures MetaMask is available
    }

   
    this.provider = new BrowserProvider(window.ethereum);
    // Creates provider from MetaMask

    this.signer = await this.provider.getSigner();
    // Retrieves signer

    await this.ensureCorrectChain(); 
    // Ensures correct network

    const addr = await this.signer.getAddress();
    // Retrieves wallet address

    this.addressSubject.next(addr);
    // Emits address

    localStorage.setItem('walletAddress', addr);
    // Persists address

    this.snackBar.open(`Connected: ${addr.slice(0,6)}...`, 'Close', { duration: 4000 });
    // Shows success notification

  } catch (err) {
    this.disconnect(); // 🔥 rollback completely on failure
    throw err;
    // Ensures clean state on failure
  }
}

  async switchToCorrectChain(): Promise<boolean> {

    if (!window.ethereum || !this.provider) return false;
    // Ensures provider exists

    try {
      const currentChainId = (await this.provider.getNetwork()).chainId;
      // Retrieves current network chain ID

      if (Number(currentChainId) === this.expectedChainId) {
        return true; // already correct
      }

      this.snackBar.open(`Switching to ${this.expectedChainName}...`, 'Close', { duration: 4000 });
      // Notifies user of switch attempt

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.expectedChainId.toString(16)}` }],
      });
      // Requests MetaMask to switch chain

      return true;

    } catch (switchError: any) {
      // Chain not added → try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${this.expectedChainId.toString(16)}`,
              chainName: this.expectedChainName,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org']
            }],
          });
          // Adds chain to MetaMask

          // After adding, switch again
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${this.expectedChainId.toString(16)}` }],
          });

          this.snackBar.open(`Added and switched to ${this.expectedChainName}!`, 'Close', { duration: 5000 });
          return true;

        } catch (addError: any) {
          console.error('Failed to add chain:', addError);
          this.snackBar.open(`Failed to add ${this.expectedChainName}. Please add it manually.`, 'Close', { duration: 8000 });
          return false;
        }
      }

      console.error('User rejected chain switch:', switchError);
      this.snackBar.open('Please switch to Base Sepolia Testnet in your wallet', 'Close', { duration: 8000 });
      return false;
    }
  }

 
  async ensureCorrectChain(): Promise<void> {

    const success = await this.switchToCorrectChain();
    // Attempts to switch chain

    if (!success) {
      throw new Error(`Please switch to ${this.expectedChainName} in your wallet to continue`);
      // Throws error if unsuccessful
    }
  }


  async signMessage(message: string): Promise<string> {

    if (!this.signer) throw new Error('No signer - connect wallet first');
    // Ensures signer exists

    return await this.signer.signMessage(message);
    // Signs arbitrary message
  }

  /**
   * Sends a transaction and waits for confirmation
   * Returns both hash and receipt for more flexibility
   */
  async signAndSendTransaction(unsignedTx: any): Promise<{ hash: string; receipt: TransactionReceipt }> {

    if (!this.signer) throw new Error('No signer - connect wallet first');
    if (!this.provider) throw new Error('Provider not initialized');
    // Ensures required objects exist

    try {
      //Ensure correct chain before signing/sending
      await this.ensureCorrectChain();
      
      const network = await this.provider.getNetwork();
      
      const mmChain = await window.ethereum.request({ method: 'eth_chainId' });
    
      const tx: TransactionResponse = await this.signer.sendTransaction({
        ...unsignedTx,
        gasLimit: unsignedTx.gasLimit ? BigInt(unsignedTx.gasLimit) : undefined,
        maxFeePerGas: unsignedTx.maxFeePerGas ? BigInt(unsignedTx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: unsignedTx.maxPriorityFeePerGas ? BigInt(unsignedTx.maxPriorityFeePerGas) : undefined,
        value: unsignedTx.value ? BigInt(unsignedTx.value) : 0n,
      });
      // Sends transaction with normalized bigint fields

      // Wait for at least 1 confirmation
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error('Transaction receipt is null - likely dropped or timeout');
      }

      return { hash: tx.hash, receipt };
      // Returns transaction hash and receipt

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
      if (err.message?.includes('chainId')) {
        throw new Error(`Wrong network - please switch to ${this.expectedChainName}`);
      }

      throw err;
    }
  }

  setAuthenticated(token: string) {
    this.authState.next({ token, isAuthenticated: true });
    // Updates auth state

    localStorage.setItem('authToken', token);
    // Persists token
  }

  clearAuth() {
    this.authState.next({ token: null, isAuthenticated: false });
    // Clears auth state

    localStorage.removeItem('authToken');
    // Removes token from storage
  }

  getToken(): string | null {
    return this.authState.value.token || localStorage.getItem('authToken');
    // Retrieves token from memory or storage
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
    // Returns authentication status
  }

  disconnect() {

    this.provider = null;
    // Clears provider

    this.signer = null;
    // Clears signer

    this.addressSubject.next(null);
    // Clears address

    this.clearAuth();
    // Clears authentication

    localStorage.removeItem('walletAddress');
    // Removes stored address

    this.snackBar.open('Wallet disconnected', 'Close', { duration: 3000 });
    // Notifies user
  }
}