/** Shared marketing-site chrome (nav + footer links). */

/** Phaser client on this Worker (`/client/`). */
export const GAME_CLIENT_URL = (import.meta.env.VITE_GAME_CLIENT_URL || "/client").replace(/\/$/, "");

export const PLAY_URL =
  GAME_CLIENT_URL || import.meta.env.VITE_PLAY_PAGE || "/client/";

export const ACCOUNT_URL = import.meta.env.VITE_ACCOUNT_PAGE || "/account.html";
export const ITEMS_URL = import.meta.env.VITE_ITEMS_PAGE || "/items.html";
export const GUILDS_URL = import.meta.env.VITE_GUILDS_PAGE || "/guilds.html";
export const HOME_URL = import.meta.env.VITE_HOME_URL || "/";
export const DISCORD = import.meta.env.VITE_DISCORD_URL || "https://discord.gg/JHafup7fQ4";
export const PATREON = import.meta.env.VITE_PATREON_URL || "https://www.patreon.com/cw/SpiritNetworks";
export const VERSION = import.meta.env.VITE_GAME_VERSION || "v0.06";

/** Live game HTTP base (docs). Homepage status uses `/game-status` instead. */
export const GAME_SERVER =
  import.meta.env.VITE_GAME_SERVER_URL || "https://kiox-server-live.spiritnetworks.org";

export type NavActive = "home" | "play" | "account" | "items" | "guilds" | "community" | "";

function navLink(href: string, label: string, active: boolean): string {
  return `<a href="${href}"${active ? ' aria-current="page" class="nav__active"' : ""}>${label}</a>`;
}

/** Top bar markup. Pass which page is current for aria-current. */
export function topBarHtml(active: NavActive = ""): string {
  return `
    <header class="top">
      <a class="brand" href="${HOME_URL}"><img class="brand__icon" src="/icons/icon-32.png" width="28" height="28" alt="" /><span class="brand__name">Kiox<span>Online</span></span></a>
      <nav class="nav">
        ${navLink(HOME_URL, "Home", active === "home")}
        ${navLink(PLAY_URL, "Play", active === "play")}
        ${navLink(ACCOUNT_URL, "Account", active === "account")}
        ${navLink(ITEMS_URL, "Items", active === "items")}
        ${navLink(GUILDS_URL, "Guilds", active === "guilds")}
        ${navLink(`${HOME_URL}#community`, "Community", active === "community")}
      </nav>
      <a class="btn btn--primary btn--sm" href="${PLAY_URL}">Launch Game</a>
    </header>
  `;
}

export function footerHtml(): string {
  const y = new Date().getFullYear();
  return `
    <footer class="footer">
      <p>� ${y} Kiox Online � <a href="${PLAY_URL}">Play</a> � <a href="${ACCOUNT_URL}">Account</a> � <a href="${ITEMS_URL}">Items</a> � <a href="${GUILDS_URL}">Guilds</a> � Data: database + live server</p>
      <p class="muted">Version ${VERSION}</p>
    </footer>
  `;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
