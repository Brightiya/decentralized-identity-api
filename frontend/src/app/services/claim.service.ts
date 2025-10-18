import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClaimService {
  private baseUrl = `${environment.backendUrl}/api/claims`;

  constructor(private http: HttpClient) {}

  setClaim(payload: { owner: string; claimId: string; claimHash: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/set`, payload);
  }

  getClaim(owner: string, claimId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${owner}/${claimId}`);
  }

  removeClaim(payload: { owner: string; claimId: string }): Observable<any> {
    return this.http.request('delete', `${this.baseUrl}/remove`, { body: payload });
  }
}
