import { SpotifyTrack } from './spotify.models';

export type RoundOutcome = {
  track: SpotifyTrack;
  guess: string | null;
  correct: boolean;
  responseTimeMs: number | null;
  points: number;
};

export type GameSummary = {
  totalScore: number;
  averageScore: number;
  correctCount: number;
  incorrectCount: number;
  rounds: RoundOutcome[];
};
