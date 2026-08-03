import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-enter pointer-events-auto flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-paper px-4 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.08)]"
          [class.text-glitch-red]="toast.kind === 'error'"
          role="status"
        >
          @if (toast.kind === 'loading') {
            <span class="size-2.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink"></span>
          } @else if (toast.kind === 'success') {
            <span class="text-glitch-cyan">✓</span>
          } @else {
            <span>⚠</span>
          }
          <span>{{ toast.text }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-enter {
      animation: toast-in 180ms cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class ToastStack {
  protected readonly toastService = inject(ToastService);
}
