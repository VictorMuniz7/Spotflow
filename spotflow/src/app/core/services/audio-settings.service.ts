import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const GAME_VOLUME_KEY = 'spotflow.volume.game';
const DEFAULT_GAME_VOLUME = 0.8;

/**
 * Persisted (localStorage — a volume preference, not session-sensitive data)
 * user-facing volume for the Spotify Web Playback SDK clips during rounds.
 */
@Injectable({ providedIn: 'root' })
export class AudioSettingsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly gameVolume = signal(this.readStored(GAME_VOLUME_KEY, DEFAULT_GAME_VOLUME));

  setGameVolume(volume: number): void {
    const clamped = this.clamp(volume);
    this.gameVolume.set(clamped);
    this.store(GAME_VOLUME_KEY, clamped);
  }

  private clamp(volume: number): number {
    return Math.min(Math.max(volume, 0), 1);
  }

  private readStored(key: string, fallback: number): number {
    if (!this.isBrowser) {
      return fallback;
    }
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? this.clamp(parsed) : fallback;
  }

  private store(key: string, value: number): void {
    if (this.isBrowser) {
      localStorage.setItem(key, String(value));
    }
  }
}
