import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../../features/game/game-state.service';

export const playlistSelectedGuard: CanActivateFn = () => {
  const game = inject(GameStateService);
  const router = inject(Router);

  return game.selectedPlaylist() !== null ? true : router.parseUrl('/playlists');
};
