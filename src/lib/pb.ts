/** Public Convex HTTP catalog (items / guilds). Dashboard: https://dashboard.convex.dev */

const DEFAULT_CONVEX_SITE = "https://rightful-rabbit-478.convex.site";

export function convexSiteUrl(): string {
  const explicit = (import.meta.env.VITE_CONVEX_SITE_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const legacy = (import.meta.env.VITE_DATABASE_URL || "").replace(/\/$/, "");
  if (legacy.includes(".convex.site") || legacy.includes(".convex.cloud")) {
    return legacy.replace(/\.convex\.cloud$/, ".convex.site");
  }
  return DEFAULT_CONVEX_SITE;
}

export type DbItem = {
  id: string;
  item_id: number;
  name: string;
  invo: string;
  worn: string;
  kind: number;
  a: number;
  b: number;
  c: number;
  price: number;
  hit_delay: number;
};

/** Website-facing camelCase item shape (matches prior PocketBase types). */
export type PbItem = {
  id: string;
  itemId: number;
  name: string;
  invo: string;
  worn: string;
  kind: number;
  a: number;
  b: number;
  c: number;
  price: number;
  hitDelay: number;
};

export type PbGuild = {
  id: string;
  tag: string;
  leader: string;
  coLeaders: string[];
  members: string[];
};

async function getJson(path: string): Promise<Record<string, unknown>> {
  const base = convexSiteUrl();
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Convex ${path} failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

export async function fetchItems(): Promise<PbItem[]> {
  const j = await getJson("/items");
  const rows = Array.isArray(j.items) ? j.items : [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r._id || r.id || r.item_id || ""),
      itemId: Number(r.item_id) || 0,
      name: String(r.name || ""),
      invo: String(r.invo || ""),
      worn: String(r.worn || ""),
      kind: Number(r.kind) || 0,
      a: Number(r.a) || 0,
      b: Number(r.b) || 0,
      c: Number(r.c) || 0,
      price: Number(r.price) || 0,
      hitDelay: Number(r.hit_delay) || 0,
    };
  });
}

export async function fetchGuilds(): Promise<PbGuild[]> {
  const j = await getJson("/guilds");
  const rows = Array.isArray(j.guilds) ? j.guilds : [];
  return rows.map((raw) => {
    const g = raw as Record<string, unknown>;
    return {
      id: String(g._id || g.id || g.tag || ""),
      tag: String(g.tag || ""),
      leader: String(g.leader || ""),
      coLeaders: Array.isArray(g.co_leaders) ? (g.co_leaders as string[]) : [],
      members: Array.isArray(g.members) ? (g.members as string[]) : [],
    };
  });
}

/** @deprecated Use convexSiteUrl — kept for home status probe. */
export function databaseRestUrl(): string {
  return convexSiteUrl();
}

/** Convex HTTP needs no publishable key. */
export function databasePublishableKey(): string {
  return "";
}
