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
