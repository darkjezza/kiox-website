import { defineConfig } from "astro/config";
import node from "@astrojs/node";

const liveHttpTarget =
  process.env.VITE_GAME_SERVER_URL || "https://kiox-server-live.spiritnetworks.org";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
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
        // Local Phaser client (`cd client && npm run dev`)
        "/client": {
          target: "http://127.0.0.1:5173",
          changeOrigin: true,
        },
      },
    },
  },
});
