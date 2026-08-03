import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { randomString, sha256Base64Url } from './pkce';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
];

const VERIFIER_KEY = 'spotflow.pkce.verifier';
const STATE_KEY = 'spotflow.pkce.state';
const SESSION_KEY = 'spotflow.session';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

/**
 * Authorization Code + PKCE against the Spotify Accounts service.
 * No client secret ever exists in this codebase (charter principle I): the
 * code_verifier is the only proof of possession, generated per attempt and
 * discarded once exchanged.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly session = signal<StoredSession | null>(this.readStoredSession());

  readonly isAuthenticated = computed(() => this.session() !== null);

  async beginLogin(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    const verifier = randomString(64);
    const state = randomString(16);
    const challenge = await sha256Base64Url(verifier);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: environment.spotifyClientId,
      response_type: 'code',
      redirect_uri: environment.spotifyRedirectUri,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    });

    window.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Completes the flow after Spotify redirects back to /callback.
   * Throws when the state does not match (CSRF) or the exchange fails.
   */
  async completeLogin(code: string, state: string): Promise<void> {
    const expectedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);

    if (!verifier || !expectedState || expectedState !== state) {
      throw new Error('Invalid OAuth state. Please try connecting again.');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: environment.spotifyRedirectUri,
      client_id: environment.spotifyClientId,
      code_verifier: verifier,
    });

    await this.exchangeToken(body);
  }

  async logout(): Promise<void> {
    this.session.set(null);
    if (this.isBrowser) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  /** Returns a currently valid access token, refreshing it first if needed. */
  async getValidAccessToken(): Promise<string> {
    const current = this.session();
    if (!current) {
      throw new Error('Not authenticated.');
    }

    const expiresSoon = current.expiresAt - Date.now() < 60_000;
    if (!expiresSoon) {
      return current.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken,
      client_id: environment.spotifyClientId,
    });

    await this.exchangeToken(body, current.refreshToken);
    return this.session()!.accessToken;
  }

  private async exchangeToken(body: URLSearchParams, fallbackRefreshToken?: string): Promise<void> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error('Spotify token exchange failed.');
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };

    // Diagnostic: Spotify echoes back the scopes actually granted to this
    // token, which can be a subset of what was requested (a stale consent
    // from an earlier, narrower authorization). Compare this list against
    // SCOPES above if API calls keep failing with 403.
    console.log('[SpotifyAuth] granted scopes:', data.scope ?? '(not returned)');

    const next: StoredSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? fallbackRefreshToken ?? '',
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    this.session.set(next);
    if (this.isBrowser) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    }
  }

  private readStoredSession(): StoredSession | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
