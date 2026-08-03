import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { premiumGuard } from './core/guards/premium.guard';
import { playlistSelectedGuard } from './core/guards/playlist-selected.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/splash/splash-page').then((m) => m.SplashPage),
  },
  {
    path: 'callback',
    loadComponent: () => import('./features/auth-callback/callback-page').then((m) => m.CallbackPage),
  },
  {
    path: 'premium-required',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/premium-required/premium-required-page').then((m) => m.PremiumRequiredPage),
  },
  {
    path: 'playlists',
    canActivate: [authGuard, premiumGuard],
    loadComponent: () =>
      import('./features/playlist-select/playlist-select-page').then((m) => m.PlaylistSelectPage),
  },
  {
    path: 'game',
    canActivate: [authGuard, premiumGuard, playlistSelectedGuard],
    loadComponent: () => import('./features/game/game-page').then((m) => m.GamePage),
  },
  {
    path: 'summary',
    canActivate: [authGuard, premiumGuard, playlistSelectedGuard],
    loadComponent: () => import('./features/summary/game-summary-page').then((m) => m.GameSummaryPage),
  },
  { path: '**', redirectTo: '' },
];
