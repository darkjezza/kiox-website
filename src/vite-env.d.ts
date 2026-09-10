/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string;
  readonly VITE_DATABASE_PUBLISHABLE_KEY: string;
  readonly VITE_DATABASE_ANON_KEY?: string;
  readonly VITE_ACCOUNT_API_URL?: string;
  readonly VITE_GAME_SERVER_URL: string;
  readonly VITE_GAME_CLIENT_URL?: string;
  readonly VITE_GAME_API_BASE: string;
  readonly VITE_PLAY_PAGE: string;
  readonly VITE_ACCOUNT_PAGE: string;
  readonly VITE_ITEMS_PAGE: string;
  readonly VITE_GUILDS_PAGE: string;
  readonly VITE_HOME_URL: string;
  readonly VITE_DISCORD_URL: string;
  readonly VITE_PATREON_URL: string;
  readonly VITE_GAME_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  kioxRefreshScale?: () => void;
}
