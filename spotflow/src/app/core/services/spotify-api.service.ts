import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SpotifyAuthService } from './spotify-auth.service';
import { SpotifyPlaylistSummary, SpotifyTrack, SpotifyUserProfile } from '../models/spotify.models';

const API_BASE = 'https://api.spotify.com/v1';

type SpotifyImage = { url: string };

type MeResponse = {
  id: string;
  display_name: string | null;
  product: string;
  images: SpotifyImage[];
};

type PlaylistsResponse = {
  items: Array<{
    id: string;
    name: string;
    images: SpotifyImage[] | null;
    // `items.total` is the current field; `tracks.total` is deprecated (Feb
    // 2026 migration) and no longer reliably populated, but kept as a
    // fallback in case an older account/response still carries it.
    items: { total: number } | null;
    tracks: { total: number } | null;
    owner: { id: string } | null;
    collaborative: boolean;
  } | null>;
};

type PlaylistItemEntry = {
  id: string;
  uri: string;
  name: string;
  type: string;
  duration_ms: number;
  is_local: boolean;
  artists: Array<{ name: string }> | null;
  album: { images: SpotifyImage[] | null } | null;
};

type PlaylistItemsResponse = {
  items: Array<{
    is_local: boolean;
    // `item` is the current field (Spotify API, Feb 2026 migration from the
    // deprecated /playlists/{id}/tracks endpoint, which nested it as `track`).
    item: PlaylistItemEntry | null;
    track: PlaylistItemEntry | null;
  } | null>;
  next: string | null;
};

/** Thin wrapper over the Spotify Web API endpoints this game needs. */
@Injectable({ providedIn: 'root' })
export class SpotifyApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(SpotifyAuthService);

  async getMyProfile(): Promise<SpotifyUserProfile> {
    const data = await this.get<MeResponse>('/me');
    return {
      id: data.id,
      displayName: data.display_name ?? 'Spotify user',
      avatarUrl: data.images?.at(0)?.url ?? null,
      product: (data.product as SpotifyUserProfile['product']) ?? 'free',
    };
  }

  /**
   * @param currentUserId Used to filter the picker down to playlists whose
   * tracks are actually readable: since Spotify's February 2026 migration,
   * GET /playlists/{id}/items only works for playlists the caller owns or
   * collaborates on (everything else, including Spotify's own algorithmic
   * playlists and playlists merely followed from other users, 403s).
   */
  async getMyPlaylists(currentUserId: string): Promise<SpotifyPlaylistSummary[]> {
    const data = await this.get<PlaylistsResponse>('/me/playlists?limit=50');
    return data.items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.owner?.id === currentUserId || item.collaborative)
      .map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.images?.at(0)?.url ?? null,
        trackCount: item.items?.total ?? item.tracks?.total ?? 0,
      }))
      .filter((playlist) => playlist.trackCount > 0);
  }

  /** Fetches every playable, non-local track in a playlist across pages. */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = [];
    // GET .../items replaced the deprecated GET .../tracks in Spotify's
    // February 2026 Web API migration (the old endpoint now returns 403);
    // its page size cap also dropped from 100 to 50.
    let path: string | null = `/playlists/${playlistId}/items?limit=50`;

    while (path) {
      const data: PlaylistItemsResponse = await this.get<PlaylistItemsResponse>(path);
      for (const entry of data.items) {
        const track = entry?.item ?? entry?.track ?? null;
        const isLocal = entry?.is_local ?? track?.is_local ?? false;

        if (!track || isLocal || !track.uri || track.type !== 'track') {
          continue;
        }

        tracks.push({
          id: track.id,
          uri: track.uri,
          name: track.name,
          artists: (track.artists ?? []).map((artist) => artist.name),
          albumImageUrl: track.album?.images?.at(0)?.url ?? null,
          durationMs: track.duration_ms,
          isLocal,
        });
      }
      path = data.next ? data.next.replace(API_BASE, '') : null;
    }

    return tracks;
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.auth.getValidAccessToken();
    return firstValueFrom(
      this.http.get<T>(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  }
}
