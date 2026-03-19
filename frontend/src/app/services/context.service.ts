import { Injectable } from '@angular/core';
// Marks this class as an injectable Angular service

import { BehaviorSubject } from 'rxjs';
// Imports BehaviorSubject to maintain and emit reactive state

@Injectable({ providedIn: 'root' })
// Makes the service globally available as a singleton
export class ContextService {

  private readonly DEFAULT_CONTEXTS = [
    'profile',
    'personal',
    'professional',
    'legal',
    'medical',
    'financial',
    'educational',
    'social',
    'cultural',
    'religious',
  ];
  // Defines the default set of contexts available in the application

  private contextsSubject = new BehaviorSubject<string[]>(
    [...this.DEFAULT_CONTEXTS]
  );
  // Initializes a BehaviorSubject with a copy of default contexts
  // BehaviorSubject always holds the latest value and emits it to new subscribers

  contexts$ = this.contextsSubject.asObservable();
  // Exposes the contexts as an observable stream for components to subscribe to

  get contexts(): string[] {
    return this.contextsSubject.value;
    // Provides synchronous access to the current contexts array
  }

  addContext(ctx: string) {
    const normalized = ctx.trim().toLowerCase();
    // Normalizes input by trimming whitespace and converting to lowercase

    if (!normalized) return;
    // Ignores empty or invalid input

    if (this.contexts.includes(normalized)) return;
    // Prevents adding duplicate contexts

    this.contextsSubject.next([
      ...this.contexts,
      normalized
    ]);
    // Emits updated context list with the new context appended
  }
}