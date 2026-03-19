import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
// Imports Angular core utilities:
// - Injectable: marks service for dependency injection
// - signal, computed: reactive state primitives
// - inject: function-based dependency injection
// - PLATFORM_ID: identifies current platform (browser/server)

import { isPlatformBrowser } from '@angular/common';
// Utility to check if code is running in a browser environment

import { HttpClient } from '@angular/common/http';
// Angular service for making HTTP requests

import { Router } from '@angular/router';
// Angular router for navigation

import { WalletService } from './wallet.service';
// Custom service handling wallet connection and signing

import { environment } from '../../environments/environment.prod';
// Environment configuration (e.g., backend URL)

export type AppRole = 'USER' | 'ADMIN' | 'VERIFIER';
// Defines allowed application roles

@Injectable({ providedIn: 'root' })
// Makes this service globally available as a singleton
export class AuthService {

  private http = inject(HttpClient);
  // Injects HttpClient for API calls

  private router = inject(Router);
  // Injects Router for navigation

  private wallet = inject(WalletService);
  // Injects WalletService for wallet interactions

  private platformId = inject(PLATFORM_ID);
  // Injects platform identifier

  private isBrowser = isPlatformBrowser(this.platformId);
  // Determines if running in a browser (important for localStorage usage)

  // ===============================
  // Reactive Auth State
  // ===============================
  private _token = signal<string | null>(null);
  // Stores JWT token as a reactive signal

  private _role  = signal<AppRole>('USER');
  // Stores current user role (default: USER)

  readonly role = this._role;
  // Exposes role signal publicly

  readonly isAuthenticated = computed(() => !!this._token());
  // Computed signal: true if token exists

  readonly isAdmin    = computed(() => this._role() === 'ADMIN');
  // Computed signal: true if role is ADMIN

  readonly isVerifier = computed(() => this._role() === 'VERIFIER');
  // Computed signal: true if role is VERIFIER

  constructor() {
    /**
     * Wallet disconnect ⇒ force logout
     * IMPORTANT:
     * - No wallet.disconnect() here
     * - Prevents recursive stack overflow
     */
    this.wallet.address$.subscribe(addr => {
      // Subscribes to wallet address changes

      if (!addr && this.isAuthenticated()) {
        // If wallet disconnects while authenticated

        this.clearSession();
        // Clears auth state

        this.router.navigate(['/login']);
        // Redirects to login page
      }
    });
  }

  // ===============================
  // LOGIN (SIWE + ROLE)
  // ===============================
  async login(selectedRole: AppRole): Promise<boolean> {

    const address = this.wallet.address;
    // Retrieves current wallet address

    if (!address) {
      throw new Error('Wallet not connected');
      // Ensures wallet is connected before login
    }

    if (!selectedRole) {
      throw new Error('Login role not selected');
      // Ensures a role is selected
    }

    // Always start clean
    this.clearSession();
    // Clears any previous session before login attempt

    try {
      // Get real chainId from wallet provider
      const network = await this.wallet.provider?.getNetwork();
      // Retrieves network information from wallet

      if (!network) {
        throw new Error('Wallet provider not available');
        // Ensures provider exists
      }

      const chainId = Number(network.chainId);
      // Extracts numeric chain ID

      // 1️⃣ Get SIWE challenge
      const challengeRes = await this.http.get<{ message: string }>(
        `${environment.backendUrl}/api/auth/challenge?address=${address}&chainId=${chainId}`
      ).toPromise();
      // Requests SIWE challenge message from backend

      if (!challengeRes?.message) {
        throw new Error('No challenge received');
        // Ensures challenge message is returned
      }

      // 2️⃣ Sign challenge
      const signature = await this.wallet.signMessage(challengeRes.message);
      // Signs challenge message with wallet private key

      // 3️⃣ Verify signature + role → JWT
      const verifyRes = await this.http.post<{
        token: string;
        user: { role: AppRole };
      }>(
        `${environment.backendUrl}/api/auth/verify`,
        {
          message: challengeRes.message,
          signature,
          requestedRole: selectedRole   // ROLE IS DECLARED HERE
        }
      ).toPromise();
      // Sends signed message and selected role to backend for verification

      if (!verifyRes?.token || !verifyRes?.user?.role) {
        throw new Error('Invalid authentication response');
        // Ensures valid JWT and role are returned
      }

      // 4️⃣ Commit auth state
      this._token.set(verifyRes.token);
      // Stores JWT token

      this._role.set(verifyRes.user.role);
      // Stores role from backend

      if (this.isBrowser) {
        localStorage.setItem('auth_token', verifyRes.token);
        // Persists token in localStorage (browser only)
      }

      // 5️⃣ Navigate strictly by JWT role
      const target = this.getDefaultRouteForRole(verifyRes.user.role);
      // Determines route based on role

      await this.router.navigate([target]);
      // Navigates to role-specific page

      return true;
      // Indicates successful login

    } catch (err: any) {
      console.error('Login failed:', err);
      // Logs error

      this.clearSession();
      // Clears session on failure

      throw new Error(err.message || 'Authentication failed');
      // Throws user-friendly error
    }
  }

  // ===============================
  // LOGOUT
  // ===============================
  logout(): void {
    this.clearSession();
    // Clears auth state

    this.wallet.disconnect(); // explicit user action only
    // Disconnects wallet (only here to avoid recursion)

    this.router.navigate(['/login']);
    // Redirects to login page
  }

  // ===============================
  // INTERNAL HELPERS
  // ===============================
  private clearSession(): void {
    this._token.set(null);
    // Clears token

    this._role.set('USER');
    // Resets role to default

    if (this.isBrowser) {
      localStorage.removeItem('auth_token');
      // Removes token from localStorage
    }
  }

  private getDefaultRouteForRole(role: AppRole): string {
    switch (role) {
      case 'ADMIN':
        return '/advanced';
        // Route for admin users

      case 'VERIFIER':
        return '/verifier';
        // Route for verifier users

      default:
        return '/vault';
        // Default route for regular users
    }
  }

  // Used by HTTP interceptor
  getAuthHeader(): { Authorization?: string } {

    const token = this._token();
    // Retrieves current JWT token

    return token ? { Authorization: `Bearer ${token}` } : {};
    // Returns Authorization header if token exists
  }
}