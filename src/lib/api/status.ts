export type ServerStatus = {
  online: boolean;
  players: number | null;
  max: number | null;
  version: string;
  testing: boolean;
  minutesRemaining: number | null;
  maxSessionMinutes: number | null;
  restartAt: number | null;
  /** HTTP round-trip to status endpoint (ms). */
  pingMs: number | null;
};

export async function fetchServerStatus(baseUrl: string): Promise<ServerStatus> {
  const url = baseUrl.replace(/\/$/, "") || "/game-status";
  const offline: ServerStatus = {
    online: false,
    players: null,
    max: null,
    version: "—",
    testing: false,
    minutesRemaining: null,
    maxSessionMinutes: null,
    restartAt: null,
    pingMs: null,
  };
  try {
    const t0 = performance.now();
    const res = await fetch(url, { method: "GET" });
    const pingMs = Math.max(0, Math.round(performance.now() - t0));
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    // Nakama root health is HTTP 200 with an empty (or non-JSON) body.
    if (!text.trim()) {
      return {
        ...offline,
        online: true,
        version: "nakama",
        pingMs,
      };
    }
    let j: {
      ok?: boolean;
      players?: number;
      max?: number;
      version?: string;
      testing?: boolean;
      minutesRemaining?: number;
      maxSessionMinutes?: number;
      restartAt?: number;
    };
    try {
      j = JSON.parse(text) as typeof j;
    } catch {
      return {
        ...offline,
        online: true,
        version: "nakama",
        pingMs,
      };
    }
    return {
      online: j.ok === true,
      players: typeof j.players === "number" ? j.players : null,
      max: typeof j.max === "number" ? j.max : null,
      version: typeof j.version === "string" ? j.version : "—",
      testing: j.testing === true,
      minutesRemaining: typeof j.minutesRemaining === "number" ? j.minutesRemaining : null,
      maxSessionMinutes: typeof j.maxSessionMinutes === "number" ? j.maxSessionMinutes : null,
      restartAt: typeof j.restartAt === "number" ? j.restartAt : null,
      pingMs,
    };
  } catch {
    return offline;
  }
}

/** Probe Convex HTTP catalog (`GET /items`). `apikey` unused (kept for call-site compat). */
export async function fetchDatabaseOnline(siteUrl: string, _apikey = ""): Promise<boolean> {
  if (!siteUrl) return false;
  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/items`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    const j = (await res.json()) as { ok?: boolean };
    return j.ok === true;
  } catch {
    return false;
  }
}
