/** 
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = environment.backendUrl;

  constructor(private http: HttpClient) {}

  // DID endpoints
  registerDID(payload: any) {
    return this.http.post(`${this.base}/api/did/register`, payload);
  }
  resolveDID(address: string) {
    return this.http.get(`${this.base}/api/did/${address}`);
  }
  verifyDID(payload: any) {
    return this.http.post(`${this.base}/api/did/verify`, payload);
  }

  // VC endpoints
  issueVC(payload: any) {
    return this.http.post(`${this.base}/api/vc/issue`, payload);
  }
  verifyVC(payload: any) {
    return this.http.post(`${this.base}/api/vc/verify`, payload);
  }

  // Profile
  getProfile(address: string) {
    return this.http.get(`${this.base}/api/profile/${address}`);
  }
  createProfile(payload: any) {
    return this.http.post(`${this.base}/api/profile`, payload);
  }
}
*/


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = environment.backendUrl;

  constructor(private http: HttpClient) {}

    /* -------------------------------------------------
    Advanced / Diagnostic DID endpoints
    (Legacy – used only in Advanced tools)
  -------------------------------------------------- */
    
    /**
   * Register a DID on-chain (advanced / legacy flow)
   */
  registerDID(payload: {
    address: string;
  }) {
    return this.http.post(
      `${this.base}/api/did/register`,
      payload
    );
  }

  /**
   * Resolve a DID document (diagnostic / advanced)
   */
  resolveDID(didOrAddress: string) {
    return this.http.get(
      `${this.base}/api/did/${encodeURIComponent(didOrAddress)}`
    );
  }

  /**
   * Verify DID ownership via signature challenge
   * (Advanced / non-VC flow)
   */
  verifyDID(payload: {
    address: string;
    signature: string;
  }) {
    return this.http.post(
      `${this.base}/api/did/verify`,
      payload
    );
  }


  /* -------------------------------------------------
     VC endpoints (Hybrid / GDPR-aware)
  -------------------------------------------------- */

  /**
   * Issue a context-aware Verifiable Credential
   */
  issueVC(payload: {
    issuer: string;
    subject: string;
    claimId: string;
    claim: any;
    context?: string;
    consent?: {
      purpose: string;
      expiresAt?: string;
    };
  }) {
    return this.http.post(`${this.base}/api/vc/issue`, payload);
  }

  /**
   * Verify VC with enforced disclosure
   * (purpose + consent + verifier DID required)
   */
  verifyVC(payload: {
    cid: string;
    claimId: string;
    subject: string;
    verifierDid: string;
    purpose: string;
    consent: boolean;
  }) {
    return this.http.post(`${this.base}/api/vc/verify`, payload);
  }

  /* -------------------------------------------------
     Profile endpoints
  -------------------------------------------------- */

  getProfile(address: string) {
    return this.http.get(
      `${this.base}/api/profile/${encodeURIComponent(address)}`
    );
  }

    /* -------------------------------------------------
    Profile endpoints (Context-aware)
  -------------------------------------------------- */

  /**
   * Fetch profile attributes filtered by context
   * (e.g. personal, professional, legal)
   */
  getProfileByContext(address: string, context: string) {
    return this.http.get(
      `${this.base}/api/profile/${encodeURIComponent(address)}?context=${encodeURIComponent(context)}`
    );
  }

  createProfile(payload: any) {
    return this.http.post(`${this.base}/api/profile`, payload);
  }

  /* -------------------------------------------------
     Disclosure audit & GDPR rights (NEW)
  -------------------------------------------------- */

  /**
   * Fetch disclosure history for a subject DID
   * (GDPR Art. 15 – Right of Access)
   */
  getDisclosuresForSubject(subjectDid: string) {
    return this.http.get(
      `${this.base}/api/disclosures/subject/${encodeURIComponent(subjectDid)}`
    );
  }

  /**
   * Export disclosure history as JSON
   * (GDPR Art. 15 – Data Portability)
   */
  exportDisclosures(subjectDid: string) {
    return this.http.get(
      `${this.base}/api/disclosures/${encodeURIComponent(subjectDid)}/export`
    );
  }

    /**
   * GDPR Art.17 – Right to Erasure
   */
  eraseProfile(payload: { did: string }) {
    return this.http.delete(
      `${this.base}/api/gdpr/erase`,
      { body: payload }
    );
  }

  validateRawVC(vc: any) {
  return this.http.post(`${this.base}/api/vc/validate`, vc);
  }
}
