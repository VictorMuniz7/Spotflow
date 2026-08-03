import { Injectable, computed, inject, signal } from '@angular/core';
import { ScoringService } from './scoring.service';
import { GameSummary, RoundOutcome } from '../../core/models/game.models';
import { SpotifyPlaylistSummary, SpotifyTrack } from '../../core/models/spotify.models';

export const MINIMUM_TRACKS_REQUIRED = 10;

/**
 * Owns one game session: the chosen playlist, the no-repeat track pool, the
 * round-by-round state machine, and the running score. Pure UI state; the
 * scoring math itself lives in ScoringService.
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly scoring = inject(ScoringService);

  private readonly playlistState = signal<SpotifyPlaylistSummary | null>(null);
  private readonly poolState = signal<SpotifyTrack[]>([]);
  private readonly usedTrackIds = new Set<string>();
  private readonly totalRoundsState = signal(0);
  private readonly currentRoundNumberState = signal(0);
  private readonly currentTrackState = signal<SpotifyTrack | null>(null);
  private readonly outcomesState = signal<RoundOutcome[]>([]);
  private roundStartedAt = 0;

  readonly selectedPlaylist = this.playlistState.asReadonly();
  readonly totalRounds = this.totalRoundsState.asReadonly();
  readonly currentRoundNumber = this.currentRoundNumberState.asReadonly();
  readonly currentTrack = this.currentTrackState.asReadonly();
  readonly outcomes = this.outcomesState.asReadonly();
  readonly candidateTracks = computed(() => this.poolState());

  readonly isComplete = computed(
    () => this.totalRoundsState() > 0 && this.outcomesState().length >= this.totalRoundsState(),
  );
  readonly totalScore = computed(() =>
    this.outcomesState().reduce((sum, outcome) => sum + outcome.points, 0),
  );

  /** @param totalRounds Configurable per PRD 5 ("valor configurável, não fixo no código"). */
  startSession(playlist: SpotifyPlaylistSummary, tracks: SpotifyTrack[], totalRounds = 10): void {
    this.playlistState.set(playlist);
    this.poolState.set(tracks);
    this.usedTrackIds.clear();
    this.totalRoundsState.set(Math.min(totalRounds, tracks.length));
    this.currentRoundNumberState.set(0);
    this.outcomesState.set([]);
    this.currentTrackState.set(null);
  }

  /** Picks a random not-yet-used track and advances the round counter. */
  startNextRound(): SpotifyTrack {
    const remaining = this.poolState().filter((track) => !this.usedTrackIds.has(track.id));
    if (remaining.length === 0) {
      throw new Error('No more tracks available for a new round.');
    }

    const track = remaining[Math.floor(Math.random() * remaining.length)];
    this.usedTrackIds.add(track.id);
    this.currentTrackState.set(track);
    this.currentRoundNumberState.update((round) => round + 1);
    this.roundStartedAt = Date.now();

    return track;
  }

  /** Call when the 5s clip actually starts, so response time excludes load latency. */
  markPlaybackStarted(): void {
    this.roundStartedAt = Date.now();
  }

  /** @param guessedTrackId The id of the suggestion the player picked, or null if none. */
  submitGuess(guessedTrackId: string | null): RoundOutcome {
    const track = this.currentTrackState();
    if (!track) {
      throw new Error('No active round to submit a guess for.');
    }

    const responseTimeMs = Date.now() - this.roundStartedAt;
    const correct = guessedTrackId !== null && guessedTrackId === track.id;
    const points = this.scoring.computeScore(correct, responseTimeMs);

    const outcome: RoundOutcome = { track, guess: guessedTrackId, correct, responseTimeMs, points };
    this.outcomesState.update((outcomes) => [...outcomes, outcome]);

    return outcome;
  }

  buildSummary(): GameSummary {
    const rounds = this.outcomesState();
    const totalScore = rounds.reduce((sum, round) => sum + round.points, 0);
    const correctCount = rounds.filter((round) => round.correct).length;

    return {
      totalScore,
      averageScore: rounds.length > 0 ? Math.round(totalScore / rounds.length) : 0,
      correctCount,
      incorrectCount: rounds.length - correctCount,
      rounds,
    };
  }

  reset(): void {
    this.playlistState.set(null);
    this.poolState.set([]);
    this.usedTrackIds.clear();
    this.totalRoundsState.set(0);
    this.currentRoundNumberState.set(0);
    this.outcomesState.set([]);
    this.currentTrackState.set(null);
  }
}
