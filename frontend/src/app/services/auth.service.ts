import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { WalletService } from './wallet.service';
import { environment } from '../../environments/environment';

export type AppRole = 'USER' | 'ADMIN' | 'VERIFIER';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private wallet = inject(WalletService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // ===============================
  // Reactive Auth State
  // ===============================
  private _token = signal<string | null>(null);
  private _role  = signal<AppRole>('USER');

  readonly role = this._role;
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin    = computed(() => this._role() === 'ADMIN');
  readonly isVerifier = computed(() => this._role() === 'VERIFIER');

  constructor() {
    /**
     * Wallet disconnect ⇒ force logout
     * IMPORTANT:
     * - No wallet.disconnect() here
     * - Prevents recursive stack overflow
     */
    this.wallet.address$.subscribe(addr => {
      if (!addr && this.isAuthenticated()) {
        this.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  // ===============================
  // LOGIN (SIWE + ROLE)
  // ===============================
  async login(selectedRole: AppRole): Promise<boolean> {
    const address = this.wallet.address;
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!selectedRole) {
      throw new Error('Login role not selected');
    }

    // Always start clean
    this.clearSession();

    try {
      // 🔥 Get real chainId from wallet provider
      const network = await this.wallet.provider?.getNetwork();
      if (!network) {
        throw new Error('Wallet provider not available');
      }

      const chainId = Number(network.chainId);

      // 1️⃣ Get SIWE challenge
      const challengeRes = await this.http.get<{ message: string }>(
        `${environment.backendUrl}/api/auth/challenge?address=${address}&chainId=${chainId}`
      ).toPromise();

      if (!challengeRes?.message) {
        throw new Error('No challenge received');
      }

      // 2️⃣ Sign challenge
      const signature = await this.wallet.signMessage(challengeRes.message);

      // 3️⃣ Verify signature + role → JWT
      const verifyRes = await this.http.post<{
        token: string;
        user: { role: AppRole };
      }>(
        `${environment.backendUrl}/api/auth/verify`,
        {
          message: challengeRes.message,
          signature,
          requestedRole: selectedRole   // 🔐 ROLE IS DECLARED HERE
        }
      ).toPromise();

      if (!verifyRes?.token || !verifyRes?.user?.role) {
        throw new Error('Invalid authentication response');
      }

      // 4️⃣ Commit auth state (ORDER MATTERS)
      this._token.set(verifyRes.token);
      this._role.set(verifyRes.user.role);

      if (this.isBrowser) {
        localStorage.setItem('auth_token', verifyRes.token);
      }

      // 5️⃣ Navigate strictly by JWT role
      const target = this.getDefaultRouteForRole(verifyRes.user.role);
      await this.router.navigate([target]);

      return true;

    } catch (err: any) {
      console.error('Login failed:', err);
      this.clearSession();
      throw new Error(err.message || 'Authentication failed');
    }
  }

  // ===============================
  // LOGOUT
  // ===============================
  logout(): void {
    this.clearSession();
    this.wallet.disconnect(); // explicit user action only
    this.router.navigate(['/login']);
  }

  // ===============================
  // INTERNAL HELPERS
  // ===============================
  private clearSession(): void {
    this._token.set(null);
    this._role.set('USER');

    if (this.isBrowser) {
      localStorage.removeItem('auth_token');
    }
  }

  private getDefaultRouteForRole(role: AppRole): string {
    switch (role) {
      case 'ADMIN':
        return '/advanced';
      case 'VERIFIER':
        return '/verifier';
      default:
        return '/vault';
    }
  }

  // Used by HTTP interceptor
  getAuthHeader(): { Authorization?: string } {
    const token = this._token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
