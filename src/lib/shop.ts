import {
  ACCOUNT_URL,
  el,
  escapeHtml,
  footerHtml,
  topBarHtml,
  VERSION,
} from "./siteChrome";
import {
  buyKoinShop,
  clearAccountSession,
  fetchKoinShop,
  getAccountToken,
  type KoinShopItem,
  type KoinShopPayload,
} from "./api/account";
import { mountKoinPackages } from "./koinStore";

function showFlash(host: HTMLElement, kind: "error" | "success" | "warn", msg: string): void {
  host.replaceChildren();
  if (!msg) return;
  const cls =
    kind === "error" ? "play-alert play-alert--err" : kind === "success" ? "play-success" : "play-alert play-alert--warn";
  host.append(el("p", cls, msg));
}

function shell(): HTMLElement {
  const root = el("div", "site");
  root.innerHTML = `
    <div class="bg-grid" aria-hidden="true"></div>
    ${topBarHtml("shop")}
    <main>
      <section class="section page-hero">
        <div class="section__head">
          <p class="eyebrow">Cosmetics · ${VERSION}</p>
          <h1>Koin Shop</h1>
          <p id="shop-sub" class="lede">Spend Koin on vanity overlays. Items go into a character inventory.</p>
        </div>
        <div id="shop-flash"></div>
        <div id="shop-root" class="account-wrap account-wrap--wide"></div>
      </section>
    </main>
    ${footerHtml()}
  `;
  return root;
}

function renderGate(root: HTMLElement): void {
  root.innerHTML = `
    <section class="play-card">
      <h2>Log in required</h2>
      <p class="play-card-hint muted">The Koin shop is only available when you are logged into your account on the website.</p>
      <p><a class="btn btn--primary" href="${ACCOUNT_URL}">Go to Account</a></p>
    </section>
  `;
}

function renderShop(root: HTMLElement, data: KoinShopPayload, flash?: { kind: "error" | "success"; msg: string }): void {
  const flashHost = document.querySelector("#shop-flash") as HTMLElement | null;
  if (flashHost && flash) showFlash(flashHost, flash.kind, flash.msg);
  else if (flashHost) flashHost.replaceChildren();

  const sub = document.querySelector("#shop-sub");
  if (sub) {
    sub.textContent = `Logged in as ${data.username} · ${data.koin} Koin`;
  }

  const chars = data.characters;
  const charOptions =
    chars.length === 0
      ? `<option value="">No characters — create one in Account</option>`
      : chars
          .map(
            (c, i) =>
              `<option value="${escapeHtml(c.name)}"${i === 0 ? " selected" : ""}>${escapeHtml(c.name)} (Lv ${c.level})</option>`,
          )
          .join("");

  const rows = data.items
    .map((it: KoinShopItem) => {
      const canBuy = chars.length > 0 && data.koin >= it.koinCost;
      return `
      <tr>
        <td><strong>${escapeHtml(it.name)}</strong><div class="muted mono">#${it.itemId}</div></td>
        <td><span class="pill">Cosmetic</span></td>
        <td class="mono">${it.koinCost} Koin</td>
        <td>
          <button type="button" class="btn btn--primary btn--sm" data-buy="${escapeHtml(it.sku)}" ${canBuy ? "" : "disabled"}>
            Buy
          </button>
        </td>
      </tr>`;
    })
    .join("");

  root.innerHTML = `
    <section class="play-card">
      <div class="account-row" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:end;margin-bottom:1rem">
        <div>
          <label class="account-label" for="shop-char">Deliver to character</label>
          <select class="play-input" id="shop-char">${charOptions}</select>
        </div>
        <p class="muted" style="margin:0">Balance: <strong class="mono">${data.koin}</strong> Koin</p>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Item</th><th>Type</th><th>Cost</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4" class="muted">No shop items yet.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="play-foot muted">Vanity only — does not replace hat stats. Equip cosmetics in-game from inventory.</p>
    </section>
    <div id="koin-packages"></div>
  `;

  const koinHost = root.querySelector("#koin-packages") as HTMLElement | null;
  if (koinHost) {
    void mountKoinPackages(koinHost, data.username, async () => {
      const next = await fetchKoinShop();
      renderShop(root, next, { kind: "success", msg: "Koin purchase complete." });
    });
  }

  root.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sku = btn.dataset.buy || "";
      const select = root.querySelector("#shop-char") as HTMLSelectElement | null;
      const charName = select?.value?.trim() || "";
      if (!sku || !charName) {
        if (flashHost) showFlash(flashHost, "error", "Pick a character first.");
        return;
      }
      btn.disabled = true;
      try {
        const bought = await buyKoinShop(sku, charName);
        const next = await fetchKoinShop();
        renderShop(root, next, {
          kind: "success",
          msg: `Bought ${bought.name || sku} for ${charName}. New balance: ${bought.koin} Koin.`,
        });
      } catch (err) {
        btn.disabled = false;
        if (flashHost) {
          showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
        }
      }
    });
  });
}

export async function boot(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  const page = shell();
  app.replaceChildren(page);
  const root = page.querySelector("#shop-root") as HTMLElement;
  const flashHost = page.querySelector("#shop-flash") as HTMLElement;

  if (!getAccountToken()) {
    renderGate(root);
    return;
  }

  try {
    const data = await fetchKoinShop();
    renderShop(root, data);
  } catch (err) {
    clearAccountSession();
    renderGate(root);
    showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
  }
}
