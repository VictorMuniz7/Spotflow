import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';

export const premiumGuard: CanActivateFn = async () => {
  const session = inject(UserSessionService);
  const router = inject(Router);

  const profile = await session.ensureProfileLoaded();
  if (!profile) {
    return router.parseUrl('/');
  }

  return profile.product === 'premium' ? true : router.parseUrl('/premium-required');
};
