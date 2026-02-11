// src/app/services/gsn.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GSNConfig {
  enabled: boolean;
  chainId?: number;
  forwarderAddress?: string;
  paymasterAddress?: string;
  registryAddress?: string;
  rpcUrl?: string;
  domain?: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
}

export interface GSNTransaction {
  to: string;
  data: string;
  chainId: number;
  gasLimit: string;
  value: string;
  useGSN: boolean;
  paymasterAddress?: string;
  forwarderAddress?: string;
  description?: string;
  userAddress?: string;
  nonce?: number;
}

export interface GSNStatus {
  gsnEnabled: boolean;
  config: GSNConfig;
  contracts: {
    registry: string;
    forwarder: string;
    paymaster: string;
  };
  network: {
    chainId: number;
    name: string;
  };
  status: 'READY' | 'DISABLED';
  connectivity?: {
    success: boolean;
    message: string;
    details?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GSNService {
  private http = inject(HttpClient);
  private baseUrl = environment.backendUrl;
  
  private _gsnEnabled = new BehaviorSubject<boolean>(false);
  private _whitelistStatus = new BehaviorSubject<boolean>(false);
  private _config = new BehaviorSubject<GSNConfig>({ enabled: false });
  
  // Observables
  gsnEnabled$ = this._gsnEnabled.asObservable();
  whitelistStatus$ = this._whitelistStatus.asObservable();
  config$ = this._config.asObservable();
  
  /**
   * Check if GSN is enabled on the backend
   */
  async checkGSNStatus(): Promise<GSNStatus> {
    try {
      const status = await firstValueFrom(
        this.http.get<GSNStatus>(`${this.baseUrl}/gsn/status`)
      );
      
      this._gsnEnabled.next(status.gsnEnabled);
      this._config.next(status.config);
      
      return status;
    } catch (error) {
      console.warn('GSN not available:', error);
      this._gsnEnabled.next(false);
      return {
        gsnEnabled: false,
        config: { enabled: false },
        contracts: { registry: '', forwarder: '', paymaster: '' },
        network: { chainId: 0, name: '' },
        status: 'DISABLED'
      };
    }
  }
  
  /**
   * Check if user is whitelisted for GSN
   */
  async checkWhitelist(address: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ isWhitelisted: boolean }>(`${this.baseUrl}/gsn/whitelist/${address}`)
      );
      
      this._whitelistStatus.next(response.isWhitelisted);
      return response.isWhitelisted;
    } catch (error) {
      console.warn('Failed to check whitelist:', error);
      this._whitelistStatus.next(false);
      return false;
    }
  }
  
  /**
   * Prepare a GSN transaction
   */
  async prepareTransaction(methodName: string, args: any[]): Promise<GSNTransaction> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; txData: GSNTransaction }>(
        `${this.baseUrl}/gsn/prepare-tx`,
        { methodName, args }
      )
    );
    
    if (!response.success) {
      throw new Error('Failed to prepare GSN transaction');
    }
    
    return response.txData;
  }
  
  /**
   * Prepare setProfileCID transaction via GSN
   */
  async prepareSetProfileCID(subjectAddress: string, cid: string): Promise<GSNTransaction> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; txData: GSNTransaction }>(
        `${this.baseUrl}/gsn/prepare-set-profile-cid`,
        { subjectAddress, cid }
      )
    );
    
    if (!response.success) {
      throw new Error('Failed to prepare GSN setProfileCID transaction');
    }
    
    return response.txData;
  }
  
  /**
 * Prepare registerIdentity transaction via GSN (DEDICATED ENDPOINT)
 */
async prepareRegisterIdentity(
  userAddress: string
): Promise<GSNTransaction> {
  const response = await firstValueFrom(
    this.http.post<{ success: boolean; txData: GSNTransaction }>(
      `${this.baseUrl}/gsn/prepare-register-identity`,
      { userAddress }
    )
  );

  if (!response.success) {
    throw new Error('Failed to prepare GSN registerIdentity transaction');
  }

  return response.txData;
}


  
  /**
   * Check if GSN is available and user is whitelisted
   */
  async isGaslessAvailable(address: string): Promise<boolean> {
    const status = await this.checkGSNStatus();
    if (!status.gsnEnabled) return false;
    
    const whitelisted = await this.checkWhitelist(address);
    return whitelisted;
  }

  async prepareSetClaim(
  subject: string,
  claimIdBytes32: string,
  claimHash: string
): Promise<GSNTransaction> {
  const response = await firstValueFrom(
    this.http.post<{ success: boolean; txData: GSNTransaction }>(
      `${this.baseUrl}/gsn/prepare-set-claim`,
      { subject, claimId: claimIdBytes32, claimHash }
    )
  );

  if (!response.success) {
    throw new Error("Failed to prepare GSN setClaim transaction");
  }

  return response.txData;
}

  
  /**
   * Get current GSN configuration
   */
  getConfig(): GSNConfig {
    return this._config.value;
  }
  
  /**
   * Check if GSN is currently enabled
   */
  isEnabled(): boolean {
    return this._gsnEnabled.value;
  }
  
  /**
   * Check if user is whitelisted
   */
  isWhitelisted(): boolean {
    return this._whitelistStatus.value;
  }
  
  /**
   * Get ABI for the registry contract (you need to load this from your project)
   */
  getRegistryABI(): any {
    // You should load this from your actual ABI file
    return [
      "function registerIdentity(owner cid)",
      "function setProfileCID(address subject, string cid)",
      "function setClaim(address subject, bytes32 claimId, bytes32 claimHash)",
      "function isWhitelisted(address) view returns (bool)"
    ];
  }
}