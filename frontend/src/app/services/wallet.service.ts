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
  TransactionReceipt,
  Contract
} from 'ethers';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';
import { GSNService, GSNTransaction } from './gsn.service';

declare const window: any;

// GSN provider interface
declare class RelayProvider {
  constructor(input: GSNUnresolvedConstructorInput);
  init(): Promise<RelayProvider>;
  getSigner(): any;
}

interface GSNUnresolvedConstructorInput {
  provider: JsonRpcProvider | Eip1193Provider;
  config: Partial<GSNConfig>;
}

interface GSNConfig {
  paymasterAddress: string;
  forwarderAddress: string;
  loggerConfiguration: {
    logLevel: 'error' | 'warn' | 'info' | 'debug'; // Specific string literals
  };
  relayLookupWindowBlocks: number;
  maxRelayNonceGap: number;
  preferredRelays?: string[];
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  // GSN provider (we'll handle it differently)
  private gsnRelayProvider: any = null;
  
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

  // NEW: Chain configuration for Base Sepolia (matches backend CHAIN_ID=84532)
  readonly expectedChainId = 84532;
  readonly expectedChainName = 'Base Sepolia Testnet';

  constructor(private gsnService: GSNService) {
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
      if (!window.ethereum) {
          throw new Error('MetaMask not detected');
        }

        await this.useMetaMask();
        await this.ensureCorrectChain();


      if (!this.signer) throw new Error('Signer did not initialize, please refresh the browser and try again');

      // NEW: After connect, check chain once (optional – can be skipped here if you want)
      // await this.ensureCorrectChain(); // uncomment if you want chain check on every connect

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

  // NEW: Switch or add the correct chain (Base Sepolia)
  async switchToCorrectChain(): Promise<boolean> {
    if (!window.ethereum || !this.provider) return false;

    try {
      const currentChainId = (await this.provider.getNetwork()).chainId;

      if (Number(currentChainId) === this.expectedChainId) {
        return true; // already correct
      }

      this.snackBar.open(`Switching to ${this.expectedChainName}...`, 'Close', { duration: 4000 });

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.expectedChainId.toString(16)}` }],
      });

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

  // NEW: Call this before any transaction
  async ensureCorrectChain(): Promise<void> {
    const success = await this.switchToCorrectChain();
    if (!success) {
      throw new Error(`Please switch to ${this.expectedChainName} in your wallet to continue`);
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
      // NEW: Ensure correct chain before signing/sending
      await this.ensureCorrectChain();

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
      if (err.message?.includes('chainId')) {
        throw new Error(`Wrong network - please switch to ${this.expectedChainName}`);
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

  /**
   * Send transaction via GSN (gasless)
   */
  async sendGSNTransaction(txData: GSNTransaction): Promise<any> {
    try {
      // Check if @opengsn/provider is available
      if (typeof window === 'undefined') {
        throw new Error('GSN requires browser environment');
      }
      
      if (!this.provider) {
        await this.connect();
      }
      
      // Get GSN config
      const config = this.gsnService.getConfig();
      
      
      // Get signer from GSN provider
      const signer = await this.gsnRelayProvider.getSigner();
      
      if (!signer) {
        throw new Error('Failed to get signer from GSN provider');
      }
      
      // Prepare transaction
      const tx = {
        to: txData.to,
        data: txData.data,
        chainId: txData.chainId,
        gasLimit: ethers.toBigInt(txData.gasLimit),
        value: ethers.toBigInt(txData.value),
      };
      
      // Send transaction via GSN
      const txResponse = await signer.sendTransaction(tx);
      
      return {
        hash: txResponse.hash,
        wait: () => txResponse.wait(),
        from: txData.userAddress || await signer.getAddress(),
        gasless: true
      };
      
    } catch (error: any) {
      console.error('GSN transaction failed:', error);
      throw new Error(`Gasless transaction failed: ${error.message}`);
    }
  }
  
  /**
   * Alternative GSN transaction method using direct contract calls
   * This is simpler and often more reliable
   */
  async sendGSNContractTransaction(
    contractAddress: string,
    abi: any,
    methodName: string,
    args: any[]
  ): Promise<any> {
    try {
      
      // Get signer from GSN provider
      const signer = await this.gsnRelayProvider.getSigner();
      
      // Create contract instance with GSN signer
      const contract = new Contract(contractAddress, abi, signer);
      
      // Call the method
      const tx = await contract[methodName](...args);
      
      return {
        hash: tx.hash,
        wait: () => tx.wait(),
        gasless: true
      };
      
    } catch (error: any) {
      console.error('GSN contract transaction failed:', error);
      
      // Fallback to regular transaction if GSN fails
      console.log('Falling back to regular transaction...');
      return this.sendRegularContractTransaction(contractAddress, abi, methodName, args);
    }
  }
  
  /**
   * Regular contract transaction (fallback method)
   */
  private async sendRegularContractTransaction(
    contractAddress: string,
    abi: any,
    methodName: string,
    args: any[]
  ): Promise<any> {
    if (!this.signer) {
      throw new Error('No signer available');
    }
    
    const contract = new Contract(contractAddress, abi, this.signer);
    const tx = await contract[methodName](...args);
    
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
      gasless: false
    };
  }
  
  /**
   * Send transaction with automatic fallback (GSN if available, regular if not)
   */
  async sendTransactionWithFallback(
    txData: any, 
    useGSN: boolean = true
  ): Promise<any> {
    if (useGSN && this.gsnService.isEnabled()) {
      try {
        return await this.sendGSNTransaction(txData);
      } catch (error) {
        console.warn('GSN transaction failed, falling back to regular:', error);
        // Fall back to regular transaction
        return await this.signAndSendTransaction(txData);
      }
    } else {
      // Use regular transaction
      return await this.signAndSendTransaction(txData);
    }
  }

  /**
   * Check if GSN is available
   */
  isGSNAvailable(): boolean {
    return this.gsnService.isEnabled();
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