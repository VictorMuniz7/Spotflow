# Spotflow

Jogo web de adivinhar músicas usando a API do Spotify: conecte sua conta Premium, escolha uma playlist e tente adivinhar cada faixa a partir de um trecho de 5 segundos. Ver o PRD completo em [`PRD-spotify-guess-game.md`](./PRD-spotify-guess-game.md).

Stack: Angular 21 (standalone, signals, SSR via `@angular/ssr`), Vite/esbuild como dev server, Tailwind CSS v4, Spotify Web API + Web Playback SDK, Supabase (placar global).

## Setup necessário antes de rodar

O app não funciona "out of the box": ele precisa de um app Spotify e de um projeto Supabase, ambos gratuitos.

### 1. Copiar o arquivo de ambiente

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

`environment.ts` é ignorado pelo git (contém os IDs abaixo) — cada dev/deploy preenche o seu.

### 2. Criar o app no Spotify

1. Acesse https://developer.spotify.com/dashboard e crie um app.
2. Em **Redirect URIs**, adicione `http://127.0.0.1:4200/callback` (dev). Adicione a URL de produção quando houver deploy.
3. Copie o **Client ID** para `spotifyClientId` em `environment.ts`. Não existe client secret aqui: o login usa Authorization Code + PKCE, o fluxo indicado para SPAs (ver `.lagune/memory/charter.md`, princípio I).
4. A conta usada para logar no jogo precisa ser **Spotify Premium** (obrigatório para o Web Playback SDK).

### 3. Criar o projeto Supabase (placar global)

1. Crie um projeto gratuito em https://supabase.com.
2. Em **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) uma vez — cria a tabela `leaderboard_entries` com as políticas de RLS e os `CHECK` constraints que limitam a pontuação aceita.
3. Copie **Project URL** e a **anon public key** (Settings > API) para `supabaseUrl`/`supabaseAnonKey` em `environment.ts`. A anon key é pública por design; a segurança fica nas policies do banco, não no segredo dela.

## Development server

```bash
npm start
```

Abra `http://127.0.0.1:4200/`. Use `127.0.0.1`, não `localhost`, para bater com a Redirect URI cadastrada no Spotify.

## Building

```bash
npm run build
```

Compila o projeto (client + servidor SSR) em `dist/`.

## Testes

```bash
npm test
```

Roda os testes unitários (Vitest): fórmula de pontuação (`ScoringService`), geração PKCE (`pkce.ts`) e o sorteio de faixas sem repetição (`GameStateService`).

## Deploy (GitHub Pages)

O workflow em [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) publica o site em `https://<seu-usuário>.github.io/Spotflow/` a cada push em `main`. Como `environment.ts` é gitignorado, o CI gera esse arquivo a partir de **secrets** do repositório — três passos manuais, uma vez só:

1. **GitHub → repositório → Settings → Pages → Build and deployment → Source: "GitHub Actions"** (sem isso o workflow não tem onde publicar).
2. **Settings → Secrets and variables → Actions → New repository secret**, criar:
   - `SPOTIFY_CLIENT_ID` — o mesmo Client ID usado em dev.
   - `SPOTIFY_REDIRECT_URI` — `https://<seu-usuário>.github.io/Spotflow/callback` (com barra final antes de `callback`, exatamente como cadastrado no passo 3).
   - `SUPABASE_URL` e `SUPABASE_ANON_KEY` — os mesmos valores de `environment.ts`.
3. No **Spotify Developer Dashboard**, no app, adicionar `https://<seu-usuário>.github.io/Spotflow/callback` como uma **Redirect URI** adicional (a de dev `http://127.0.0.1:4200/callback` continua funcionando em paralelo).

Depois disso, qualquer push em `main` publica sozinho; para forçar manualmente, use a aba **Actions** do GitHub → workflow "Deploy to GitHub Pages" → **Run workflow**.

**Por que GitHub Pages, e não o servidor SSR:** o app inteiro roda depois do login (Spotify + Supabase), então SSR não traz ganho real aqui — só a tela de splash se beneficiaria, e ela já é pré-renderizada estaticamente no build. GitHub Pages serve só arquivos estáticos, então o deploy usa a pasta `browser/` do build (não a `server/`), com um `404.html` copiado de `index.csr.html` para o roteamento client-side (`/playlists`, `/game`, `/callback`, etc.) funcionar em links diretos — GitHub Pages não tem rewrite de servidor, então qualquer caminho que não seja `/` cairia em 404 sem isso.

## Limitação conhecida da API do Spotify

Na migração de fevereiro/2026 da Web API, o Spotify descontinuou `GET /playlists/{id}/tracks` (agora retorna `403 Forbidden`) em favor de `GET /playlists/{id}/items`, e restringiu esse novo endpoint a **playlists das quais o usuário logado é dono ou colaborador** — mesmo estando na sua biblioteca, uma playlist de outra pessoa (incluindo as geradas pelo próprio Spotify, tipo Discover Weekly) não tem mais o conteúdo acessível pela API. O app já usa o endpoint novo e filtra a lista de seleção para mostrar só playlists próprias/colaborativas; se ainda assim alguma der 403, o jogo explica o motivo.

## Segurança

O projeto segue o charter em [`.lagune/memory/charter.md`](../.lagune/memory/charter.md) e o sub-skill [`.lagune/skills/angular.md`](../.lagune/skills/angular.md): PKCE sem client secret, tokens em `sessionStorage`, nunca usar `bypassSecurityTrustHtml`/`innerHTML` em dados vindos do Spotify, e limites (`CHECK` constraints) no placar global para não aceitar uma pontuação impossível.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
