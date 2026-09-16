/**
 * Buy-Koin section for the website shop page (logged-in only).
 *
 * Packages + the RevenueCat Web Billing public key come from the game server
 * (`/shop/config`, `/shop/packages`). Checkout runs through RevenueCat, and the
 * game server's RevenueCat webhook credits koin to the account — this page only
 * refreshes the displayed balance.
 *
 * Note: web checkout uses RevenueCat Billing / Stripe. In the Play-distributed
 * Android app, koin must be sold through Google Play Billing (RevenueCat's
 * native SDK), not this web flow.
 */
import { Purchases } from "@revenuecat/purchases-js";
import { GAME_SERVER } from "./siteChrome";

export type KoinPackage = { productId: string; koin: number; label: string; price: string };

type ShopConfig = { ok?: boolean; publicApiKey?: string | null };

const DEV_SERVER = (import.meta.env.VITE_DEV_SERVER_URL || "").replace(/\/$/, "");
const GAME_API_BASE = (import.meta.env.VITE_GAME_API_BASE || "").replace(/\/$/, "");

function candidates(path: string): string[] {
  const out: string[] = [];
  const base = GAME_SERVER.replace(/\/$/, "");
  if (GAME_API_BASE) out.push(`${GAME_API_BASE}${path}`); // same-origin Worker proxy
  if (base) out.push(`${base}${path}`);
  if (DEV_SERVER && DEV_SERVER !== base) out.push(`${DEV_SERVER}${path}`);
  return out;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  for (const url of candidates(path)) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as T;
      return data;
    } catch {
      /* try next host */
    }
  }
  return null;
}

let configuredFor = "";

async function configure(publicApiKey: string, username: string): Promise<Purchases | null> {
  if (Purchases.isConfigured()) {
    return configuredFor === username ? Purchases.getSharedInstance() : null;
  }
  const sdk = Purchases.configure({ apiKey: publicApiKey, appUserId: username });
  configuredFor = username;
  return sdk;
}

function money(
  pkg: unknown,
): string {
  const p = pkg as
    | { webBillingProduct?: { price?: { formattedPrice?: string }; currentPrice?: { formattedPrice?: string } } }
    | undefined;
  return p?.webBillingProduct?.price?.formattedPrice ?? p?.webBillingProduct?.currentPrice?.formattedPrice ?? "";
}

/**
 * Render the Buy-Koin card into `host`. `onCredited` re-fetches the balance.
 */
export async function mountKoinPackages(
  host: HTMLElement,
  username: string,
  onCredited: () => Promise<void>,
): Promise<void> {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading Koin packages…";
  host.replaceChildren(status);

  const [cfg, list] = await Promise.all([
    fetchJson<ShopConfig>("/shop/config"),
    fetchJson<{ ok?: boolean; packages?: KoinPackage[] }>("/shop/packages"),
  ]);
  const packages = list?.packages ?? [];
  if (!cfg?.publicApiKey) {
    status.textContent = "Koin purchases are not available yet (store not configured).";
    return;
  }
  if (!packages.length) {
    status.textContent = "No Koin packages are available right now.";
    return;
  }

  const sdk = await configure(cfg.publicApiKey, username);
  if (!sdk) {
    status.textContent = `Store is set up for a different account; reload the page to buy as ${username}.`;
    return;
  }

  let byProductId = new Map<string, unknown>();
  try {
    const offerings = await sdk.getOfferings();
    const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
    const available = (offering?.availablePackages ?? []) as unknown[];
    byProductId = new Map(
      available.map((p) => {
        const prod = (p as { webBillingProduct?: { identifier?: string } }).webBillingProduct;
        return [prod?.identifier ?? "", p] as [string, unknown];
      }),
    );
  } catch (e) {
    status.textContent = `Could not load prices: ${(e as Error).message}`;
    return;
  }

  const rows = packages
    .filter((p) => byProductId.has(p.productId))
    .map(
      (p) => `
      <tr>
        <td><strong>${p.label}</strong></td>
        <td class="mono">${p.koin} Koin</td>
        <td class="mono">${money(byProductId.get(p.productId)) || p.price}</td>
        <td><button type="button" class="btn btn--primary btn--sm" data-koin="${p.productId}">Buy</button></td>
      </tr>`,
    )
    .join("");

  const card = document.createElement("section");
  card.className = "play-card";
  card.innerHTML = `
    <h2>Buy Koin</h2>
    <p class="play-card-hint muted">Koin is added to <strong>${username}</strong>. Purchases are final; koin appears within a few seconds.</p>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Package</th><th>Koin</th><th>Price</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted">Packages aren't published in the store yet.</td></tr>`}</tbody>
      </table>
    </div>
    <p class="play-foot muted" data-koin-status></p>
  `;
  host.replaceChildren(card);
  const msg = card.querySelector("[data-koin-status]") as HTMLElement;

  card.querySelectorAll<HTMLButtonElement>("[data-koin]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pkg = byProductId.get(btn.dataset.koin || "");
      if (!pkg) return;
      btn.disabled = true;
      msg.textContent = "Opening checkout…";
      try {
        await sdk.purchase({ rcPackage: pkg as never, htmlTarget: card });
        msg.textContent = "Purchase complete — refreshing balance…";
        await onCredited();
      } catch (e) {
        const text = (e as Error)?.message ?? String(e);
        msg.textContent = /cancel/i.test(text) ? "Purchase cancelled." : `Purchase failed: ${text}`;
      } finally {
        btn.disabled = false;
      }
    });
  });
}
