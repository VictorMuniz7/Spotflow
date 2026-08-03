import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SpotifyPlaylistSummary } from '../../core/models/spotify.models';

@Component({
  selector: 'app-playlist-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="group flex min-h-11 cursor-pointer flex-col self-start overflow-hidden rounded-2xl border border-black/5 bg-paper text-left shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.06)] transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      [disabled]="disabled()"
      (click)="select.emit()"
    >
      <div class="aspect-square w-full shrink-0 overflow-hidden bg-paper-dim">
        @if (playlist().imageUrl) {
          <img
            [src]="playlist().imageUrl"
            [alt]="playlist().name"
            width="300"
            height="300"
            class="size-full object-cover"
          />
        }
      </div>
      <div class="flex flex-col gap-1 p-3">
        <span class="truncate font-medium">{{ playlist().name }}</span>
        <span class="text-sm text-ink/60 tabular-nums">{{ playlist().trackCount }} músicas</span>
      </div>
    </button>
  `,
})
export class PlaylistCard {
  readonly playlist = input.required<SpotifyPlaylistSummary>();
  readonly disabled = input(false);
  readonly select = output<void>();
}
