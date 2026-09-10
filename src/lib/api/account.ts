export type AccountCharacter = {
  name: string;
  level: number;
  str: number;
  agi: number;
  int: number;
  stats: number;
  gold: number;
  xp: number;
  maxXp: number;
  rank: number;
  karma: number;
  clan: string;
  supporter: boolean;
};

export type AccountMe = {
  username: string;
  koin: number;
  characters: AccountCharacter[];
};

const TOKEN_KEY = "kiox_account_token";
const USER_KEY = "kiox_account_user";
const DEFAULT_CONVEX_SITE = "https://rightful-rabbit-478.convex.site";

/** Account manager → Convex HTTP `/account` (https://dashboard.convex.dev). */
function apiBase(): string {
  const explicit = (import.meta.env.VITE_ACCOUNT_API_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const site = (import.meta.env.VITE_CONVEX_SITE_URL || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
  return site ? `${site}/account` : "";
}

export function getAccountToken(): string {
  return sessionStorage.getItem(TOKEN_KEY)?.trim() || "";
}

export function getAccountUsername(): string {
  return sessionStorage.getItem(USER_KEY)?.trim() || "";
}

export function setAccountSession(token: string, username: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, username.trim());
}

export function clearAccountSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function api(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<Record<string, unknown>> {
  const base = apiBase();
  if (!base) throw new Error("VITE_CONVEX_SITE_URL (or VITE_ACCOUNT_API_URL) is not set");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const token = getAccountToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the Convex account API. Check VITE_CONVEX_SITE_URL / deploy.");
  }
  const j = await parseJson(res);
  if (res.status === 404 || j.code === "NOT_FOUND") {
    throw new Error(
      "Account API route missing. Deploy Convex HTTP from server/: npx convex deploy",
    );
  }
  if (!res.ok || j.ok === false) {
    const msg =
      (typeof j.error === "string" && j.error) ||
      (typeof j.message === "string" && j.message) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return j;
}

export async function accountLogin(username: string, password: string): Promise<AccountMe> {
  const j = await api("/login", {
    method: "POST",
    auth: false,
    body: { username, password },
  });
  setAccountSession(String(j.token || ""), String(j.username || username));
  return accountMe();
}

export async function accountRegister(username: string, password: string): Promise<AccountMe> {
  const j = await api("/register", {
    method: "POST",
    auth: false,
    body: { username, password },
  });
  setAccountSession(String(j.token || ""), String(j.username || username));
  return accountMe();
}

export async function accountLogout(): Promise<void> {
  try {
    await api("/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  clearAccountSession();
}

export async function accountMe(): Promise<AccountMe> {
  const j = await api("/me");
  const characters = Array.isArray(j.characters) ? (j.characters as AccountCharacter[]) : [];
  return {
    username: String(j.username || getAccountUsername()),
    koin: typeof j.koin === "number" ? Math.max(0, Math.floor(j.koin)) : 0,
    characters,
  };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api("/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function renameAccount(newUsername: string, password: string): Promise<string> {
  const j = await api("/rename", {
    method: "POST",
    body: { newUsername, password },
  });
  const name = String(j.username || newUsername);
  sessionStorage.setItem(USER_KEY, name);
  return name;
}

export async function renameCharacter(charName: string, newName: string): Promise<string> {
  const j = await api("/character/rename", {
    method: "POST",
    body: { charName, newName },
  });
  return String(j.name || newName);
}

export async function deleteCharacter(charName: string): Promise<void> {
  await api("/character/delete", {
    method: "POST",
    body: { charName },
  });
}

export type KoinShopItem = {
  sku: string;
  itemId: number;
  koinCost: number;
  name: string;
  invo: string;
};

export type KoinShopPayload = {
  username: string;
  koin: number;
  items: KoinShopItem[];
  characters: { name: string; level: number }[];
};

export async function fetchKoinShop(): Promise<KoinShopPayload> {
  const j = await api("/shop");
  const items = Array.isArray(j.items)
    ? (j.items as Record<string, unknown>[]).map((raw) => ({
        sku: String(raw.sku || ""),
        itemId: Number(raw.itemId) || 0,
        koinCost: Number(raw.koinCost) || 0,
        name: String(raw.name || ""),
        invo: String(raw.invo || ""),
      }))
    : [];
  const characters = Array.isArray(j.characters)
    ? (j.characters as Record<string, unknown>[]).map((raw) => ({
        name: String(raw.name || ""),
        level: Number(raw.level) || 1,
      }))
    : [];
  return {
    username: String(j.username || getAccountUsername()),
    koin: typeof j.koin === "number" ? Math.max(0, Math.floor(j.koin)) : 0,
    items,
    characters,
  };
}

export async function buyKoinShop(sku: string, charName: string): Promise<{ koin: number; itemId: number; name: string }> {
  const j = await api("/shop/buy", {
    method: "POST",
    body: { sku, charName },
  });
  return {
    koin: typeof j.koin === "number" ? Math.max(0, Math.floor(j.koin)) : 0,
    itemId: typeof j.itemId === "number" ? j.itemId : 0,
    name: String(j.name || ""),
  };
}
