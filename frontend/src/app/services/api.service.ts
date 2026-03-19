import { Injectable } from '@angular/core';
// Marks this class as an injectable service in Angular's dependency injection system

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
// HttpClient: for making HTTP requests
// HttpHeaders: for constructing request headers
// HttpParams: for constructing query parameters

import { Observable, throwError } from 'rxjs';
// Observable: represents async data streams
// throwError: used to propagate errors in observable chains

import { catchError } from 'rxjs/operators';
// Operator to handle errors in observable pipelines

import { environment } from '../../environments/environment.prod';
// Imports environment configuration (e.g., backend URL)

@Injectable({ providedIn: 'root' })
// Makes this service globally available (singleton)
export class ApiService {

  base = environment.backendUrl;
  // Base URL for all backend API requests

  constructor(private http: HttpClient) {}
  // Injects Angular HttpClient for performing HTTP operations

  // ────────────────────────────────────────────────
  // Base headers (Accept + language) 
  // ────────────────────────────────────────────────
  private getBaseHeaders(acceptLanguage = 'en'): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Accept-Language': acceptLanguage
    });
    // Returns default headers specifying JSON response and language preference
  }

  // ────────────────────────────────────────────────
  // Pinata JWT for uploads 
  // ────────────────────────────────────────────────
  private getPinataHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const userJwt = localStorage.getItem('user_pinata_jwt');
    // Retrieves user-specific Pinata JWT from localStorage

    return userJwt ? baseHeaders.set('X-Pinata-User-JWT', userJwt) : baseHeaders;
    // Adds Pinata JWT header if available
  }

  // ────────────────────────────────────────────────
  // NEW: nft.storage API key for uploads (preferred over Pinata)
  // ────────────────────────────────────────────────
  private getNftStorageHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const nftKey = localStorage.getItem('nft_storage_api_key');
    // Retrieves nft.storage API key from localStorage

    return nftKey ? baseHeaders.set('X-NFT-Storage-Key', nftKey) : baseHeaders;
    // Adds nft.storage API key header if available
  }

  // ────────────────────────────────────────────────
  // Combined headers for ALL UPLOAD/WRITE operations
  // Priority: nft.storage > Pinata user > base
  // ────────────────────────────────────────────────
  private getUploadHeaders(acceptLanguage = 'en'): HttpHeaders {
    let headers = this.getBaseHeaders(acceptLanguage);
    // Starts with base headers

    headers = this.getNftStorageHeaders(headers);   // Highest priority
    // Adds nft.storage header first (preferred)

    headers = this.getPinataHeaders(headers);       // Fallback
    // Adds Pinata header if nft.storage is not present

    return headers;
    // Returns combined headers
  }

  // ────────────────────────────────────────────────
  // Custom IPFS Gateway for READING only 
  // ────────────────────────────────────────────────
  private getGatewayHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const customGateway = localStorage.getItem('custom_ipfs_gateway');
    // Retrieves custom IPFS gateway from localStorage

    return customGateway ? baseHeaders.set('X-Preferred-Gateway', customGateway) : baseHeaders;
    // Adds preferred gateway header if available
  }

  /* -------------------------------------------------
     DID endpoints (Legacy) - no headers needed
  -------------------------------------------------- */
  registerDID(payload: { address: string }): Observable<any> {
    return this.http.post(`${this.base}/api/did/register`, payload);
    // Registers a DID for a given address
  }

  resolveDID(didOrAddress: string): Observable<any> {
    return this.http.get(`${this.base}/api/did/${encodeURIComponent(didOrAddress)}`);
    // Resolves a DID or address to its associated data
  }

  verifyDID(payload: { address: string; signature: string }): Observable<any> {
    return this.http.post(`${this.base}/api/did/verify`, payload);
    // Verifies ownership of a DID using a signature
  }

  /* -------------------------------------------------
     VC endpoints
  -------------------------------------------------- */

  issueVC(payload: any): Observable<any> {
    const headers = this.getUploadHeaders(); // Uses nft.storage > Pinata
    return this.http.post(`${this.base}/api/vc/issue`, payload, { headers });
    // Issues a Verifiable Credential and uploads it using preferred storage
  }

  verifyVC(payload: any): Observable<any> {
    const headers = this.getGatewayHeaders(this.getBaseHeaders()); // Only custom gateway
    return this.http.post(`${this.base}/api/vc/verify`, payload, { headers });
    // Verifies a Verifiable Credential using optional custom gateway
  }

  validateRawVC(vc: any): Observable<any> {
    const headers = this.getGatewayHeaders(this.getBaseHeaders()); // Only custom gateway
    return this.http.post(`${this.base}/api/vc/validate`, vc, { headers });
    // Validates raw VC structure/content
  }

  /* -------------------------------------------------
     Issue VC with frontend-signed payload
  -------------------------------------------------- */
  issueSignedVC(payload: {
    signedVc: any;              // full signed VC JSON with proof
    context: string;
    claimId: string;
    currentProfileCid?: string | null;
    consent?: { purpose: string; expiresAt?: string };
  }): Observable<any> {
    const headers = this.getUploadHeaders(); // Reuse your existing upload headers (nft.storage > Pinata)

    return this.http.post(
      `${this.base}/api/vc/issue-signed`, 
      payload,
      { headers }
    ).pipe(
      catchError(err => {
        console.error('issueSignedVC error:', err);
        // Logs error to console

        return throwError(() => new Error(err.error?.error || 'Failed to process signed VC'));
        // Propagates a user-friendly error
      })
    );
  }

  /* -------------------------------------------------
     Consent endpoints (no IPFS involved)
  -------------------------------------------------- */
  getActiveConsents(owner: string, context: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/consent/active/${encodeURIComponent(owner)}/${encodeURIComponent(context)}`);
    // Retrieves active consents for a given owner and context
  }

  getSuggestableClaims(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/consent/suggestable/${encodeURIComponent(subjectDid)}`);
    // Retrieves claims that can be suggested for consent
  }

  grantConsent(payload: any): Observable<any> {
    return this.http.post(`${this.base}/api/consent/grant`, payload);
    // Grants consent for a specific action or data usage
  }

  revokeConsent(payload: any): Observable<any> {
    return this.http.post(`${this.base}/api/consent/revoke`, payload);
    // Revokes previously granted consent
  }

  /* -------------------------------------------------
     Profile endpoints
  -------------------------------------------------- */

  getProfile(address: string, context?: string, acceptLanguage = 'en'): Observable<any> {
    let params = new HttpParams();
    // Initializes query parameters

    if (context) params = params.set('context', context);
    // Adds context parameter if provided

    const headers = this.getGatewayHeaders(this.getBaseHeaders(acceptLanguage));
    // Combines base headers with optional custom gateway

    return this.http.get(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      { headers, params }
    ).pipe(
      catchError(err => {
        console.error('getProfile error:', err);
        // Logs error

        return throwError(() => new Error('Failed to load profile'));
        // Returns user-friendly error
      })
    );
  }

  getProfileByContext(address: string, context: string): Observable<any> {
    return this.getProfile(address, context);
    // Convenience wrapper for getProfile with context
  }

  createProfile(payload: any): Observable<any> {
    const headers = this.getUploadHeaders();
    return this.http.post(`${this.base}/api/profile`, payload, { headers });
    // Creates a new profile (uses upload headers)
  }

  updateProfile(address: string, payload: any): Observable<any> {
    const headers = this.getUploadHeaders();
    return this.http.put(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      payload,
      { headers }
    );
    // Updates an existing profile
  }

 // ────────────────────────────────────────────────
// Profile endpoints (DB-backed)
// ────────────────────────────────────────────────

/**
 * Get a user's profile from the database for a specific context.
 * @param address Ethereum address (normalized to lowercase by backend)
 * @param context Optional context (defaults to 'profile')
 */
getDbProfile(address: string, context: string = 'profile'): Observable<any> {
  let params = new HttpParams().set('context', context);
  // Sets query parameter for context

  return this.http.get(
    `${this.base}/api/profile/db/${encodeURIComponent(address)}`,
    { params, headers: this.getBaseHeaders() }
  ).pipe(
    catchError(err => {
      console.error('getDbProfile error:', err);
      // Logs error

      return throwError(() => new Error(err.error?.error || 'Failed to load profile'));
      // Returns user-friendly error
    })
  );
}

/**
 * Create or update a user's profile in the database for a specific context.
 * @param payload Profile data including owner address and optional context
 */
upsertDbProfile(payload: {
  owner: string;                    // Ethereum address
  context?: string;                 // e.g. 'profile', 'identity', 'custom'...
  gender?: string | null;
  pronouns?: string | null;
  bio?: string | null;
  online_links?: Record<string, string>;
}): Observable<any> {
  return this.http.post(
    `${this.base}/api/profile/db`,
    payload,
    { headers: this.getBaseHeaders() }
  ).pipe(
    catchError(err => {
      console.error('upsertDbProfile error:', err);
      // Logs error

      return throwError(() => new Error(err.error?.error || 'Failed to save profile'));
      // Returns user-friendly error
    })
  );
}

  /* -------------------------------------------------
     Disclosure & GDPR - unchanged
  -------------------------------------------------- */

  getDisclosuresForSubject(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`);
    // Retrieves disclosures for a specific subject
  }

  getDisclosuresBySubject(subjectDid: string, limit = 50, offset = 0, context?: string): Observable<any> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    // Sets pagination parameters

    if (context && context.trim()) params = params.set('context', context.trim());
    // Adds context filter if provided

    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`,
      { params }
    );
    // Retrieves disclosures with pagination and optional filtering
  }

  /* -------------------------------------------------
   Verifier audit trail (GDPR accountability)
-------------------------------------------------- */
getDisclosuresByVerifier(verifierDid: string): Observable<any> {
  return this.http.get(
    `${this.base}/api/disclosures/verifier/${encodeURIComponent(verifierDid)}`
  );
  // Retrieves disclosures performed by a specific verifier
}

  exportDisclosures(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/disclosures/${encodeURIComponent(subjectDid)}/export`);
    // Exports disclosures for a subject (e.g., for GDPR compliance)
  }

  eraseProfile(payload: { did: string }): Observable<any> {
    return this.http.delete(`${this.base}/api/profile/erase`, { body: payload });
    // Deletes a user's profile (right to be forgotten)
  }
  
}