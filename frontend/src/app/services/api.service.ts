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
      purpose?: string;
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
    subject: string;
    verifierDid: string;
    purpose: string;
    context: string;
    consent: boolean;
    credentials: { cid: string; claimId: string }[];
  }) {
    return this.http.post(`${this.base}/api/vc/verify`, payload);
  }

  /* -------------------------------------------------
     Consent endpoints (GDPR-compliant)
  -------------------------------------------------- */

  /**
   * Fetch active consents for a DID (per context)
   */
  getActiveConsents(owner: string, context: string) {
    return this.http.get<any[]>(
      `${this.base}/api/consent/active/${encodeURIComponent(owner)}/${encodeURIComponent(context)}`
    );
  }

  /**
   * Grant consent (context REQUIRED)
   */
  grantConsent(payload: {
    owner: string;
    claimId: string;
    purpose: string;
    context: string;
    expiresAt?: string;
  }) {
    return this.http.post(
      `${this.base}/api/consent/grant`,
      payload
    );
  }

  /**
   * Revoke a specific consent
   * (context-aware, purpose optional)
   */
  revokeConsent(payload: {
    owner: string;
    claimId: string;
    context?: string;
    purpose?: string;
  }) {
    return this.http.post(
      `${this.base}/api/consent/revoke`,
      payload
    );
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
   * (e.g. identity, medical, professional)
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
     Disclosure audit & GDPR rights
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
