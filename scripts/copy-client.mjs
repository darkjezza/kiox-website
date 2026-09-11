/**
 * Build Phaser client into website/dist/site/client/ (after astro static build).
 * Worker serves assets from dist/site; WSS comes from VITE_GAME_SERVER_URL.
 */
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const clientRoot = resolve(websiteRoot, "../New_Client");
const outDir = resolve(websiteRoot, "dist/site/client");

/** Minimal Vite-like env loader (no vite dependency in website/). */
function loadEnvFiles(mode, root) {
  const out = {};
  const files = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
  for (const name of files) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8").replace(/^\uFEFF/, "");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  }
  return out;
}

const mode = process.env.MODE || process.argv[2] || "production";
const env = { ...loadEnvFiles(mode, websiteRoot), ...process.env };
const gameHttp = (
  env.VITE_GAME_SERVER_URL || "https://kiox-server-live.spiritnetworks.org"
).replace(/\/$/, "");
const httpsBase = `${gameHttp}/`;
const wssBase = `${gameHttp.replace(/^http/i, "ws")}/ws`;
const devHttp = (env.VITE_DEV_SERVER_URL || "https://kiox-dev.spiritnetworks.org").replace(
  /\/$/,
  "",
);
const devHttpsBase = `${devHttp}/`;
const devWssBase = `${devHttp.replace(/^http/i, "ws")}/ws`;

if (!existsSync(resolve(clientRoot, "package.json"))) {
  console.error("Missing ../New_Client - website must sit next to New_Client/ in the monorepo.");
  process.exit(1);
}

const siteRoot = resolve(websiteRoot, "dist/site");
if (!existsSync(siteRoot)) {
  console.error("Missing dist/site - run `astro build` first.");
  process.exit(1);
}

console.log(`Building client -> dist/site/client (WSS ${wssBase})`);
const clientNodeModules = resolve(clientRoot, "node_modules");
if (!existsSync(clientNodeModules)) {
  console.log("New_Client/node_modules missing - running npm ci...");
  execSync("npm ci", { cwd: clientRoot, stdio: "inherit" });
} else {
  console.log("New_Client/node_modules present - skipping npm ci");
}
execSync("npx vite build --base=/client/", {
  cwd: clientRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_LIVE_SERVER_HTTPS: httpsBase,
    VITE_LIVE_SERVER_WSS: wssBase,
    VITE_DEV_SERVER_HTTPS: devHttpsBase,
    VITE_DEV_SERVER_WSS: devWssBase,
    VITE_WEBSITE_ORIGIN: env.VITE_WEBSITE_ORIGIN || "https://kiox-online.spiritnetworks.org",
  },
});

const clientDist = resolve(clientRoot, "dist");
if (!existsSync(clientDist)) {
  console.error("New_Client/dist missing after build");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
cpSync(clientDist, outDir, { recursive: true });
console.log(`Copied ${clientDist} -> ${outDir}`);
