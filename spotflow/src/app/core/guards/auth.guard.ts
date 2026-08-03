import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SpotifyAuthService } from '../services/spotify-auth.service';

/**
 * UX gate only, not a security boundary: Spotify's own API rejects any call
 * made without a valid token regardless of this guard (charter principle IV
 * on the angular sub-skill — never trust a client-side gate as authorization).
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(SpotifyAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/');
};
