import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _darkMode = signal<boolean>(false);

  // Public readonly signal for components to consume
  darkMode = this._darkMode.asReadonly();

  constructor() {
    // Initialize from localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        this._darkMode.set(saved === 'true');
      } else {
        // Respect system preference as fallback
        this._darkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }

      // Optional: listen for system changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('darkMode') === null) {
          this._darkMode.set(e.matches);
        }
      });
    }
  }

  toggle() {
    const newValue = !this._darkMode();
    this._darkMode.set(newValue);

    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newValue));
      document.documentElement.classList.toggle('dark', newValue);
    }
  }

  // Optional: force sync if needed (e.g. after login/logout)
  initialize() {
    if (typeof window !== 'undefined') {
      const isDark = this._darkMode();
      document.documentElement.classList.toggle('dark', isDark);
    }
  }
}