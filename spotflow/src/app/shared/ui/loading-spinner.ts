import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block animate-spin rounded-full border-2 border-ink/15 border-t-ink"
      [style.width.px]="sizePx()"
      [style.height.px]="sizePx()"
      role="status"
      aria-label="Loading"
    ></span>
  `,
})
export class LoadingSpinner {
  readonly sizePx = input(20);
}
