import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { LeaderboardEntry } from '../models/leaderboard.models';

type LeaderboardRow = {
  id: string;
  spotify_user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  rounds_played: number;
  created_at: string;
};

const toEntry = (row: LeaderboardRow): LeaderboardEntry => ({
  id: row.id,
  spotifyUserId: row.spotify_user_id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  totalScore: row.total_score,
  roundsPlayed: row.rounds_played,
  createdAt: row.created_at,
});

/**
 * Global leaderboard backed by Supabase (see supabase/schema.sql). The anon
 * key is meant to be public: enforcement lives in Postgres RLS policies and
 * CHECK constraints, never in secrecy of this key (charter principle VI).
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  async submitScore(entry: {
    spotifyUserId: string;
    displayName: string;
    avatarUrl: string | null;
    totalScore: number;
    roundsPlayed: number;
  }): Promise<void> {
    const { error } = await this.client.from('leaderboard_entries').insert({
      spotify_user_id: entry.spotifyUserId,
      display_name: entry.displayName,
      avatar_url: entry.avatarUrl,
      total_score: entry.totalScore,
      rounds_played: entry.roundsPlayed,
    });

    if (error) {
      throw new Error(`Failed to submit score: ${error.message}`);
    }
  }

  async getTopEntries(limit = 20): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('leaderboard_entries')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load leaderboard: ${error.message}`);
    }

    return (data as LeaderboardRow[]).map(toEntry);
  }
}
