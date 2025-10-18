import { Injectable } from '@angular/core';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';

declare const window: any;

@Injectable({ providedIn: 'root' })
export class WalletService {
  provider: BrowserProvider | null = null;
  signer: JsonRpcSigner | null = null;
  address: string | null = null;

  async connect() {
    if (!window.ethereum) throw new Error('MetaMask not found');
    this.provider = new BrowserProvider(window.ethereum as Eip1193Provider);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    this.address = await this.signer.getAddress();
    return { address: this.address };
  }

  async signMessage(message: string) {
    if (!this.signer) throw new Error('Not connected');
    return this.signer.signMessage(message);
  }
}
