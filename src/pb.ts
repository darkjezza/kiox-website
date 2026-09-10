import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_DATABASE_URL || "").replace(/\/$/, "");
const publishable =
  import.meta.env.VITE_DATABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_DATABASE_ANON_KEY ||
  "";

function isOpaqueKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

export const db =
  url && publishable
    ? createClient(url, publishable, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set("apikey", publishable);
            if (isOpaqueKey(publishable) && headers.get("Authorization") === `Bearer ${publishable}`) {
              headers.delete("Authorization");
            }
            return fetch(input, { ...init, headers });
          },
        },
      })
    : null;

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

function requireClient() {
  if (!db) {
    throw new Error("VITE_DATABASE_URL and VITE_DATABASE_PUBLISHABLE_KEY are required");
  }
  return db;
}

export async function fetchItems(): Promise<PbItem[]> {
  const { data, error } = await requireClient()
    .from("items")
    .select("*")
    .order("item_id", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: String(r.id),
    itemId: Number(r.item_id),
    name: String(r.name || ""),
    invo: String(r.invo || ""),
    worn: String(r.worn || ""),
    kind: Number(r.kind) || 0,
    a: Number(r.a) || 0,
    b: Number(r.b) || 0,
    c: Number(r.c) || 0,
    price: Number(r.price) || 0,
    hitDelay: Number(r.hit_delay) || 0,
  }));
}

export async function fetchGuilds(): Promise<PbGuild[]> {
  const { data, error } = await requireClient()
    .from("guilds")
    .select("*")
    .order("tag", { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => ({
    id: String(g.id),
    tag: String(g.tag || ""),
    leader: String(g.leader || ""),
    coLeaders: Array.isArray(g.co_leaders) ? g.co_leaders : [],
    members: Array.isArray(g.members) ? g.members : [],
  }));
}

export function databaseRestUrl(): string {
  return url ? `${url}/rest/v1` : "";
}

export function databasePublishableKey(): string {
  return publishable;
}
