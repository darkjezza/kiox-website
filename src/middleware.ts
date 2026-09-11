import { defineMiddleware } from "astro:middleware";

/**
 * Play-host rewrites are handled by src/worker.ts in production.
 * Local `astro dev` uses Vite proxies; this middleware is a no-op for static builds.
 */
export const onRequest = defineMiddleware(async (_context, next) => next());
