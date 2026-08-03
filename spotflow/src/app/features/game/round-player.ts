import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type RoundPlayerPhase = 'connecting' | 'ready' | 'playing' | 'answering';

@Component({
  selector: 'app-round-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-4">
      <p class="tabular-nums text-sm text-ink/60">Rodada {{ roundNumber() }} de {{ totalRounds() }}</p>

      <button
        type="button"
        class="flex size-24 cursor-pointer items-center justify-center rounded-full bg-ink text-paper shadow-[0_1px_2px_rgba(0,0,0,0.12),0_10px_24px_rgba(0,0,0,0.2)] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        [disabled]="phase() !== 'ready'"
        (click)="play.emit()"
        aria-label="Tocar trecho da música"
      >
        @if (phase() === 'connecting') {
          <span class="size-6 animate-spin rounded-full border-2 border-paper/30 border-t-paper"></span>
        } @else if (phase() === 'playing') {
          <span class="tabular-nums text-2xl font-semibold">{{ remainingSeconds() }}</span>
        } @else if (phase() === 'answering') {
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z" />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        }
      </button>

      <div class="h-1.5 w-48 overflow-hidden rounded-full bg-paper-dim">
        <div
          class="h-full rounded-full bg-glitch-cyan transition-[width] duration-150 ease-linear"
          [style.width.%]="progressPercent()"
        ></div>
      </div>

      <p class="text-sm text-ink/60">
        @if (phase() === 'connecting') {
          Conectando ao player do Spotify…
        } @else if (phase() === 'playing') {
          Ouça com atenção!
        } @else if (phase() === 'answering') {
          Digite sua resposta abaixo
        } @else {
          Toque para ouvir 5 segundos da música
        }
      </p>
    </div>
  `,
})
export class RoundPlayer {
  readonly roundNumber = input.required<number>();
  readonly totalRounds = input.required<number>();
  readonly phase = input.required<RoundPlayerPhase>();
  readonly progressPercent = input(0);
  readonly remainingSeconds = input(5);
  readonly play = output<void>();
}
