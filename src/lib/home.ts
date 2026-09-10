import { fetchDatabaseOnline, fetchServerStatus } from "./api/status";
import { convexSiteUrl } from "./pb";
import {
  ACCOUNT_URL,
  DISCORD,
  el,
  footerHtml,
  GUILDS_URL,
  ITEMS_URL,
  PATREON,
  PLAY_URL,
  topBarHtml,
  VERSION,
} from "./siteChrome";

function statCard(label: string, value: string, tone: "ok" | "warn" | "muted" = "muted"): HTMLElement {
  const card = el("div", `stat stat--${tone}`);
  card.append(el("span", "stat__label", label), el("strong", "stat__value", value));
  return card;
}

function shell(): HTMLElement {
  const root = el("div", "site");
  root.innerHTML = `
    <div class="bg-grid" aria-hidden="true"></div>
    ${topBarHtml("home")}
    <main id="top">
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Spirit Networks · ${VERSION}</p>
          <h1>Kiox Online</h1>
          <p class="lede">Explore, fight monsters, gear up, and build guilds with friends — right in your browser. Free to play online.</p>
          <div class="hero__actions">
            <a class="btn btn--primary btn--lg" href="${PLAY_URL}">Play Now</a>
            <a class="btn btn--ghost btn--lg" href="${ACCOUNT_URL}">Account</a>
            <a class="btn btn--ghost btn--lg" href="${DISCORD}" target="_blank" rel="noopener">Join Discord</a>
          </div>
        </div>
        <div class="hero__panel" id="status-panel">
          <p class="panel-title">Live status</p>
          <div class="stats" id="stats-row">
            <div class="stat stat--muted"><span class="stat__label">Loading</span><strong class="stat__value">…</strong></div>
          </div>
        </div>
      </section>
      <section id="play" class="section">
        <div class="section__head"><h2>Play</h2><p>Manage your account on the account page, then play in-game.</p></div>
        <div class="cards cards--3">
          <article class="info-card"><h3>1 · Account</h3><p>Use <a href="${ACCOUNT_URL}">Account</a> to register, log in, and manage characters.</p></article>
          <article class="info-card"><h3>2 · Character</h3><p>Create or select a character in-game — your in-game name.</p></article>
          <article class="info-card"><h3>3 · Explore</h3><p>Grind, shop in day, party, trade, join guilds, and fight together.</p></article>
        </div>
      </section>
      <section class="section">
        <div class="section__head"><h2>Browse</h2><p>Catalog and guild rosters live on their own pages.</p></div>
        <div class="cards cards--2">
          <a class="info-card info-card--link" href="${ITEMS_URL}"><h3>Items</h3><p>Hats, weapons, stats, and shop prices from the database.</p></a>
          <a class="info-card info-card--link" href="${GUILDS_URL}"><h3>Guilds</h3><p>Live guild tags, leaders, and member rosters.</p></a>
        </div>
      </section>
      <section id="community" class="section section--community">
        <div class="section__head"><h2>Community</h2><p>Support development and hang out with other players.</p></div>
        <div class="community-links">
          <a class="community-card community-card--discord" href="${DISCORD}" target="_blank" rel="noopener"><span>Discord</span><p>Chat, events, and updates</p></a>
          <a class="community-card community-card--patreon" href="${PATREON}" target="_blank" rel="noopener"><span>Patreon</span><p>Supporter perks in-game</p></a>
          <a class="community-card" href="${ACCOUNT_URL}"><span>Account</span><p>Log in, register, manage</p></a>
          <a class="community-card" href="${PLAY_URL}"><span>Play</span><p>Open the play page</p></a>
        </div>
      </section>
    </main>
    ${footerHtml()}
  `;
  return root;
}

async function hydrateStatus(container: HTMLElement): Promise<void> {
  const [game, dbOk] = await Promise.all([
    fetchServerStatus("/game-status"),
    fetchDatabaseOnline(convexSiteUrl()),
  ]);
  container.replaceChildren(
    statCard("Game server", game.online ? "Online" : "Offline", game.online ? "ok" : "warn"),
    statCard(
      "Players",
      game.players != null ? `${game.players}${game.max != null ? ` / ${game.max}` : ""}` : "—",
      game.online ? "ok" : "muted",
    ),
    statCard(
      "Ping",
      game.pingMs != null ? `${game.pingMs} ms` : "—",
      game.online && game.pingMs != null && game.pingMs >= 150 ? "warn" : game.online ? "ok" : "muted",
    ),
    statCard("Version", game.version, "muted"),
    statCard(
      "Time remaining",
      game.minutesRemaining != null ? `~${game.minutesRemaining} min` : "—",
      game.online && game.minutesRemaining != null && game.minutesRemaining <= 30 ? "warn" : "muted",
    ),
    statCard("Database", dbOk ? "Connected" : "Offline", dbOk ? "ok" : "warn"),
  );
}

export function boot(): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.appendChild(shell());

  const statsRow = document.getElementById("stats-row");
  if (statsRow) {
    void hydrateStatus(statsRow);
    window.setInterval(() => hydrateStatus(statsRow), 30_000);
  }
}
