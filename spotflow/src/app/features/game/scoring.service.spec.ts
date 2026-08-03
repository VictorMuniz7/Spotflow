import { ScoringService, DEFAULT_SCORING_CONFIG } from './scoring.service';

describe('ScoringService', () => {
  let scoring: ScoringService;

  beforeEach(() => {
    scoring = new ScoringService();
  });

  it('awards 0 points for a wrong guess regardless of response time', () => {
    expect(scoring.computeScore(false, 0)).toBe(0);
    expect(scoring.computeScore(false, 10_000)).toBe(0);
  });

  it('awards the maximum points for an instant correct guess', () => {
    expect(scoring.computeScore(true, 0)).toBe(DEFAULT_SCORING_CONFIG.maxPoints);
  });

  it('awards the minimum points at the edge of the response window', () => {
    expect(scoring.computeScore(true, DEFAULT_SCORING_CONFIG.responseWindowMs)).toBe(
      DEFAULT_SCORING_CONFIG.minPoints,
    );
  });

  it('clamps a response slower than the window to the minimum points', () => {
    const overWindow = scoring.computeScore(true, DEFAULT_SCORING_CONFIG.responseWindowMs + 5000);
    expect(overWindow).toBe(DEFAULT_SCORING_CONFIG.minPoints);
  });

  it('decays linearly between max and min points', () => {
    const halfway = scoring.computeScore(true, DEFAULT_SCORING_CONFIG.responseWindowMs / 2);
    const expected = Math.round(
      (DEFAULT_SCORING_CONFIG.maxPoints + DEFAULT_SCORING_CONFIG.minPoints) / 2,
    );
    expect(halfway).toBe(expected);
  });

  it('respects a custom scoring config', () => {
    const custom = scoring.computeScore(true, 0, { maxPoints: 500, minPoints: 50, responseWindowMs: 10_000 });
    expect(custom).toBe(500);
  });
});
