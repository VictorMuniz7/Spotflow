import { Injectable, computed, inject, signal } from '@angular/core';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyAuthService } from './spotify-auth.service';
import { SpotifyUserProfile } from '../models/spotify.models';

/**
 * Holds the logged-in Spotify profile for the session. Kept separate from
 * SpotifyAuthService (tokens only) and GameStateService (game only).
 */
@Injectable({ providedIn: 'root' })
export class UserSessionService {
  private readonly auth = inject(SpotifyAuthService);
  private readonly api = inject(SpotifyApiService);

  private readonly profileState = signal<SpotifyUserProfile | null>(null);
  private loadPromise: Promise<SpotifyUserProfile | null> | null = null;

  readonly profile = this.profileState.asReadonly();
  readonly isPremium = computed(() => this.profileState()?.product === 'premium');

  /** Fetches the profile once per session; safe to call from multiple guards. */
  async ensureProfileLoaded(): Promise<SpotifyUserProfile | null> {
    if (!this.auth.isAuthenticated()) {
      return null;
    }
    if (this.profileState()) {
      return this.profileState();
    }
    if (!this.loadPromise) {
      this.loadPromise = this.api.getMyProfile().then((profile) => {
        this.profileState.set(profile);
        return profile;
      });
    }
    return this.loadPromise;
  }

  async logout(): Promise<void> {
    this.profileState.set(null);
    this.loadPromise = null;
    await this.auth.logout();
  }
}
