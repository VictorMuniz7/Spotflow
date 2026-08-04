import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { describeSpotifyAuthError } from '../../core/services/spotify-error.util';
import { ToastService } from '../../shared/ui/toast.service';
import { LoadingSpinner } from '../../shared/ui/loading-spinner';

@Component({
  selector: 'app-callback-page',
  imports: [LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-4">
      <app-loading-spinner [sizePx]="28" />
      <p class="text-ink/70">Conectando à sua conta Spotify…</p>
    </main>
  `,
})
export class CallbackPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(SpotifyAuthService);
  private readonly session = inject(UserSessionService);
  private readonly toast = inject(ToastService);

  constructor() {
    void this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error || !code || !state) {
      this.toast.error('Conexão com o Spotify cancelada ou inválida.');
      void this.router.navigateByUrl('/');
      return;
    }

    try {
      await this.auth.completeLogin(code, state);
      const profile = await this.session.ensureProfileLoaded();
      void this.router.navigateByUrl(profile?.product === 'premium' ? '/playlists' : '/premium-required');
    } catch (error) {
      console.error('Failed to complete login', error);
      this.toast.error(describeSpotifyAuthError(error));
      await this.session.logout();
      void this.router.navigateByUrl('/');
    }
  }
}
