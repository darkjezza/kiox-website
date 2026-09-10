/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Convex HTTP site origin, e.g. https://rightful-rabbit-478.convex.site */
  readonly VITE_CONVEX_SITE_URL?: string;
  /** Override account API base (defaults to `${VITE_CONVEX_SITE_URL}/account`). */
  readonly VITE_ACCOUNT_API_URL?: string;
  /** @deprecated Prefer VITE_CONVEX_SITE_URL */
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_GAME_SERVER_URL: string;
  readonly GAME_SERVER_URL?: string;
  readonly VITE_GAME_CLIENT_URL?: string;
  readonly VITE_GAME_API_BASE?: string;
  readonly VITE_PLAY_PAGE?: string;
  readonly VITE_ACCOUNT_PAGE?: string;
  readonly VITE_ITEMS_PAGE?: string;
  readonly VITE_GUILDS_PAGE?: string;
  readonly VITE_HOME_URL?: string;
  readonly VITE_DISCORD_URL?: string;
  readonly VITE_PATREON_URL?: string;
  readonly VITE_GAME_VERSION?: string;
  readonly VITE_DEV_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "cloudflare:workers" {
  export const env: {
    GAME_SERVER_URL?: string;
    ASSETS?: Fetcher;
  };
}
