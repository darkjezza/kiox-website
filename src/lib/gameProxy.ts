/** Resolve live game server HTTPS origin for Worker proxies. */
export async function resolveGameServerUrl(): Promise<string> {
  try {
    const mod = await import("cloudflare:workers");
    const fromBinding = (mod as { env?: { GAME_SERVER_URL?: string } }).env?.GAME_SERVER_URL;
    if (fromBinding) return fromBinding.replace(/\/$/, "");
  } catch {
    /* local / non-Workers runtime */
  }
  return (
    import.meta.env.VITE_GAME_SERVER_URL ||
    import.meta.env.GAME_SERVER_URL ||
    ""
  ).replace(/\/$/, "");
}

export function corsHeaders(methods = "GET, HEAD, OPTIONS"): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization",
  };
}

/** Nakama health is HTTP 200 with an empty body — map root probes to homepage status JSON. */
function statusFromUpstream(upstream: Response, body: ArrayBuffer): Response {
  const headers = new Headers(corsHeaders());
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");

  if (upstream.ok && body.byteLength === 0) {
    return Response.json(
      { ok: true, version: "nakama", players: null, max: null },
      { status: 200, headers },
    );
  }

  const text = new TextDecoder().decode(body).trim();
  if (upstream.ok && text) {
    try {
      const j = JSON.parse(text) as { ok?: boolean };
      if (typeof j.ok === "boolean") {
        return new Response(body, { status: upstream.status, headers });
      }
    } catch {
      /* non-JSON health text from Nakama-style backends */
    }
    return Response.json(
      { ok: true, version: "nakama", players: null, max: null },
      { status: 200, headers },
    );
  }

  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
  );
  return new Response(body, { status: upstream.status, headers });
}

export async function proxyGameServer(
  request: Request,
  path: string,
  search: string,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
  }
  const target = await resolveGameServerUrl();
  if (!target) {
    return Response.json(
      { ok: false, error: "GAME_SERVER_URL unset" },
      { status: 503, headers: corsHeaders() },
    );
  }
  const qs = search.startsWith("?") ? search.slice(1) : search;
  try {
    const upstream = await fetch(`${target}${path}${qs ? `?${qs}` : ""}`, {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "application/json" },
      redirect: "follow",
    });
    const body = await upstream.arrayBuffer();
    if (path === "/" || path === "") {
      return statusFromUpstream(upstream, body);
    }
    const headers = new Headers(corsHeaders());
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
    );
    headers.set("Cache-Control", "no-store");
    return new Response(body, { status: upstream.status, headers });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "upstream failed" },
      { status: 502, headers: corsHeaders() },
    );
  }
}
