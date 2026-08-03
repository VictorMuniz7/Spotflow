import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RoundOutcome } from '../../core/models/game.models';

@Component({
  selector: 'app-round-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-4 text-center">
      <p
        class="font-sketch text-2xl"
        [class.text-glitch-cyan]="outcome().correct"
        [class.text-glitch-red]="!outcome().correct"
      >
        {{ outcome().correct ? 'Você acertou!' : 'Não foi dessa vez' }}
      </p>

      @if (outcome().correct) {
        <p class="tabular-nums text-ink/70">+{{ outcome().points }} pontos</p>
      }

      <div class="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.06)]">
        @if (outcome().track.albumImageUrl) {
          <img
            [src]="outcome().track.albumImageUrl"
            [alt]="outcome().track.name"
            width="56"
            height="56"
            class="size-14 shrink-0 rounded-lg object-cover"
          />
        }
        <div class="text-left">
          <p class="font-medium">{{ outcome().track.name }}</p>
          <p class="text-sm text-ink/60">{{ outcome().track.artists.join(', ') }}</p>
        </div>
      </div>

      <button
        type="button"
        class="min-h-11 min-w-40 cursor-pointer rounded-full bg-ink px-6 py-3 font-medium text-paper transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
        (click)="next.emit()"
      >
        {{ isLastRound() ? 'Ver resultado final' : 'Próxima rodada' }}
      </button>
    </div>
  `,
})
export class RoundResult {
  readonly outcome = input.required<RoundOutcome>();
  readonly isLastRound = input(false);
  readonly next = output<void>();
}
