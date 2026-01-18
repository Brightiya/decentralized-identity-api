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
  // Helper: Base headers with optional Accept-Language
  // ────────────────────────────────────────────────
  private getHeaders(acceptLanguage = 'en'): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Accept-Language': acceptLanguage
    });
  }

  // ────────────────────────────────────────────────
  // NEW: Pinata JWT header (uses user's stored JWT if available)
  // ────────────────────────────────────────────────
  private getPinataHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const userJwt = localStorage.getItem('user_pinata_jwt');

    if (userJwt) {
      return baseHeaders.set('X-Pinata-User-JWT', userJwt);
    }

    // If no user JWT → backend will fallback to shared key
    return baseHeaders;
  }

  /* -------------------------------------------------
     Advanced / Diagnostic DID endpoints (Legacy) - unchanged
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
     VC endpoints (Hybrid / GDPR-aware) - added Pinata header where needed
  -------------------------------------------------- */

  issueVC(payload: {
    issuer: string;
    subject: string;
    claimId: string;
    claim: any;
    context?: string;
    consent?: { purpose?: string; expiresAt?: string };
  }): Observable<any> {
    const headers = this.getPinataHeaders(this.getHeaders());
    return this.http.post(`${this.base}/api/vc/issue`, payload, { headers });
  }

  verifyVC(payload: {
    subject: string;
    verifierDid: string;
    purpose: string;
    context: string;
    consent: boolean;
    credentials: { cid: string; claimId: string }[];
  }): Observable<any> {
    // verifyVC only reads → no need for Pinata JWT
    return this.http.post(`${this.base}/api/vc/verify`, payload);
  }

  validateRawVC(vc: any): Observable<any> {
    // validateRawVC only reads → no Pinata JWT needed
    return this.http.post(`${this.base}/api/vc/validate`, vc);
  }

  /* -------------------------------------------------
     Consent endpoints (GDPR-compliant) - unchanged
  -------------------------------------------------- */

  getActiveConsents(owner: string, context: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/api/consent/active/${encodeURIComponent(owner)}/${encodeURIComponent(context)}`
    );
  }

  getSuggestableClaims(subjectDid: string): Observable<any> {
    return this.http.get(
      `${this.base}/api/consent/suggestable/${encodeURIComponent(subjectDid)}`
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
     Profile endpoints (UPDATED & COMPATIBLE) - added Pinata header
  -------------------------------------------------- */

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

  getProfileByContext(address: string, context: string): Observable<any> {
    return this.getProfile(address, context);
  }

  /**
   * Create or update profile (uses user's Pinata JWT if available)
   */
  createProfile(payload: any): Observable<any> {
    const headers = this.getPinataHeaders(this.getHeaders());
    return this.http.post(`${this.base}/api/profile`, payload, { headers });
  }

  /**
   * Partial update profile (uses user's Pinata JWT if available)
   */
  updateProfile(address: string, payload: any): Observable<any> {
    const headers = this.getPinataHeaders(this.getHeaders());
    return this.http.put(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      payload,
      { headers }
    );
  }

  /* -------------------------------------------------
     Disclosure audit & GDPR rights - unchanged
  -------------------------------------------------- */

  getDisclosuresForSubject(subjectDid: string): Observable<any> {
    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`
    );
  }

  getDisclosuresBySubject(
    subjectDid: string,
    limit = 50,
    offset = 0,
    context?: string,
  ): Observable<any> {
    let params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    if (context && context.trim().length > 0) {
      params = params.set('context', context.trim());
    }

    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`,
      { params }
    );
  }

  exportDisclosures(subjectDid: string): Observable<any> {
    return this.http.get(
      `${this.base}/api/disclosures/${encodeURIComponent(subjectDid)}/export`
    );
  }

  eraseProfile(payload: { did: string }): Observable<any> {
    return this.http.delete(
      `${this.base}/api/gdpr/erase`,
      { body: payload }
    );
  }
}