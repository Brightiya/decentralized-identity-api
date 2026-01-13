import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = environment.backendUrl;

  constructor(private http: HttpClient) {}

  // ────────────────────────────────────────────────
  // Helper: Headers with optional Accept-Language
  // ────────────────────────────────────────────────
  private getHeaders(acceptLanguage = 'en'): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Accept-Language': acceptLanguage
    });
  }

  /* -------------------------------------------------
     Advanced / Diagnostic DID endpoints (Legacy)
  -------------------------------------------------- */

  registerDID(payload: { address: string }): Observable<any> {
    return this.http.post(`${this.base}/api/did/register`, payload);
  }

  resolveDID(didOrAddress: string): Observable<any> {
    return this.http.get(`${this.base}/api/did/${encodeURIComponent(didOrAddress)}`);
  }

  verifyDID(payload: { address: string; signature: string }): Observable<any> {
    return this.http.post(`${this.base}/api/did/verify`, payload);
  }

  /* -------------------------------------------------
     VC endpoints (Hybrid / GDPR-aware)
  -------------------------------------------------- */

  issueVC(payload: {
    issuer: string;
    subject: string;
    claimId: string;
    claim: any;
    context?: string;
    consent?: { purpose?: string; expiresAt?: string };
  }): Observable<any> {
    return this.http.post(`${this.base}/api/vc/issue`, payload);
  }

  verifyVC(payload: {
    subject: string;
    verifierDid: string;
    purpose: string;
    context: string;
    consent: boolean;
    credentials: { cid: string; claimId: string }[];
  }): Observable<any> {
    return this.http.post(`${this.base}/api/vc/verify`, payload);
  }

  validateRawVC(vc: any): Observable<any> {
    return this.http.post(`${this.base}/api/vc/validate`, vc);
  }

  /* -------------------------------------------------
     Consent endpoints (GDPR-compliant)
  -------------------------------------------------- */

  getActiveConsents(owner: string, context: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/api/consent/active/${encodeURIComponent(owner)}/${encodeURIComponent(context)}`
    );
  }

  grantConsent(payload: {
    owner: string;
    claimId: string;
    purpose: string;
    context: string;
    expiresAt?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/api/consent/grant`, payload);
  }

  revokeConsent(payload: {
    owner: string;
    claimId: string;
    context?: string;
    purpose?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/api/consent/revoke`, payload);
  }

  /* -------------------------------------------------
     Profile endpoints (UPDATED & COMPATIBLE)
  -------------------------------------------------- */

  /**
   * Primary: Get profile (supports optional context)
   */
  getProfile(address: string, context?: string, acceptLanguage = 'en'): Observable<any> {
    let params = new HttpParams();
    if (context) {
      params = params.set('context', context);
    }

    return this.http.get(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      { headers: this.getHeaders(acceptLanguage), params }
    ).pipe(
      catchError(err => {
        console.error('getProfile error:', err);
        return throwError(() => new Error('Failed to load profile'));
      })
    );
  }

  /**
   * Legacy alias: Restore original method name for compatibility
   * (used in consent.component.ts, contexts.component.ts, etc.)
   */
  getProfileByContext(address: string, context: string): Observable<any> {
    return this.getProfile(address, context);
  }

  /**
   * Create or update profile (merged strategy)
   */
  createProfile(payload: any): Observable<any> {
    return this.http.post(`${this.base}/api/profile`, payload);
  }

  /**
   * NEW: Partial update profile (recommended for edit form)
   */
  updateProfile(address: string, payload: any): Observable<any> {
    return this.http.put(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      payload
    );
  }

  /* -------------------------------------------------
     Disclosure audit & GDPR rights
  -------------------------------------------------- */

  getDisclosuresForSubject(subjectDid: string): Observable<any> {
    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`
    );
  }

  eraseProfile(payload: { did: string }): Observable<any> {
    return this.http.delete(
      `${this.base}/api/gdpr/erase`,
      { body: payload }
    );
  }
}