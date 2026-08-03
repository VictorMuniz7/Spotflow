import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { GlitchTitle } from '../../shared/ui/glitch-title';

@Component({
  selector: 'app-premium-required-page',
  imports: [GlitchTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <app-glitch-title text="Premium necessário" [fontSizeRem]="2.25" />
      <p class="max-w-sm text-ink/70">
        O Spotflow usa o Web Playback SDK do Spotify para tocar os trechos das músicas, o que
        exige uma conta <strong>Spotify Premium</strong>. Entre com uma conta Premium para jogar.
      </p>
      <button
        type="button"
        class="min-h-11 min-w-40 cursor-pointer rounded-full border border-ink/20 px-6 py-3 font-medium text-ink transition-colors duration-150 hover:bg-ink/5"
        (click)="signOutAndRetry()"
      >
        Usar outra conta
      </button>
    </main>
  `,
})
export class PremiumRequiredPage {
  private readonly session = inject(UserSessionService);
  private readonly router = inject(Router);

  protected async signOutAndRetry(): Promise<void> {
    await this.session.logout();
    void this.router.navigateByUrl('/');
  }
}
