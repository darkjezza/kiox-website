import { fetchItems, type PbItem } from "./pb";
import { el, escapeHtml, footerHtml, topBarHtml, VERSION } from "./siteChrome";
import "./style.css";

function itemKindLabel(kind: number): string {
  return kind === 1 ? "Weapon" : "Hat";
}

function renderItemRow(item: PbItem): HTMLElement {
  const row = el("tr");
  const stats =
    item.kind === 1
      ? `DMG ${item.a} · STAM ${item.b} · REACH ${item.c}`
      : `STR ${item.a} · AGI ${item.b} · INT ${item.c}`;
  row.innerHTML = `
    <td><span class="mono">#${item.itemId}</span></td>
    <td><strong>${escapeHtml(item.name)}</strong></td>
    <td><span class="pill">${itemKindLabel(item.kind)}</span></td>
    <td class="muted">${stats}</td>
    <td class="mono">${item.price}g</td>
  `;
  return row;
}

function shell(): HTMLElement {
  const root = el("div", "site");
  root.innerHTML = `
    <div class="bg-grid" aria-hidden="true"></div>
    ${topBarHtml("items")}
    <main>
      <section class="section page-hero">
        <div class="section__head">
          <p class="eyebrow">Catalog · ${VERSION}</p>
          <h1>Items</h1>
          <p id="items-sub">Loaded from the database.</p>
        </div>
        <div class="table-wrap">
          <table class="table" id="items-table">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Stats</th><th>Price</th></tr></thead>
            <tbody id="items-body"><tr><td colspan="5" class="muted">Loading items…</td></tr></tbody>
          </table>
        </div>
      </section>
    </main>
    ${footerHtml()}
  `;
  return root;
}

async function hydrateItems(body: HTMLElement, sub: HTMLElement): Promise<void> {
  try {
    const items = await fetchItems();
    sub.textContent = `${items.length} items from the database`;
    if (items.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="muted">No items in database yet.</td></tr>`;
      return;
    }
    body.replaceChildren(...items.map(renderItemRow));
  } catch (e) {
    sub.textContent = "Could not load items — check database URL, publishable key, and access rules.";
    body.innerHTML = `<tr><td colspan="5" class="muted">${escapeHtml(String(e))}</td></tr>`;
  }
}

const app = document.getElementById("app");
if (app) {
  app.replaceChildren(shell());
  const body = document.getElementById("items-body");
  const sub = document.getElementById("items-sub");
  if (body && sub) void hydrateItems(body, sub);
}
