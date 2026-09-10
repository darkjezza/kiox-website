import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const liveHttpTarget =
    env.VITE_GAME_SERVER_URL || "https://kiox-server-live.spiritnetworks.org";

  const proxy: Record<string, object> = {
    "/game-status": {
      target: liveHttpTarget,
      changeOrigin: true,
      secure: true,
      rewrite: () => "/",
    },
    "/game-api": {
      target: liveHttpTarget,
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/game-api/, "") || "/",
    },
  };

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          play: resolve(__dirname, "play.html"),
          account: resolve(__dirname, "account.html"),
          items: resolve(__dirname, "items.html"),
          guilds: resolve(__dirname, "guilds.html"),
        },
      },
    },
    server: {
      port: 5174,
      proxy,
    },
    preview: {
      port: 4173,
      proxy,
    },
  };
});
