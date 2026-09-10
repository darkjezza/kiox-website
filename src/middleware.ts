import { defineMiddleware } from "astro:middleware";

const PLAY_HOST = "play.kiox-online.spiritnetworks.org";

const htmlRedirects: Record<string, string> = {
  "/account.html": "/account",
  "/items.html": "/items",
  "/guilds.html": "/guilds",
  "/play.html": "/client/",
  "/index.html": "/",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  const redirectTo = htmlRedirects[url.pathname];
  if (redirectTo) {
    return context.redirect(redirectTo + url.search, 301);
  }

  if (url.hostname === PLAY_HOST) {
    let path = url.pathname;
    if (path === "/" || path === "") {
      path = "/client/";
    } else if (
      !path.startsWith("/client") &&
      !path.startsWith("/game-api") &&
      !path.startsWith("/game-status")
    ) {
      path = `/client${path.startsWith("/") ? path : `/${path}`}`;
    }
    if (path !== url.pathname) {
      return context.rewrite(path + url.search);
    }
  }

  return next();
});
