import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SpotifyAuthService } from './spotify-auth.service';
import { AudioSettingsService } from './audio-settings.service';
import { SpotifyTrack } from '../models/spotify.models';

const SDK_SCRIPT_URL = 'https://sdk.scdn.co/spotify-player.js';
const API_PLAYER_BASE = 'https://api.spotify.com/v1/me/player';

type SpotifyWebPlaybackState = { device_id: string };

type SpotifyPlayerInstance = {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (payload: SpotifyWebPlaybackState) => void): void;
  setVolume(volume: number): Promise<void>;
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps the Spotify Web Playback SDK: loads the script once, brings up a
 * "Spotflow" Connect device, and plays a random 5-second clip of a track.
 * Requires a Premium account (enforced upstream by premiumGuard); Spotify
 * itself also rejects playback for a non-Premium token as defense in depth.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyPlaybackService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(SpotifyAuthService);
  private readonly settings = inject(AudioSettingsService);

  private player: SpotifyPlayerInstance | null = null;
  private deviceId: string | null = null;
  private sdkLoadPromise: Promise<void> | null = null;

  // Guards against two clips overlapping: if a new playClip() starts while
  // an earlier one is still mid-flight (e.g. the player answered correctly
  // and moved to the next round before the first clip's 5s were up), the
  // earlier call's delayed /pause would otherwise fire late and cut off the
  // *new* track instead of the one it was meant for. Only the call holding
  // the current token is allowed to schedule or run its own pause.
  private playToken = 0;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isReady = signal(false);

  constructor() {
    effect(() => {
      const volume = this.settings.gameVolume();
      void this.player?.setVolume(volume);
    });
  }

  async ensureReady(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isReady()) {
      return;
    }

    await this.loadSdkScript();
    await this.createPlayer();
  }

  async playClip(track: SpotifyTrack, clipMs = 5000, onStarted?: () => void): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Playback device is not ready yet.');
    }

    const token = ++this.playToken;
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    const maxStart = Math.max(track.durationMs - clipMs, 0);
    const positionMs = maxStart > 0 ? Math.floor(Math.random() * maxStart) : 0;

    // The Connect device can transiently fail its first /play right after
    // becoming "ready" (the SDK is still finishing DRM/license setup under
    // the hood), so one retry after a short pause is normal, not a real
    // failure — surfacing it to the player would just mean lost rounds.
    await this.playWithRetry(track.uri, positionMs);
    if (token !== this.playToken) {
      return; // superseded by a newer round while /play was in flight
    }
    onStarted?.();

    await new Promise<void>((resolve, reject) => {
      this.pauseTimer = setTimeout(() => {
        this.pauseTimer = null;
        if (token !== this.playToken) {
          resolve(); // a newer clip owns playback now; don't touch it
          return;
        }
        this.request('/pause', 'PUT').then(resolve, reject);
      }, clipMs);
    });
  }

  disconnect(): void {
    this.player?.disconnect();
    this.player = null;
    this.deviceId = null;
    this.isReady.set(false);
  }

  private async playWithRetry(uri: string, positionMs: number, attempt = 1): Promise<void> {
    try {
      await this.request('/play', 'PUT', { uris: [uri], position_ms: positionMs });
    } catch (error) {
      if (attempt >= 2) {
        throw error;
      }
      await delay(600);
      await this.playWithRetry(uri, positionMs, attempt + 1);
    }
  }

  private loadSdkScript(): Promise<void> {
    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    this.sdkLoadPromise = new Promise((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      const script = document.createElement('script');
      script.src = SDK_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    });

    return this.sdkLoadPromise;
  }

  private async createPlayer(): Promise<void> {
    const player = new window.Spotify!.Player({
      name: 'Spotflow',
      getOAuthToken: (callback) => {
        this.auth.getValidAccessToken().then(callback);
      },
      volume: this.settings.gameVolume(),
    });

    player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.isReady.set(true);
    });
    player.addListener('not_ready', () => {
      this.isReady.set(false);
    });

    await player.connect();
    this.player = player;
    await this.transferPlaybackHere();
  }

  private async transferPlaybackHere(): Promise<void> {
    if (!this.deviceId) {
      return;
    }
    const token = await this.auth.getValidAccessToken();
    await fetch(API_PLAYER_BASE, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [this.deviceId], play: false }),
    });
  }

  private async request(path: string, method: string, body?: unknown): Promise<void> {
    const token = await this.auth.getValidAccessToken();
    const response = await fetch(`${API_PLAYER_BASE}${path}?device_id=${this.deviceId}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Spotify player request failed: ${method} ${path} (${response.status})`);
    }
  }
}
