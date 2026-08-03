import { TestBed } from '@angular/core/testing';
import { GameStateService } from './game-state.service';
import { ScoringService } from './scoring.service';
import { SpotifyPlaylistSummary, SpotifyTrack } from '../../core/models/spotify.models';

const makePlaylist = (): SpotifyPlaylistSummary => ({
  id: 'playlist-1',
  name: 'Test Playlist',
  imageUrl: null,
  trackCount: 12,
});

const makeTracks = (count: number): SpotifyTrack[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `track-${index}`,
    uri: `spotify:track:${index}`,
    name: `Track ${index}`,
    artists: ['Artist'],
    albumImageUrl: null,
    durationMs: 200_000,
    isLocal: false,
  }));

describe('GameStateService', () => {
  let game: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameStateService, ScoringService] });
    game = TestBed.inject(GameStateService);
  });

  it('caps totalRounds at the number of available tracks', () => {
    game.startSession(makePlaylist(), makeTracks(5), 10);
    expect(game.totalRounds()).toBe(5);
  });

  it('never repeats a track across a full session', () => {
    const tracks = makeTracks(20);
    game.startSession(makePlaylist(), tracks, 10);

    const seenTrackIds = new Set<string>();
    for (let round = 0; round < 10; round++) {
      const track = game.startNextRound();
      expect(seenTrackIds.has(track.id)).toBe(false);
      seenTrackIds.add(track.id);
      game.submitGuess(track.id);
    }

    expect(seenTrackIds.size).toBe(10);
  });

  it('marks a correct guess and awards points, and an incorrect guess as zero points', () => {
    game.startSession(makePlaylist(), makeTracks(10), 2);

    const first = game.startNextRound();
    const correctOutcome = game.submitGuess(first.id);
    expect(correctOutcome.correct).toBe(true);
    expect(correctOutcome.points).toBeGreaterThan(0);

    const second = game.startNextRound();
    const wrongOutcome = game.submitGuess('not-the-right-track');
    expect(wrongOutcome.correct).toBe(false);
    expect(wrongOutcome.points).toBe(0);
    expect(second.id).not.toBe(first.id);
  });

  it('is only complete once every round has an outcome', () => {
    game.startSession(makePlaylist(), makeTracks(10), 2);

    const first = game.startNextRound();
    game.submitGuess(first.id);
    expect(game.isComplete()).toBe(false);

    const second = game.startNextRound();
    game.submitGuess(second.id);
    expect(game.isComplete()).toBe(true);
  });

  it('builds a summary that aggregates score and accuracy', () => {
    game.startSession(makePlaylist(), makeTracks(10), 2);

    const first = game.startNextRound();
    game.submitGuess(first.id);
    const second = game.startNextRound();
    game.submitGuess('wrong-guess');

    const summary = game.buildSummary();
    expect(summary.rounds.length).toBe(2);
    expect(summary.correctCount).toBe(1);
    expect(summary.incorrectCount).toBe(1);
    expect(summary.totalScore).toBeGreaterThan(0);
    expect(summary.averageScore).toBe(Math.round(summary.totalScore / 2));
  });
});
