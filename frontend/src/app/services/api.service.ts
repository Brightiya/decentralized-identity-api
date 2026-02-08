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
  // Base headers (Accept + language) - unchanged
  // ────────────────────────────────────────────────
  private getBaseHeaders(acceptLanguage = 'en'): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Accept-Language': acceptLanguage
    });
  }

  // ────────────────────────────────────────────────
  // Pinata JWT for uploads - unchanged
  // ────────────────────────────────────────────────
  private getPinataHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const userJwt = localStorage.getItem('user_pinata_jwt');
    return userJwt ? baseHeaders.set('X-Pinata-User-JWT', userJwt) : baseHeaders;
  }

  // ────────────────────────────────────────────────
  // NEW: nft.storage API key for uploads (preferred over Pinata)
  // ────────────────────────────────────────────────
  private getNftStorageHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const nftKey = localStorage.getItem('nft_storage_api_key');
    return nftKey ? baseHeaders.set('X-NFT-Storage-Key', nftKey) : baseHeaders;
  }

  // ────────────────────────────────────────────────
  // Combined headers for ALL UPLOAD/WRITE operations
  // Priority: nft.storage > Pinata user > base
  // ────────────────────────────────────────────────
  private getUploadHeaders(acceptLanguage = 'en'): HttpHeaders {
    let headers = this.getBaseHeaders(acceptLanguage);
    headers = this.getNftStorageHeaders(headers);   // Highest priority
    headers = this.getPinataHeaders(headers);       // Fallback
    return headers;
  }

  // ────────────────────────────────────────────────
  // Custom IPFS Gateway for READING only - unchanged
  // ────────────────────────────────────────────────
  private getGatewayHeaders(baseHeaders: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const customGateway = localStorage.getItem('custom_ipfs_gateway');
    return customGateway ? baseHeaders.set('X-Preferred-Gateway', customGateway) : baseHeaders;
  }

  /* -------------------------------------------------
     DID endpoints (Legacy) - unchanged, no headers needed
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
     VC endpoints
  -------------------------------------------------- */

  issueVC(payload: any): Observable<any> {
    const headers = this.getUploadHeaders(); // Uses nft.storage > Pinata
    return this.http.post(`${this.base}/api/vc/issue`, payload, { headers });
  }

  verifyVC(payload: any): Observable<any> {
    const headers = this.getGatewayHeaders(this.getBaseHeaders()); // Only custom gateway
    return this.http.post(`${this.base}/api/vc/verify`, payload, { headers });
  }

  validateRawVC(vc: any): Observable<any> {
    const headers = this.getGatewayHeaders(this.getBaseHeaders()); // Only custom gateway
    return this.http.post(`${this.base}/api/vc/validate`, vc, { headers });
  }

  /* -------------------------------------------------
     Consent endpoints - unchanged (no IPFS involved)
  -------------------------------------------------- */
  getActiveConsents(owner: string, context: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/consent/active/${encodeURIComponent(owner)}/${encodeURIComponent(context)}`);
  }

  getSuggestableClaims(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/consent/suggestable/${encodeURIComponent(subjectDid)}`);
  }

  grantConsent(payload: any): Observable<any> {
    return this.http.post(`${this.base}/api/consent/grant`, payload);
  }

  revokeConsent(payload: any): Observable<any> {
    return this.http.post(`${this.base}/api/consent/revoke`, payload);
  }

  /* -------------------------------------------------
     Profile endpoints
  -------------------------------------------------- */

  getProfile(address: string, context?: string, acceptLanguage = 'en'): Observable<any> {
    let params = new HttpParams();
    if (context) params = params.set('context', context);

    const headers = this.getGatewayHeaders(this.getBaseHeaders(acceptLanguage));

    return this.http.get(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      { headers, params }
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

  createProfile(payload: any): Observable<any> {
    const headers = this.getUploadHeaders();
    return this.http.post(`${this.base}/api/profile`, payload, { headers });
  }

  updateProfile(address: string, payload: any): Observable<any> {
    const headers = this.getUploadHeaders();
    return this.http.put(
      `${this.base}/api/profile/${encodeURIComponent(address)}`,
      payload,
      { headers }
    );
  }

  /* -------------------------------------------------
     Disclosure & GDPR - unchanged
  -------------------------------------------------- */

  getDisclosuresForSubject(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`);
  }

  getDisclosuresBySubject(subjectDid: string, limit = 50, offset = 0, context?: string): Observable<any> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (context && context.trim()) params = params.set('context', context.trim());

    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`,
      { params }
    );
  }

  /* -------------------------------------------------
   Verifier audit trail (GDPR accountability)
-------------------------------------------------- */
getDisclosuresByVerifier(verifierDid: string): Observable<any> {
  return this.http.get(
    `${this.base}/api/disclosures/verifier/${encodeURIComponent(verifierDid)}`
  );
}


  exportDisclosures(subjectDid: string): Observable<any> {
    return this.http.get(`${this.base}/api/disclosures/${encodeURIComponent(subjectDid)}/export`);
  }

// FIXED: Changed payload type to { did: string } to match your component usage
  eraseProfile(payload: { did: string }): Observable<any> {
    return this.http.delete(`${this.base}/api/gdpr/erase`, { body: payload });
  }

  // Add these methods to your existing ApiService in api.service.ts

/* -------------------------------------------------
   GSN (Gasless) endpoints
-------------------------------------------------- */

// Get GSN configuration
getGSNConfig(): Observable<any> {
  return this.http.get(`${this.base}/gsn/config`);
}

// Get GSN status
getGSNStatus(): Observable<any> {
  return this.http.get(`${this.base}/gsn/status`);
}

// Check if address is whitelisted for GSN
checkGSNWhitelist(address: string): Observable<any> {
  return this.http.get(`${this.base}/gsn/whitelist/${encodeURIComponent(address)}`);
}

// Prepare GSN transaction (requires auth)
prepareGSNTransaction(methodName: string, args: any[]): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.base}/gsn/prepare-tx`,
    { methodName, args },
    { headers }
  );
}

// Prepare GSN setProfileCID (requires auth)
prepareGSNSetProfileCID(subjectAddress: string, cid: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.base}/gsn/prepare-set-profile-cid`,
    { subjectAddress, cid },
    { headers }
  );
}

// Prepare GSN createProfile (requires auth)
prepareGSNCreateProfile(subjectAddress: string): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(
    `${this.base}/gsn/prepare-create-profile`,
    { subjectAddress },
    { headers }
  );
}

// NEW: Create profile with GSN option
createProfileWithGSN(payload: { owner: string, useGSN?: boolean }): Observable<any> {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.base}/api/profile`, payload, { headers });
}

// Add this helper method if you don't have it
private getAuthHeaders(): HttpHeaders {
  const token = localStorage.getItem('authToken');
  let headers = this.getBaseHeaders();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
}