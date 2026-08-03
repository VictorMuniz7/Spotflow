import { Injectable, signal } from '@angular/core';

export type ToastKind = 'loading' | 'success' | 'error';

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  text: string;
};

let nextId = 0;

/** Central feedback queue so any service or guard can surface loading/error/success state. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = signal<ToastMessage[]>([]);
  readonly toasts = this.messages.asReadonly();

  loading(text: string): number {
    return this.push('loading', text);
  }

  success(text: string, durationMs = 3000): number {
    return this.push('success', text, durationMs);
  }

  error(text: string, durationMs = 5000): number {
    return this.push('error', text, durationMs);
  }

  dismiss(id: number): void {
    this.messages.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, text: string, durationMs?: number): number {
    const id = nextId++;
    this.messages.update((list) => [...list, { id, kind, text }]);
    if (durationMs) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }
}
