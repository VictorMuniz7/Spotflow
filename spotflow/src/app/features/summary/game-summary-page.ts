import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../game/game-state.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { ToastService } from '../../shared/ui/toast.service';
import { GlitchTitle } from '../../shared/ui/glitch-title';
import { Leaderboard } from './leaderboard';
import { GameSummary } from '../../core/models/game.models';
import { LeaderboardEntry } from '../../core/models/leaderboard.models';

@Component({
  selector: 'app-game-summary-page',
  imports: [GlitchTitle, Leaderboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-8 px-6 py-10 text-center">
      <app-glitch-title text="Fim de jogo" [fontSizeRem]="2.5" />

      @if (summary(); as summary) {
        <div class="grid w-full grid-cols-3 gap-3 tabular-nums">
          <div class="rounded-2xl bg-paper-dim p-3">
            <p class="text-xs text-ink/60">Total</p>
            <p class="text-xl font-semibold">{{ summary.totalScore }}</p>
          </div>
          <div class="rounded-2xl bg-paper-dim p-3">
            <p class="text-xs text-ink/60">Média</p>
            <p class="text-xl font-semibold">{{ summary.averageScore }}</p>
          </div>
          <div class="rounded-2xl bg-paper-dim p-3">
            <p class="text-xs text-ink/60">Acertos</p>
            <p class="text-xl font-semibold">{{ summary.correctCount }}/{{ summary.rounds.length }}</p>
          </div>
        </div>
      }

      <div class="flex w-full flex-col gap-3">
        <h2 class="font-sketch text-xl">Placar global</h2>
        @if (loadingLeaderboard()) {
          <p class="text-sm text-ink/60">Carregando…</p>
        } @else {
          <app-leaderboard [entries]="leaderboardEntries()" [currentUserId]="currentUserId()" />
        }
      </div>

      <button
        type="button"
        class="min-h-11 min-w-48 cursor-pointer rounded-full bg-ink px-6 py-3 font-medium text-paper transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
        (click)="playAgain()"
      >
        Jogar novamente
      </button>
    </main>
  `,
})
export class GameSummaryPage {
  private readonly game = inject(GameStateService);
  private readonly session = inject(UserSessionService);
  private readonly leaderboard = inject(LeaderboardService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly summary = signal<GameSummary | null>(null);
  protected readonly leaderboardEntries = signal<LeaderboardEntry[]>([]);
  protected readonly loadingLeaderboard = signal(true);
  protected readonly currentUserId = signal<string | null>(null);

  constructor() {
    const summary = this.game.buildSummary();
    this.summary.set(summary);
    void this.submitAndLoad(summary);
  }

  private async submitAndLoad(summary: GameSummary): Promise<void> {
    const profile = this.session.profile();
    this.currentUserId.set(profile?.id ?? null);

    if (profile) {
      try {
        await this.leaderboard.submitScore({
          spotifyUserId: profile.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          totalScore: summary.totalScore,
          roundsPlayed: summary.rounds.length,
        });
        this.toast.success('Pontuação enviada ao placar global!');
      } catch {
        this.toast.error('Não foi possível enviar sua pontuação ao placar global.');
      }
    }

    try {
      this.leaderboardEntries.set(await this.leaderboard.getTopEntries());
    } catch {
      this.toast.error('Não foi possível carregar o placar global.');
    } finally {
      this.loadingLeaderboard.set(false);
    }
  }

  protected playAgain(): void {
    this.game.reset();
    void this.router.navigateByUrl('/playlists');
  }
}
