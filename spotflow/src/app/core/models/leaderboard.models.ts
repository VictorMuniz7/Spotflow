export type LeaderboardEntry = {
  id: string;
  spotifyUserId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  roundsPlayed: number;
  createdAt: string;
};
