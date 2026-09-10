import type { APIRoute } from "astro";
import { proxyGameServer } from "../../lib/gameProxy";

export const ALL: APIRoute = async ({ request, url }) =>
  proxyGameServer(request, "/", url.search);

export const prerender = false;
