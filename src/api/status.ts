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
    const j = (await res.json()) as {
      ok?: boolean;
      players?: number;
      max?: number;
      version?: string;
      testing?: boolean;
      minutesRemaining?: number;
      maxSessionMinutes?: number;
      restartAt?: number;
    };
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

export async function fetchDatabaseOnline(
  restUrl: string,
  apikey: string,
): Promise<boolean> {
  if (!restUrl || !apikey) return false;
  try {
    const res = await fetch(`${restUrl.replace(/\/$/, "")}/items?select=item_id&limit=1`, {
      method: "GET",
      headers: { apikey, Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}
