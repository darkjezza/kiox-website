const CLIENT_BASE = (
  import.meta.env.VITE_CLIENT_BASE || import.meta.env.VITE_PLAY_URL || "/client/"
).replace(/\/?$/, "/");

let loadPromise: Promise<void> | null = null;

function appendModulePreload(href: string): void {
  if (document.querySelector(`link[rel="modulepreload"][href="${CSS.escape(href)}"]`)) return;
  const el = document.createElement("link");
  el.rel = "modulepreload";
  el.crossOrigin = "anonymous";
  el.href = href;
  document.head.appendChild(el);
}

function injectModuleScript(src: string): Promise<void> {
  if (document.querySelector('script[data-kiox-game="1"]')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.src = src;
    script.dataset.kioxGame = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load game: ${src}`));
    document.body.appendChild(script);
  });
}

async function loadFromEntryJson(base: string): Promise<boolean> {
  const res = await fetch(`${base}entry.json`, { cache: "no-store" });
  if (!res.ok) return false;
  const entry = (await res.json()) as { script?: string; preload?: string[] };
  if (!entry.script) return false;
  for (const href of entry.preload ?? []) appendModulePreload(href);
  await injectModuleScript(entry.script);
  return true;
}

async function loadFromIndexHtml(base: string): Promise<boolean> {
  const res = await fetch(`${base}index.html`, { cache: "no-store" });
  if (!res.ok) return false;

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  for (const link of doc.querySelectorAll('link[rel="modulepreload"]')) {
    const href = link.getAttribute("href");
    if (href) appendModulePreload(href);
  }

  const entry = doc.querySelector('script[type="module"][src]');
  const src = entry?.getAttribute("src");
  if (!src) throw new Error("Game entry script missing from client build");
  await injectModuleScript(src);
  return true;
}

/** Load the Phaser client bundle into the current page (no iframe). */
export function loadGameClient(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (document.querySelector('script[data-kiox-game="1"]')) return;

    if (import.meta.env.DEV) {
      // @ts-expect-error Vite resolves @client via alias in vite.config.ts
      await import("@client/main");
      return;
    }

    if (await loadFromEntryJson(CLIENT_BASE)) return;
    if (await loadFromIndexHtml(CLIENT_BASE)) return;

    throw new Error(
      `Game client not found at ${CLIENT_BASE}. Run "npm run build" in the website folder, then redeploy.`,
    );
  })();

  return loadPromise;
}
