import { HttpErrorResponse } from '@angular/common/http';

/**
 * A Spotify app still in Development Mode only works for its owner plus the
 * accounts explicitly added under Settings > User Management (capped at 5
 * users since Spotify's February 2026 policy change) — anyone else gets a
 * 403 the moment the app requests anything beyond the login itself. This is
 * a Spotify-side account restriction, not a bug in the app, so it gets a
 * distinct, actionable message instead of a generic "login failed" one.
 *
 * The 403 can surface either as an HttpErrorResponse (the /me profile call,
 * made through Angular's HttpClient) or as a plain Error with a `status`
 * property (the token exchange, made through a raw fetch) — both are
 * checked the same way.
 */
export const describeSpotifyAuthError = (error: unknown): string => {
  const status =
    error instanceof HttpErrorResponse ? error.status : (error as { status?: unknown } | null)?.status;

  if (status === 403) {
    return 'O Spotify bloqueou o acesso desta conta: este app ainda está em modo de desenvolvimento e só funciona para contas liberadas pelo desenvolvedor (Settings > User Management, no painel do Spotify). Peça para ele adicionar seu e-mail lá.';
  }
  return 'Não foi possível concluir o login com o Spotify. Tente novamente.';
};
