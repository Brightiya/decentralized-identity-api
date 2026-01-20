import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContextService {
  private readonly DEFAULT_CONTEXTS = [
    'personal',
    'professional',
    'legal'
  ];

  private contextsSubject = new BehaviorSubject<string[]>(
    [...this.DEFAULT_CONTEXTS]
  );

  contexts$ = this.contextsSubject.asObservable();

  get contexts(): string[] {
    return this.contextsSubject.value;
  }

  addContext(ctx: string) {
    const normalized = ctx.trim().toLowerCase();
    if (!normalized) return;

    if (this.contexts.includes(normalized)) return;

    this.contextsSubject.next([
      ...this.contexts,
      normalized
    ]);
  }
}

