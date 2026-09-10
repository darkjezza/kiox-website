import { GAME_CLIENT_URL, HOME_URL, PLAY_URL, el, topBarHtml, footerHtml } from "./siteChrome";
import "./style.css";

function boot(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const dest = (GAME_CLIENT_URL || PLAY_URL || "/client").replace(/\/?$/, "/");
  if (dest && dest !== "/play.html/" && !dest.includes("play.html")) {
    location.replace(dest);
    return;
  }

  const root = el("div", "site");
  root.innerHTML = `
    ${topBarHtml("play")}
    <main class="wrap">
      <section class="hero hero--compact">
        <h1>Play</h1>
        <p class="lede">Client missing from this build. Run <code>npm run build</code> (includes Phaser at <code>/client/</code>).</p>
        <p class="hero-actions">
          <a class="btn btn--primary" href="${HOME_URL}">Back home</a>
        </p>
      </section>
    </main>
    ${footerHtml()}
  `;
  app.replaceChildren(root);
}

boot();
