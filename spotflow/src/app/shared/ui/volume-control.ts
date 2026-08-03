import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AudioSettingsService } from '../../core/services/audio-settings.service';

@Component({
  selector: 'app-volume-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed right-4 top-4 z-40">
      <button
        type="button"
        class="flex size-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.08)] transition-transform duration-150 hover:scale-105"
        (click)="open.set(!open())"
        aria-label="Ajustar volume"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Z" />
        </svg>
      </button>

      @if (open()) {
        <div
          class="absolute right-0 top-[calc(100%+0.5rem)] flex w-56 flex-col gap-1 rounded-2xl border border-black/5 bg-paper p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <label class="flex flex-col gap-1 text-sm">
            <span class="flex items-center justify-between text-ink/70">
              <span>Volume das músicas</span>
              <span class="tabular-nums">{{ gamePercent() }}%</span>
            </span>
            <input
              type="range"
              class="accent-ink"
              min="0"
              max="1"
              step="0.05"
              [value]="settings.gameVolume()"
              (input)="onGameInput($event)"
            />
          </label>
        </div>
      }
    </div>
  `,
})
export class VolumeControl {
  protected readonly settings = inject(AudioSettingsService);
  protected readonly open = signal(false);

  protected readonly gamePercent = () => Math.round(this.settings.gameVolume() * 100);

  protected onGameInput(event: Event): void {
    this.settings.setGameVolume(Number((event.target as HTMLInputElement).value));
  }
}
