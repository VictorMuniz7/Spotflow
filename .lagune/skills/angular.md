# Angular / Vite vulnerabilities

> - This knowledge extends your judgment. Apply what fits the project and keep reasoning beyond the list.

## Rules

- This skill audits and explains.
- By default, it never rewrites your code.

## What to look for

### `[innerHTML]` binding and `DomSanitizer` bypass

Angular sanitizes values bound through `[innerHTML]`, `[style]`, `[src]`/`[href]` (url context), and `[src]` on iframe-like elements (resourceUrl context) by default, and that default is exactly what makes the escape hatches dangerous: a team that has internalized "Angular sanitizes for me" stops looking once code calls `DomSanitizer.bypassSecurityTrustHtml`/`bypassSecurityTrustStyle`/`bypassSecurityTrustScript`/`bypassSecurityTrustUrl`/`bypassSecurityTrustResourceUrl`. Any of these fed a value that originates outside the code, an API response, a CMS field, a query parameter, user-authored content, is DOM-based XSS, identical in effect to raw `innerHTML` but easier to wave through review because "it's Angular, it's sanitized."

Safer shape: let Angular's default sanitization handle `[innerHTML]` and friends, and keep `bypassSecurityTrust*` out of the codebase wherever plain text or structured bindings can do the job. Where markup must be rendered untouched (a CMS body, a comment with formatting), sanitize with a vetted library (DOMPurify) immediately before the value reaches `bypassSecurityTrustHtml`, not earlier in the pipeline where a later edit could reintroduce raw input.

Does not close it: sanitizing once at the API boundary and trusting the value downstream. A value re-fetched, cached, or passed through another component before reaching the bypass call is untrusted again by the time it's bound; sanitize at the sink, not at the source.

### Direct DOM access bypassing Angular's renderer

`ElementRef.nativeElement` gives a component a handle straight to the real DOM node, and anything written through it (`nativeElement.innerHTML = ...`, `.setAttribute('onclick', ...)`, `.src = ...`) runs completely outside Angular's binding pipeline and its sanitizer. `Renderer2` is meant to be the safe abstraction over direct DOM access, but `renderer.setProperty(el, 'innerHTML', value)` is a raw property set that Angular does **not** sanitize either, unlike the same value going through an `[innerHTML]` template binding. Because both bypass the binding pipeline, an untrusted value reaching either one reads like "normal Angular code" but is exactly as unsafe as vanilla `innerHTML`.

Safer shape: prefer template bindings and Angular's `Renderer2` abstraction for anything other than direct DOM writes, and never assign untrusted HTML, an event-handler attribute, or a `javascript:`-scheme URL through `nativeElement` or `renderer.setProperty` on a raw DOM property. When a component must integrate a non-Angular widget, keep the same sink discipline as vanilla DOM code around that integration boundary.

### Dynamic component resolution from an untrusted key

`NgComponentOutlet` and `ViewContainerRef.createComponent` let code choose **which component class to instantiate** at runtime. When that choice is driven by a value from outside the code, a route parameter, a CMS "widget type" field, a plugin name, the app is dispatching a class by an attacker-influenced name, the same shape as calling a function by a name the user supplied: whatever component the attacker names gets constructed, rendered, and wired into the app, including any component the app exposes but never meant to reach that entry point.

Safer shape: resolve the component through an explicit, code-defined map from a validated key to a known component class, and reject any key not in the map. Never pass a request-derived string straight into `NgComponentOutlet` or a dynamic `createComponent` lookup.

### Universal hydration and transferred-state injection

An Angular Universal (SSR) app commonly serializes server-rendered state via `TransferState` for the client to rehydrate from. Using `TransferState`'s own `STATE_KEY` mechanism is safe by default (`type="application/json"`), but a custom hand-rolled equivalent, embedding server state into an inline `<script>` with a template string (`` `window.__STATE__ = ${JSON.stringify(state)}` ``), does not get the same protection: `JSON.stringify` alone does not neutralize `</script>`, `<!--`, or the Unicode line-terminator characters `U+2028`/`U+2029` inside string values, so an untrusted string embedded that way can close the script tag early and inject markup or script. A stored value (a username, a bio) becomes the payload once it round-trips through state that gets serialized back into the page.

Safer shape: use Angular's built-in `TransferState` API rather than a hand-rolled inline-script embed. Where a custom embed is unavoidable, escape HTML-sensitive sequences (`</`, `<!--`, `U+2028`, `U+2029`) before writing the JSON into a `<script>` body, or use a `<script type="application/json">` element and `JSON.parse` it on the client instead of executing it as a template literal.

### Config-driven property and attribute binding

`[ngClass]`, `[ngStyle]`, `[attr.*]`, and a component's `@Input()`s bound from a dynamically built object pass along whatever the source object contains. When that object comes from untrusted data, a CMS-driven page config, a loosely-typed API response mapped onto a component's inputs, an attacker-controlled `style` value or an input that a child component itself feeds into `[innerHTML]`/`bypassSecurityTrust*` rides along with the legitimate ones and lands on the rendered output exactly as if it had been written by hand.

Safer shape: map only the named, expected fields from untrusted config onto bindings and inputs; never forward an object sourced from outside the code wholesale onto a template binding. Where a dynamic input set is genuinely needed, allowlist the keys before binding them.

### Client-side-only authorization

A `CanActivate`/`CanMatch` route guard, or a `*ngIf` hiding an admin link or disabling a button based on client-side state, is a UX affordance, not an access control: the compiled bundle, the component tree, and every input passed to a "hidden" component are fully readable and re-executable by anyone with the page open, so the gate is trivially bypassed by editing state in devtools, navigating directly, or calling the underlying API. This is the shape "it's just frontend" produces most often, a real authorization decision quietly implemented only where the attacker controls the runtime.

Safer shape: treat every guard and every `*ngIf`-based gate as presentation only, and enforce the actual authorization server-side on each request the gated feature triggers. Do not omit sensitive data from an unauthorized view by conditionally rendering it, if the data reaches the client bundle or a fetched payload at all, it has already been disclosed; the server must not send it in the first place.

### Vite dev server exposure

When the project builds or serves through Vite (directly, or via an Angular + Vite toolchain), the dev server is built for a trusted local workflow, not for standing exposed. Setting `server.host` to `true`/`0.0.0.0` (common advice for testing on a phone or another machine) puts it on the network with no auth in front of it, and its permissive default CORS plus lack of origin checks on WebSocket (HMR) connections make it a target for DNS rebinding: a hostile page a developer merely has open in another tab can bind to `localhost`/the LAN address and read the dev server's responses, including source and `server.fs`-served files. A `server.fs.allow`/`fs.strict` loosened for convenience widens this to arbitrary file read via the `/@fs/` path.

Safer shape: keep `server.host` bound to `localhost` unless a specific, time-boxed reason requires otherwise, keep `server.fs.strict` enabled with `server.fs.allow` scoped to the project directory, and never run the dev server, or expose its port, on an untrusted network.

### Build-time secret and config leakage

Only environment variables prefixed `VITE_` are meant to reach the client bundle, but that convention is opt-in, not enforced: a secret named with the prefix by mistake, a broad `envPrefix` override, or a `define` entry in `vite.config` that inlines a server-side value all bake the secret into static, publicly served JavaScript at build time. Because the leak happens at build time, it is invisible in a runtime request log and easy to miss in review, the string is just sitting in the shipped bundle.

Safer shape: keep server-only secrets out of any `VITE_`-prefixed variable and out of `define`, audit `envPrefix` if it's been widened, and grep the production build output for a secret's value as a build-time check rather than assuming the naming convention was followed everywhere.

### Vite plugin and dependency supply chain

A Vite plugin runs arbitrary Node code during the build/dev process, in the transform, config, and build hooks, with the same permissions as the build process itself, developer or CI credentials, filesystem, network. Adding an unvetted plugin, or letting a compromised or typosquatted one slip into the lockfile, is equivalent to running its code directly, and because the build step is trusted by default, it draws far less scrutiny than application code doing the same thing.

Safer shape: vet a plugin before adding it the same way as any dependency (age, downloads, repository, maintainer history), install from a committed lockfile so a swapped or higher version cannot slip in, and keep an eye on which plugins run at build time versus dev time since the former also runs in CI.

## How to act on the result

- **In detect (detection):** each pattern you confirm is a finding. Describe it in plain language: what it is (the Angular/Vite-specific behavior being abused, or the browser-security assumption "it's just frontend" quietly breaks), why it matters (the concrete impact, from a defaced page to a fully bypassed access control or a leaked build-time secret), and the evidence (the component, directive, service, config key, or build step where it lives). It flows through detect's normal steps and is tracked like any other finding.
- **In verify (proof):** the control holds only when the unsafe pattern is gone or properly guarded (no untrusted value reaching `bypassSecurityTrust*` or a raw `nativeElement`/`Renderer2` property write, dynamic component resolution restricted to an allowlisted map, transferred state safely serialized, config-driven bindings limited to an allowlist, authorization enforced server-side rather than only hidden behind a guard or `*ngIf`, the dev server kept off untrusted networks, no secret reaching the client bundle, and build-time dependencies vetted and lockfile-pinned). If the dangerous pattern still reaches untrusted input, or a security decision still lives only on the client, the risk is not closed: record it as such and point back to harden.