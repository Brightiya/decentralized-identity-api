// src/app/services/profile-state.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProfileStateService {
  profileExists = signal<boolean>(false);
  isErased = signal<boolean>(false);
  erasedAt = signal<string | null>(null);

  setProfileStatus(exists: boolean, erased: boolean = false, erasedAt: string | null = null) {
    this.profileExists.set(exists);
    this.isErased.set(erased);
    this.erasedAt.set(erasedAt);
  }

  reset() {
    this.profileExists.set(false);
    this.isErased.set(false);
    this.erasedAt.set(null);
  }
}