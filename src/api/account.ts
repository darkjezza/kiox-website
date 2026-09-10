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
  characters: AccountCharacter[];
};

const TOKEN_KEY = "kiox_account_token";
const USER_KEY = "kiox_account_user";

/** Account manager → account API `account`. */
function apiBase(): string {
  const explicit = (import.meta.env.VITE_ACCOUNT_API_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const sb = (import.meta.env.VITE_DATABASE_URL || "").replace(/\/$/, "");
  return sb ? `${sb}/functions/v1/account` : "";
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
  if (!base) throw new Error("VITE_DATABASE_URL (or VITE_ACCOUNT_API_URL) is not set");
  const headers: Record<string, string> = { Accept: "application/json" };
  const publishable =
    import.meta.env.VITE_DATABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_DATABASE_ANON_KEY ||
    "";
  if (publishable) headers.apikey = publishable;
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
    throw new Error(
      "Cannot reach the account API. Deploy functions/account (it is not live on this project yet).",
    );
  }
  const j = await parseJson(res);
  if (res.status === 404 || j.code === "NOT_FOUND") {
    throw new Error(
      "Account API is not deployed. From server/db run: npx supabase functions deploy account --project-ref uigchjsezfccdztlmvkm --no-verify-jwt",
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
