import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    // Everything past login depends on sessionStorage (charter principle I)
    // and browser-only APIs (Spotify SDK, Web Audio, Workers) that do not
    // exist during SSR, so these routes render entirely client-side.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
