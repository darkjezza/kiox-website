import type { APIRoute } from "astro";
import { proxyGameServer } from "../../lib/gameProxy";

export const ALL: APIRoute = async ({ request, params, url }) => {
  const rest = params.path;
  const path =
    rest == null || rest === ""
      ? "/"
      : `/${Array.isArray(rest) ? rest.join("/") : rest}`;
  return proxyGameServer(request, path, url.search);
};

export const prerender = false;
