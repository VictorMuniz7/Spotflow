import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { ToastService } from '../../shared/ui/toast.service';
import { GlitchTitle } from '../../shared/ui/glitch-title';
import { HeroMark } from '../../shared/ui/hero-mark';

@Component({
  selector: 'app-splash-page',
  imports: [GlitchTitle, HeroMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <app-hero-mark [sizePx]="180" />
      <app-glitch-title text="Spotflow" [fontSizeRem]="3.5" />
      <p class="max-w-sm text-ink/70">
        Conecte sua conta Spotify Premium e tente adivinhar as músicas das suas playlists
        a partir de um trecho de 5 segundos.
      </p>
      <button
        type="button"
        class="flex min-h-11 min-w-44 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-paper shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_20px_rgba(0,0,0,0.18)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        [disabled]="connecting()"
        (click)="connect()"
      >
        @if (connecting()) {
          <span class="size-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper"></span>
        }
        Conectar com Spotify
      </button>
    </main>
  `,
})
export class SplashPage {
  private readonly auth = inject(SpotifyAuthService);
  private readonly session = inject(UserSessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly connecting = signal(false);

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.routeAfterAuth();
    }
  }

  protected async connect(): Promise<void> {
    this.connecting.set(true);
    try {
      await this.auth.beginLogin();
    } catch {
      this.connecting.set(false);
      this.toast.error('Não foi possível iniciar a conexão com o Spotify. Tente novamente.');
    }
  }

  private async routeAfterAuth(): Promise<void> {
    const profile = await this.session.ensureProfileLoaded();
    if (profile?.product === 'premium') {
      void this.router.navigateByUrl('/playlists');
    } else if (profile) {
      void this.router.navigateByUrl('/premium-required');
    }
  }
}
