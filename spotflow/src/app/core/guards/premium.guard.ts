import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';
import { describeSpotifyAuthError } from '../services/spotify-error.util';
import { ToastService } from '../../shared/ui/toast.service';

export const premiumGuard: CanActivateFn = async () => {
  const session = inject(UserSessionService);
  const toast = inject(ToastService);
  const router = inject(Router);

  try {
    const profile = await session.ensureProfileLoaded();
    if (!profile) {
      return router.parseUrl('/');
    }
    return profile.product === 'premium' ? true : router.parseUrl('/premium-required');
  } catch (error) {
    console.error('Failed to load profile', error);
    toast.error(describeSpotifyAuthError(error));
    await session.logout();
    return router.parseUrl('/');
  }
};
