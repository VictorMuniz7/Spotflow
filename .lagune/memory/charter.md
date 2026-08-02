# Spotflow Security Charter

## Principles

### I. Spotify login uses PKCE only, tokens stay off durable, script-readable storage where avoidable

Always authenticate with Spotify via Authorization Code + PKCE, the SPA-safe flow that needs no client secret. Never embed, log, or transmit a Spotify client secret from the frontend. Access and refresh tokens MUST be cleared on logout and MUST NOT outlive the session longer than the feature requires; prefer the storage option least exposed to script execution (in-memory over `sessionStorage` over `localStorage`), and document the tradeoff wherever a more exposed option is chosen.

- Why: Spotify tokens are the keys to a real person's account (their playlists, playback control, profile data). A client secret shipped to the browser is public the moment the bundle loads, and a token sitting in `localStorage` longer than needed is fully readable by any script that ever runs on the page, including one smuggled in through an unrelated bug.

### II. OAuth scopes are requested at the minimum the shipped features need

Always request only the Spotify scopes the current feature set actually uses (`playlist-read-private`, `playlist-read-collaborative`, `streaming`, `user-read-email`, `user-read-private`, `user-modify-playback-state`), and re-evaluate the scope list whenever a feature is added, removed, or changed.

- Why: every granted scope becomes something an attacker gets for free the moment a token leaks. A game that only needs to read playlists and play 5-second clips has no reason to hold a scope that can, say, modify the user's library, so an unused scope is pure added blast radius with no feature behind it.

### III. Content rendered from the Spotify API or any external source never bypasses Angular's sanitizer without a documented reason

Never call `bypassSecurityTrustHtml`/`bypassSecurityTrustStyle`/`bypassSecurityTrustScript`/`bypassSecurityTrustUrl`/`bypassSecurityTrustResourceUrl`, and never write through a raw `ElementRef.nativeElement` or `Renderer2.setProperty` DOM write, on a value that came from the Spotify API (track names, artist names, playlist names or covers, the user's display name) or any other outside source, without a documented, reviewed justification for why the bypass is safe in that specific case. See `@.lagune/skills/angular.md` for the concrete sink shapes and safer alternatives.

- Why: track, artist, and playlist metadata is attacker-influenceable, anyone can name a public Spotify playlist or track with a payload, and Angular's default sanitization is the only thing standing between that data and script execution inside a logged-in player's session. This rule is already stated as a house convention in `CLAUDE.md`; the charter makes it a non-negotiable, project-wide principle rather than a style note.

### IV. A player's own client cannot be trusted to grade or report its own game result

The scoring calculation is isolated in its own service by design, but that service still runs entirely in the player's browser, fully readable and editable by that same player. Always treat the score, round outcomes, and response timing a session submits to the global leaderboard as untrusted input: bound it against what the game's own rules make possible (round count, minimum response time, maximum per-round score) before it is written anywhere other players or the leaderboard can see, whatever storage the leaderboard ends up using.

- Why: the leaderboard is public and tied to the player's real Spotify identity, which makes it a direct, low-effort target: without a check, any player can rewrite their own score in the browser before submission and claim a false rank under their own name, which breaks the game for everyone else and cannot be fixed after the fact once it's on a shared, visible ranking.

### V. The leaderboard and any player-facing profile data expose only what the game needs, nothing the OAuth scopes merely make available

Always limit what appears on the leaderboard and anywhere else in the UI to the player's Spotify display name, avatar, and score. Never surface other profile data the granted scopes happen to expose (email, account type, private playlist contents) beyond the single, documented use each scope was requested for (for example, checking `product == "premium"` at login).

- Why: `user-read-email` and `user-read-private` grant the app more of a real person's data than a leaderboard needs to show. Access to data is not the same as permission to display it, and a public ranking is the easiest place for an unused field to leak by accident.

### VI. The dev server and the build stay closed to untrusted networks and never carry a secret into the client bundle

Always keep the Vite/esbuild dev server bound to `localhost`; never set `server.host` to `true`/`0.0.0.0` on a network that isn't fully trusted. Never place a secret in a `VITE_`-prefixed environment variable or a `define` entry in the Vite/Angular build config, since anything there ships in the static bundle every visitor downloads.

- Why: an exposed dev server with no auth in front of it is reachable by anything on the same network, or by a hostile page open in another tab via DNS rebinding, and a secret baked into the client bundle at build time is invisible in any runtime log, so it is easy to miss until it's already public.

### VII. Server-rendered state handed to the client for hydration is safely serialized

The project runs Angular Universal (SSR via `@angular/ssr` and an Express server). Always use Angular's built-in `TransferState` mechanism to pass server-rendered data to the browser. Never hand-roll an inline-script state embed (a template string writing `JSON.stringify(...)` straight into a `<script>` body) for this purpose.

- Why: a hand-rolled embed is not protected the way `TransferState` is: an untrusted string round-tripping through server state (a track or playlist name, again) can close the `<script>` tag early and inject markup or script, turning ordinary server-rendered content into stored script execution on every page load.

## Baseline discipline

Lagune holds this charter, every principle, every time. A principle is not suspended because a control looks small, familiar, or unlikely to be hit. This is not a judgement call.

### Only the controls the project needs

Lagune recommends and applies only the controls this project's context calls for. A control the project does not need is never added for completeness, and a generic checklist is not thoroughness. Every later phase acts on what the system actually does, never on what it might hypothetically do.

- Why: effort spent on risks the project does not have buries the risks it does have. Fewer, right-sized controls are easier to apply, prove, and keep true than a checklist no one finishes.

### Prefer the simplest vetted control

When a control is needed, reach for the safest option already proven, in order: a control this project already has, then a platform or framework built-in, then a well-maintained vetted library, and only then custom code. Never hand-roll a security primitive (cryptography, escaping, authentication, sessions) that a vetted standard already provides. A new dependency is new attack surface, justified and not assumed. Code, an endpoint, or a feature the project does not use is attack surface too, so removing it is itself a control.

- Why: hand-rolled security is where subtle, unaudited bugs live, and a second control duplicating an existing one is the one that gets forgotten and drifts. Boring, standard controls are easier to audit and harder to get wrong, and less surface is less to defend.

### When a control seems skippable

A control is held even when a reason to skip it feels reasonable:

- "Too small to need a control": small gaps are where breaches start.
- "Already handled elsewhere": assumed coverage is exactly how gaps hide.
- "Unlikely to be hit": attackers target the path no one is watching.
- "It works, ship it": working and safe are different claims, and the charter requires both.

## Governance

This charter supersedes ad hoc security decisions made in code review or in the moment. Any change to a principle (adding, removing, or materially rewriting one) is a deliberate edit to this file via `/lagune.charter`, not an informal call made while writing a feature. Later phases (`/lagune.detect`, `/lagune.plan`, `/lagune.harden`, `/lagune.verify`) read this charter as the standing rule set; when the project's scope changes (a new data source, a real backend replacing the undecided leaderboard storage, a new OAuth scope), re-run `/lagune.charter` to reconcile it before those phases act on stale principles.

Version: 1.0.0 | Ratified: 2026-08-02
