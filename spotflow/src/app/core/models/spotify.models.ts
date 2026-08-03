export type SpotifyProduct = 'premium' | 'free' | 'open';

export type SpotifyUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  product: SpotifyProduct;
};

export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
};

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumImageUrl: string | null;
  durationMs: number;
  isLocal: boolean;
};
