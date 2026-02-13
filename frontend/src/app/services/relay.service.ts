// src/app/services/relay.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RelayService {

  private http = inject(HttpClient);
  private baseUrl = environment.backendUrl;

  async relay(req: any, signature: string): Promise<string> {
  try {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; txHash: string; error?: string }>(
        `${this.baseUrl}/meta/relay`,
        { request: req, signature }
      )
    );

    if (!response.success) {
      throw new Error(response.error || "Relay failed");
    }

    return response.txHash;

  } catch (err: any) {
    throw new Error(err?.error?.error || err.message || "Relay failed");
  }
}
}
