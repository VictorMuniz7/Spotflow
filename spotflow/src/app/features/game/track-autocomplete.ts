import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SpotifyTrack } from '../../core/models/spotify.models';

const MAX_SUGGESTIONS = 6;

@Component({
  selector: 'app-track-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex w-full max-w-md items-center gap-2">
      <input
        type="text"
        class="min-h-11 w-full rounded-full border border-black/10 bg-paper px-5 py-3 outline-none transition-shadow duration-150 focus:shadow-[0_0_0_3px_var(--color-glitch-cyan)] disabled:opacity-60"
        placeholder="Digite o nome da música…"
        [disabled]="disabled()"
        [value]="query()"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      />
      <button
        type="button"
        class="min-h-11 min-w-11 shrink-0 cursor-pointer rounded-full bg-ink px-5 font-medium text-paper transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        [disabled]="disabled() || query().trim().length === 0"
        (click)="submit()"
      >
        Confirmar
      </button>

      @if (suggestions().length > 0) {
        <ul
          class="absolute inset-x-0 top-[calc(100%+0.5rem)] z-10 max-h-64 overflow-auto rounded-2xl border border-black/5 bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          @for (track of suggestions(); track track.id; let index = $index) {
            <li>
              <button
                type="button"
                class="flex min-h-11 w-full cursor-pointer items-center px-4 text-left transition-colors duration-100"
                [class.bg-paper-dim]="index === activeIndex()"
                (mousedown)="choose(track)"
              >
                <span class="truncate">{{ track.name }} — {{ track.artists.join(', ') }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class TrackAutocomplete {
  readonly tracks = input.required<SpotifyTrack[]>();
  readonly disabled = input(false);
  readonly submitGuess = output<string | null>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly selectedTrackId = signal<string | null>(null);

  protected readonly suggestions = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return [];
    }

    // Matches by title OR by artist (so typing the artist first still finds
    // their songs), title matches ranked first since that's the more direct
    // signal once the list is narrowed down by an artist name.
    const byTitle: SpotifyTrack[] = [];
    const byArtistOnly: SpotifyTrack[] = [];

    for (const track of this.tracks()) {
      if (track.name.toLowerCase().includes(term)) {
        byTitle.push(track);
      } else if (track.artists.some((artist) => artist.toLowerCase().includes(term))) {
        byArtistOnly.push(track);
      }
    }

    return [...byTitle, ...byArtistOnly].slice(0, MAX_SUGGESTIONS);
  });

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.selectedTrackId.set(null);
    this.activeIndex.set(-1);
  }

  protected choose(track: SpotifyTrack): void {
    this.query.set(track.name);
    this.selectedTrackId.set(track.id);
    this.activeIndex.set(-1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.suggestions();

    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      this.activeIndex.update((index) => (index - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const active = this.activeIndex();
      if (active >= 0 && options[active]) {
        this.choose(options[active]);
      }
      this.submit();
    }
  }

  protected submit(): void {
    this.submitGuess.emit(this.selectedTrackId());
    this.query.set('');
    this.selectedTrackId.set(null);
    this.activeIndex.set(-1);
  }
}
