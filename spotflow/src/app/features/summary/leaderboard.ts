import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LeaderboardEntry } from '../../core/models/leaderboard.models';

@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="flex w-full max-w-md flex-col gap-1">
      @for (entry of entries(); track entry.id; let index = $index) {
        <li
          class="flex items-center gap-3 rounded-xl border border-black/5 bg-paper px-4 py-2"
          [class.ring-2]="entry.spotifyUserId === currentUserId()"
          [class.ring-glitch-cyan]="entry.spotifyUserId === currentUserId()"
        >
          <span class="w-6 shrink-0 tabular-nums text-ink/50">{{ index + 1 }}</span>
          @if (entry.avatarUrl) {
            <img [src]="entry.avatarUrl" [alt]="entry.displayName" width="32" height="32" class="size-8 rounded-full object-cover" />
          } @else {
            <span class="size-8 shrink-0 rounded-full bg-paper-dim"></span>
          }
          <span class="flex-1 truncate">{{ entry.displayName }}</span>
          <span class="tabular-nums font-medium">{{ entry.totalScore }}</span>
        </li>
      }
    </ol>
  `,
})
export class Leaderboard {
  readonly entries = input.required<LeaderboardEntry[]>();
  readonly currentUserId = input<string | null>(null);
}
