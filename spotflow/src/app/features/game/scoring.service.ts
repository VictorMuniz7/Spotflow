import { Injectable } from '@angular/core';

export type ScoringConfig = {
  maxPoints: number;
  minPoints: number;
  responseWindowMs: number;
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  maxPoints: 1000,
  minPoints: 100,
  responseWindowMs: 15_000,
};

/**
 * Isolated so the scoring formula can be tuned without touching game flow
 * (PRD 4: "esse cálculo deve ficar isolado em um service dedicado").
 */
@Injectable({ providedIn: 'root' })
export class ScoringService {
  computeScore(
    correct: boolean,
    responseTimeMs: number,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  ): number {
    if (!correct) {
      return 0;
    }

    const { maxPoints, minPoints, responseWindowMs } = config;
    const clampedTime = Math.min(Math.max(responseTimeMs, 0), responseWindowMs);
    const decay = (maxPoints - minPoints) * (clampedTime / responseWindowMs);

    return Math.round(maxPoints - decay);
  }
}
