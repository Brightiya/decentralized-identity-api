import { Injectable, signal } from '@angular/core';
// Injectable: enables dependency injection
// signal: Angular reactive primitive for state management

@Injectable({ providedIn: 'root' })
// Registers the service as a singleton available throughout the app
export class ProfileStateService {

  profileExists = signal<boolean>(false);
  // Tracks whether a user profile exists

  isErased = signal<boolean>(false);
  // Tracks whether the profile has been erased (e.g., GDPR deletion)

  erasedAt = signal<string | null>(null);
  // Stores timestamp of when the profile was erased (if applicable)

  setProfileStatus(exists: boolean, erased: boolean = false, erasedAt: string | null = null) {
    // Updates all profile-related state values

    this.profileExists.set(exists);
    // Sets profile existence flag

    this.isErased.set(erased);
    // Sets erased status

    this.erasedAt.set(erasedAt);
    // Sets erase timestamp
  }

  reset() {
    // Resets profile state to default values

    this.profileExists.set(false);
    // Resets profile existence

    this.isErased.set(false);
    // Resets erased status

    this.erasedAt.set(null);
    // Clears erase timestamp
  }
}