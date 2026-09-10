# Kiox Online — website ([Astro](https://astro.build/) 7)

Marketing site **plus** Phaser client at `/client/`. Runs on **localhost** via `@astrojs/node` (not Cloudflare Pages).

| Path | Role |
|------|------|
| `/` | Homepage |
| `/account` | Account manager |
| `/shop` | Koin shop (login required) |
| `/items` | Item catalog |
| `/guilds` | Guild rosters |
| `/play` | Redirects to `/client/` |
| `/client/` | Phaser game (proxy to Vite in `dev`, or copied after build) |
| `/game-status`, `/game-api` | Proxies → `VITE_GAME_SERVER_URL` |

```bash
cd website
npm ci
cp .env.example .env   # or use the local .env
npm run dev            # http://127.0.0.1:4321
```

In another terminal, run the Phaser client for `/client` during `astro dev`:

```bash
cd client
npm run dev            # http://127.0.0.1:5173 — proxied at /client
```

Production-like local serve:

```bash
npm run start          # build + node ./dist/server/entry.mjs
```

Set `VITE_CONVEX_SITE_URL` to the Convex HTTP site. For local game status, point `VITE_GAME_SERVER_URL` at `http://127.0.0.1:7350` (Nakama via `New_Server`). Live/production bake still uses `.env.live` / `.env.production`.

## Deploy to Windows host (SCP)

1. Copy `scripts/deploy.env.example` → `scripts/deploy.env` and set host/user/paths.
2. Ensure OpenSSH client works (`ssh` / `scp`) and the remote has **Node.js** installed.
3. First time on the server: create `C:\kiox\website` (or your `WEBSITE_REMOTE_DIR`).
4. From `website/`:

```bat
scripts\deploy.bat -Live
```

Or: `npm run deploy` (builds with live env, uploads `dist/` + manifests, remote `npm ci --omit=dev`, restarts Node on `WEBSITE_LISTEN_PORT`).

From the monorepo root (with `./server` present):

```powershell
.\deploy-scp.ps1 -All -Live
.\deploy-scp.ps1 -Website -Live
.\deploy-scp.ps1 -Server
```
