// src/app/services/gasless.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class GaslessService {
  private http = inject(HttpClient);
  private wallet = inject(WalletService);
  private baseUrl = environment.backendUrl;

  /**
   * Send a gasless transaction
   */
  async sendGasless(
    contractAddress: string,
    methodName: string,
    args: any[]
  ): Promise<{ hash: string; gasless: boolean }> {
    try {
      const userAddress = this.wallet.address;
      if (!userAddress) throw new Error('Wallet not connected');
      
      // Sign a message for authentication
      const message = `Gasless transaction for ${methodName} at ${Date.now()}`;
      const signature = await this.wallet.signMessage(message);
      
      // Send to backend relay
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; txHash: string }>(
          `${this.baseUrl}/gsn/relay`,
          {
            contractAddress,
            methodName,
            args,
            userAddress,
            signature,
            message
          }
        )
      );
      
      if (!response.success) {
        throw new Error('Gasless transaction failed');
      }
      
      return {
        hash: response.txHash,
        gasless: true
      };
      
    } catch (error: any) {
      console.error('Gasless transaction error:', error);
      throw new Error(`Gasless failed: ${error.message}`);
    }
  }

  /**
   * Check if gasless is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const address = this.wallet.address;
      if (!address) return false;
      
      // Check backend GSN status
      const response = await firstValueFrom(
        this.http.get<{ gsnEnabled: boolean }>(`${this.baseUrl}/gsn/status`)
      );
      
      if (!response.gsnEnabled) return false;
      
      // Check whitelist
      const whitelist = await firstValueFrom(
        this.http.get<{ isWhitelisted: boolean }>(
          `${this.baseUrl}/gsn/whitelist/${address}`
        )
      );
      
      return whitelist.isWhitelisted;
      
    } catch (error) {
      console.warn('Gasless availability check failed:', error);
      return false;
    }
  }
}