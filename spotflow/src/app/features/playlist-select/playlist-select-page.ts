import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SpotifyApiService } from '../../core/services/spotify-api.service';
import { SpotifyPlaylistSummary } from '../../core/models/spotify.models';
import { GameStateService, MINIMUM_TRACKS_REQUIRED } from '../game/game-state.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { ToastService } from '../../shared/ui/toast.service';
import { GlitchTitle } from '../../shared/ui/glitch-title';
import { PlaylistCard } from './playlist-card';

@Component({
  selector: 'app-playlist-select-page',
  imports: [GlitchTitle, PlaylistCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-6 py-10">
      <div class="flex items-center justify-between gap-4">
        <app-glitch-title text="Escolha uma playlist" [fontSizeRem]="2" />
        <button
          type="button"
          class="min-h-11 shrink-0 cursor-pointer rounded-full border border-ink/20 px-4 py-2 text-sm text-ink/70 transition-colors duration-150 hover:bg-ink/5"
          (click)="signOut()"
        >
          Sair
        </button>
      </div>

      @if (loadingPlaylists()) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          @for (slot of skeletonSlots; track slot) {
            <div class="aspect-square animate-pulse rounded-2xl bg-paper-dim"></div>
          }
        </div>
      } @else if (playlists().length === 0) {
        <p class="text-ink/70">Nenhuma playlist com músicas encontrada na sua conta.</p>
      } @else {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          @for (playlist of playlists(); track playlist.id) {
            <app-playlist-card
              [playlist]="playlist"
              [disabled]="preparing() !== null"
              (select)="choosePlaylist(playlist)"
            />
          }
        </div>
      }
    </main>
  `,
})
export class PlaylistSelectPage {
  private readonly api = inject(SpotifyApiService);
  private readonly game = inject(GameStateService);
  private readonly session = inject(UserSessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly playlists = signal<SpotifyPlaylistSummary[]>([]);
  protected readonly loadingPlaylists = signal(true);
  protected readonly preparing = signal<string | null>(null);
  protected readonly skeletonSlots = Array.from({ length: 8 }, (_, index) => index);

  constructor() {
    void this.loadPlaylists();
  }

  private async loadPlaylists(): Promise<void> {
    try {
      const profile = await this.session.ensureProfileLoaded();
      this.playlists.set(await this.api.getMyPlaylists(profile!.id));
    } catch (error) {
      console.error('Failed to load playlists', error);
      this.toast.error('Não foi possível carregar suas playlists.');
    } finally {
      this.loadingPlaylists.set(false);
    }
  }

  protected async choosePlaylist(playlist: SpotifyPlaylistSummary): Promise<void> {
    this.preparing.set(playlist.id);
    const toastId = this.toast.loading('Preparando a partida…');

    try {
      const tracks = await this.api.getPlaylistTracks(playlist.id);
      if (tracks.length < MINIMUM_TRACKS_REQUIRED) {
        this.toast.error(
          `Essa playlist precisa de pelo menos ${MINIMUM_TRACKS_REQUIRED} músicas com áudio disponível.`,
        );
        return;
      }

      this.game.startSession(playlist, tracks);
      void this.router.navigateByUrl('/game');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        console.error('Failed to load playlist tracks (403): not owner/collaborator on this playlist', error);
        this.toast.error(
          'O Spotify só libera o conteúdo de playlists das quais você é dono ou colaborador. Escolha outra playlist.',
        );
      } else {
        console.error('Failed to load playlist tracks', error);
        this.toast.error('Não foi possível carregar as músicas dessa playlist.');
      }
    } finally {
      this.toast.dismiss(toastId);
      this.preparing.set(null);
    }
  }

  protected async signOut(): Promise<void> {
    await this.session.logout();
    void this.router.navigateByUrl('/');
  }
}
