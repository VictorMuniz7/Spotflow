import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { SpotifyPlaybackService } from '../../core/services/spotify-playback.service';
import { ToastService } from '../../shared/ui/toast.service';
import { RoundPlayer, RoundPlayerPhase } from './round-player';
import { TrackAutocomplete } from './track-autocomplete';
import { RoundResult } from './round-result';
import { RoundOutcome } from '../../core/models/game.models';

const CLIP_DURATION_MS = 5000;
const ANSWER_WINDOW_MS = 10_000;
const TICK_MS = 100;

@Component({
  selector: 'app-game-page',
  imports: [RoundPlayer, TrackAutocomplete, RoundResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      @if (phase() === 'result' && currentOutcome(); as outcome) {
        <app-round-result [outcome]="outcome" [isLastRound]="game.isComplete()" (next)="onNext()" />
      } @else {
        <app-round-player
          [roundNumber]="game.currentRoundNumber()"
          [totalRounds]="game.totalRounds()"
          [phase]="roundPlayerPhase()"
          [progressPercent]="progressPercent()"
          [remainingSeconds]="remainingSeconds()"
          (play)="onPlay()"
        />

        @if (phase() === 'answering') {
          <p class="tabular-nums text-sm text-glitch-red">Responda em {{ answerRemainingSeconds() }}s</p>
        }

        <app-track-autocomplete
          [tracks]="game.candidateTracks()"
          [disabled]="phase() !== 'playing' && phase() !== 'answering'"
          (submitGuess)="onGuessSubmit($event)"
        />

        @if (phase() === 'playing' || phase() === 'answering') {
          <button
            type="button"
            class="min-h-11 min-w-32 cursor-pointer rounded-full border border-ink/20 px-5 py-2 text-sm text-ink/70 transition-colors duration-150 hover:bg-ink/5"
            (click)="giveUp()"
          >
            Desistir
          </button>
        }
      }
    </main>
  `,
})
export class GamePage implements OnDestroy {
  protected readonly game = inject(GameStateService);
  private readonly playback = inject(SpotifyPlaybackService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly phase = signal<RoundPlayerPhase | 'result'>('connecting');
  protected readonly progressPercent = signal(0);
  protected readonly remainingSeconds = signal(5);
  protected readonly answerRemainingSeconds = signal(10);
  protected readonly currentOutcome = signal<RoundOutcome | null>(null);
  protected readonly roundPlayerPhase = computed<RoundPlayerPhase>(() => {
    const current = this.phase();
    return current === 'result' ? 'answering' : current;
  });

  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private answerInterval: ReturnType<typeof setInterval> | null = null;
  // Bumped on every onPlay() call so a stale invocation (its playClip still
  // resolving after the player already answered early and started the next
  // round) can recognize it's been superseded and skip touching shared state.
  private playToken = 0;

  constructor() {
    void this.init();
  }

  ngOnDestroy(): void {
    this.clearProgressInterval();
    this.clearAnswerCountdown();
  }

  private async init(): Promise<void> {
    try {
      await this.playback.ensureReady();
    } catch {
      this.toast.error('Não foi possível conectar ao player do Spotify.');
      return;
    }
    this.startRound();
  }

  private startRound(): void {
    this.currentOutcome.set(null);
    this.game.startNextRound();
    this.phase.set('ready');
  }

  protected async onPlay(): Promise<void> {
    const track = this.game.currentTrack();
    if (!track) {
      return;
    }

    const token = ++this.playToken;
    this.phase.set('playing');
    this.progressPercent.set(0);
    this.remainingSeconds.set(5);
    // The progress ticker starts inside onStarted below, once Spotify has
    // actually begun playback — starting it here instead would tick down
    // through the network round-trip to Spotify's /play call, silently
    // eating a second or two of the 5s clip before audio is even audible.

    try {
      await this.playback.playClip(track, CLIP_DURATION_MS, () => {
        if (token !== this.playToken) {
          return;
        }
        this.game.markPlaybackStarted();
        this.startProgressTicker();
      });
    } catch {
      if (token === this.playToken) {
        this.toast.error('A reprodução falhou. Tente tocar novamente.');
      }
    } finally {
      // Stale call (a newer round already started): never touch state that
      // belongs to whatever round is current now.
      if (token !== this.playToken) {
        return;
      }
      this.clearProgressInterval();
      // A correct guess submitted while the clip was still playing already
      // moved the phase to 'result' (see onGuessSubmit). Without this guard,
      // playClip resolving afterwards would unconditionally force the phase
      // back to 'answering', reopening the input as if nothing was answered.
      if (this.phase() === 'playing') {
        this.phase.set('answering');
        this.startAnswerCountdown();
      }
    }
  }

  protected onGuessSubmit(guessedTrackId: string | null): void {
    if (this.phase() !== 'answering' && this.phase() !== 'playing') {
      return;
    }
    this.clearAnswerCountdown();
    const outcome = this.game.submitGuess(guessedTrackId);
    this.currentOutcome.set(outcome);
    this.phase.set('result');
  }

  /** Explicit skip: same as an unanswered timeout, 0 points, moves on. */
  protected giveUp(): void {
    this.onGuessSubmit(null);
  }

  protected onNext(): void {
    if (this.game.isComplete()) {
      void this.router.navigateByUrl('/summary');
      return;
    }
    this.startRound();
  }

  private startProgressTicker(): void {
    const startedAt = Date.now();
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const percent = Math.min((elapsed / CLIP_DURATION_MS) * 100, 100);
      this.progressPercent.set(percent);
      this.remainingSeconds.set(Math.max(Math.ceil((CLIP_DURATION_MS - elapsed) / 1000), 0));
    }, TICK_MS);
  }

  private clearProgressInterval(): void {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /** No answer within 10s of the clip ending auto-submits as wrong (0 points). */
  private startAnswerCountdown(): void {
    const startedAt = Date.now();
    this.answerRemainingSeconds.set(10);
    this.answerInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      this.answerRemainingSeconds.set(Math.max(Math.ceil((ANSWER_WINDOW_MS - elapsed) / 1000), 0));

      if (elapsed >= ANSWER_WINDOW_MS) {
        this.onGuessSubmit(null);
      }
    }, TICK_MS);
  }

  private clearAnswerCountdown(): void {
    if (this.answerInterval !== null) {
      clearInterval(this.answerInterval);
      this.answerInterval = null;
    }
  }
}
