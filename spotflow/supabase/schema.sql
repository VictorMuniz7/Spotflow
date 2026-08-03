-- Spotflow global leaderboard.
-- Run this once in the Supabase project's SQL editor (Dashboard > SQL Editor).
--
-- Security model (charter principle IV, .lagune/memory/charter.md): this is a
-- pure client-side game with no dedicated backend, so the score submitted at
-- the end of a session is untrusted input from the player's own browser. The
-- CHECK constraints below are a structural bound, not a reconstruction of the
-- real result: they reject any impossible score, but they cannot verify a
-- plausible score actually came from real gameplay. That residual risk is
-- accepted for this phase (see the charter for the reasoning) and would need
-- a server-side recompute to fully close.

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  spotify_user_id text not null,
  display_name text not null,
  avatar_url text,
  total_score integer not null,
  rounds_played integer not null,
  created_at timestamptz not null default now(),

  constraint rounds_played_bounds check (rounds_played > 0 and rounds_played <= 50),
  constraint total_score_bounds check (
    total_score >= 0 and total_score <= rounds_played * 1000
  )
);

alter table leaderboard_entries enable row level security;

-- Charter principle V: the leaderboard is public by design (name, avatar,
-- score), so reading every row is intentional. Never add other Spotify
-- profile fields (email, private playlists) to this table.
create policy "Anyone can read the leaderboard"
  on leaderboard_entries for select
  using (true);

create policy "Anyone can submit a score"
  on leaderboard_entries for insert
  with check (true);

create index if not exists leaderboard_entries_score_idx
  on leaderboard_entries (total_score desc);
