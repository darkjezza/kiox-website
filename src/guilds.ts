import { fetchGuilds, type PbGuild } from "./pb";
import { el, escapeHtml, footerHtml, topBarHtml, VERSION } from "./siteChrome";
import "./style.css";

function guildSize(g: PbGuild): number {
  return 1 + g.coLeaders.length + g.members.length;
}

function renderGuildCard(g: PbGuild): HTMLElement {
  const card = el("article", "guild-card");
  const roster = [g.leader, ...g.coLeaders.map((n) => `${n} (co)`), ...g.members];
  card.innerHTML = `
    <header class="guild-card__head">
      <h3>[${escapeHtml(g.tag)}]</h3>
      <span class="pill">${guildSize(g)} / 24</span>
    </header>
    <p class="guild-card__leader">Leader · <strong>${escapeHtml(g.leader)}</strong></p>
    <ul class="guild-card__list">${roster
      .slice(0, 8)
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join("")}${roster.length > 8 ? `<li class="muted">+${roster.length - 8} more</li>` : ""}</ul>
  `;
  return card;
}

function shell(): HTMLElement {
  const root = el("div", "site");
  root.innerHTML = `
    <div class="bg-grid" aria-hidden="true"></div>
    ${topBarHtml("guilds")}
    <main>
      <section class="section page-hero">
        <div class="section__head">
          <p class="eyebrow">Rosters · ${VERSION}</p>
          <h1>Guilds</h1>
          <p id="guilds-sub">Synced from the database.</p>
        </div>
        <div class="guild-grid" id="guild-grid"><p class="muted">Loading guilds…</p></div>
      </section>
    </main>
    ${footerHtml()}
  `;
  return root;
}

async function hydrateGuilds(grid: HTMLElement, sub: HTMLElement): Promise<void> {
  try {
    const guilds = await fetchGuilds();
    sub.textContent = `${guilds.length} guild${guilds.length === 1 ? "" : "s"} from the database`;
    if (guilds.length === 0) {
      grid.replaceChildren(el("p", "muted", "No guilds yet — be the first to create one in-game."));
      return;
    }
    grid.replaceChildren(...guilds.map(renderGuildCard));
  } catch (e) {
    sub.textContent = "Could not load guilds — check database URL, publishable key, and access rules.";
    grid.replaceChildren(el("p", "muted", String(e)));
  }
}

const app = document.getElementById("app");
if (app) {
  app.replaceChildren(shell());
  const grid = document.getElementById("guild-grid");
  const sub = document.getElementById("guilds-sub");
  if (grid && sub) void hydrateGuilds(grid, sub);
}
