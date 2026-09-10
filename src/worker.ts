/**
 * Cloudflare Worker: marketing site + Phaser /client/ + /game-api proxy to game server.
 * play.kiox-online.spiritnetworks.org serves the same /client/ assets (stable Play URL).
 */
export interface Env {
  ASSETS: Fetcher;
  GAME_SERVER_URL: string;
}

const PLAY_HOST = "play.kiox-online.spiritnetworks.org";

function corsHeaders(methods = "GET, HEAD, POST, DELETE, OPTIONS"): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization",
  };
}

function upstreamPath(pathname: string): string | null {
  if (pathname === "/game-status" || pathname === "/game-status/") return "/";
  if (pathname === "/game-api" || pathname === "/game-api/") return "/";
  if (pathname.startsWith("/game-api/")) {
    const rest = pathname.slice("/game-api".length);
    return rest || "/";
  }
  return null;
}

/** play.* root → /client/; keep /client/* and /game-* as-is. */
function playAssetUrl(request: Request): URL {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/client/";
  } else if (
    !url.pathname.startsWith("/client") &&
    !url.pathname.startsWith("/game-api") &&
    !url.pathname.startsWith("/game-status")
  ) {
    url.pathname = `/client${url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`}`;
  }
  return url;
}

async function proxyGameApi(request: Request, env: Env, path: string, search: string): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
  }
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("target");
  const qs = params.toString();
  const target = (env.GAME_SERVER_URL || "").replace(/\/$/, "");
  if (!target) {
    return Response.json({ ok: false, error: "GAME_SERVER_URL unset" }, { status: 503, headers: corsHeaders() });
  }
  try {
    const upstream = await fetch(`${target}${path}${qs ? `?${qs}` : ""}`, {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "application/json" },
      redirect: "follow",
    });
    const body = await upstream.arrayBuffer();
    const headers = new Headers();
    const ct = upstream.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);
    else headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    return new Response(body, { status: upstream.status, headers });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "upstream failed" },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const effective = url.hostname === PLAY_HOST ? playAssetUrl(request) : url;

    const path = upstreamPath(effective.pathname);
    if (path != null) {
      return proxyGameApi(request, env, path, effective.search);
    }

    if (url.hostname === PLAY_HOST) {
      return env.ASSETS.fetch(new Request(effective.toString(), request));
    }
    return env.ASSETS.fetch(request);
  },
};
