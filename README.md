# Kiox Online — website ([Astro](https://astro.build/) 7)

Marketing site **plus** Phaser client at `/client/`. Production host is **Cloudflare Workers** (Static Assets + [`src/worker.ts`](src/worker.ts)).

| Path | Role |
|------|------|
| `/` | Homepage |
| `/account` | Account manager |
| `/shop` | Koin shop (login required) |
| `/items` | Item catalog |
| `/guilds` | Guild rosters |
| `/play` | Redirects to `/client/` |
| `/client/` | Phaser game (Vite proxy in `dev`, or copied after build) |
| `/game-status`, `/game-api` | Worker proxies → `GAME_SERVER_URL` / `VITE_GAME_SERVER_URL` |

Custom hosts (see `wrangler.toml`):

- `https://kiox-online.spiritnetworks.org` — marketing + `/client/`
- `https://play.kiox-online.spiritnetworks.org` — play URL (root → `/client/`)

## Local development

```bash
cd website
npm ci
cp .env.example .env   # or use the local .env
npm run dev            # http://127.0.0.1:4321
```

In another terminal, run the Phaser client for `/client` during `astro dev`:

```bash
cd ../New_Client
npm run dev            # http://127.0.0.1:5173 — proxied at /client
```

Production-like local serve (Worker + assets):

```bash
npm run preview:live   # build:live then wrangler dev
```

Set `VITE_CONVEX_SITE_URL` to the Convex HTTP site. For local game status during `astro dev`, point `VITE_GAME_SERVER_URL` at `http://127.0.0.1:7350` (Nakama via `New_Server`). Live bake uses `.env.live`.

## Deploy to Cloudflare

1. One-time: `npx wrangler login` (account must own zone `spiritnetworks.org` for custom routes).
2. From `website/`:

```bash
npm run deploy
```

That runs `build:live` (Astro static → `dist/site/` + Phaser → `dist/site/client/`) then `wrangler deploy`.

DNS: `kiox-online` and `play.kiox-online` should be orange-cloud (proxied) on Cloudflare.

For the play subdomain (first time), create a proxied DNS record, e.g. `CNAME play.kiox-online` → `kiox-online.spiritnetworks.org` (or the Worker `*.workers.dev` hostname). The Worker route is already registered in `wrangler.toml`.

## Backup: Windows SCP

Legacy Node host deploy (optional):

```bash
npm run deploy:scp
```

Requires [`scripts/deploy.env`](scripts/deploy.env) (copy from `deploy.env.example`).
