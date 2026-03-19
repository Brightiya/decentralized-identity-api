import { Injectable, signal, effect } from '@angular/core';
// Injectable: marks service for dependency injection
// signal: reactive state primitive
// effect: reactive side-effect utility (not used here but imported)

@Injectable({
  providedIn: 'root'
})
// Registers the service as a singleton available throughout the application
export class ThemeService {

  private _darkMode = signal<boolean>(false);
  // Internal signal storing whether dark mode is enabled

  // Public readonly signal for components to consume
  darkMode = this._darkMode.asReadonly();
  // Exposes dark mode state as a read-only signal

  constructor() {
    // Initialize from localStorage or system preference

    if (typeof window !== 'undefined') {
      // Ensures code runs only in browser environment

      const saved = localStorage.getItem('darkMode');
      // Retrieves saved theme preference from localStorage

      if (saved !== null) {
        this._darkMode.set(saved === 'true');
        // Applies stored preference if available
      } else {
        // Respect system preference as fallback
        this._darkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
        // Uses OS-level dark mode preference
      }

      
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Listens for changes in system theme

        if (localStorage.getItem('darkMode') === null) {
          this._darkMode.set(e.matches);
          // Updates theme only if user has not overridden preference
        }
      });
    }
  }

  toggle() {
    // Toggles dark mode state

    const newValue = !this._darkMode();
    // Inverts current value

    this._darkMode.set(newValue);
    // Updates signal

    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newValue));
      // Persists new preference

      document.documentElement.classList.toggle('dark', newValue);
      // Applies/removes 'dark' class on root element
    }
  }

  // Optional: force sync if needed (e.g. after login/logout)
  initialize() {
    if (typeof window !== 'undefined') {
      const isDark = this._darkMode();
      // Reads current dark mode value

      document.documentElement.classList.toggle('dark', isDark);
      // Ensures DOM reflects current state
    }
  }
}