import { defineConfig } from "astro/config";

const liveHttpTarget =
  process.env.VITE_GAME_SERVER_URL || "https://kiox-server-live.spiritnetworks.org";

/**
 * Static marketing site for Cloudflare Workers + Static Assets.
 * /game-status and /game-api are handled by src/worker.ts (and Vite proxies in `astro dev`).
 */
export default defineConfig({
  output: "static",
  outDir: "dist/site",
  session: false,
  compressHTML: true,
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
  vite: {
    server: {
      proxy: {
        "/game-status": {
          target: liveHttpTarget,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/game-api": {
          target: liveHttpTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/game-api/, "") || "/",
        },
        // Local Phaser client (`cd ../New_Client && npm run dev`)
        "/client": {
          target: "http://127.0.0.1:5173",
          changeOrigin: true,
        },
      },
    },
  },
});
