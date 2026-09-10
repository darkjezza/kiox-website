import {
  accountLogin,
  accountLogout,
  accountMe,
  accountRegister,
  changePassword,
  clearAccountSession,
  deleteCharacter,
  getAccountToken,
  renameAccount,
  renameCharacter,
  type AccountCharacter,
  type AccountMe,
} from "./api/account";
import { validatePassword, validateUsername } from "./authLaunch";
import { el, HOME_URL, PLAY_URL, SHOP_URL, topBarHtml } from "./siteChrome";

type GateTab = "login" | "register";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function showFlash(host: HTMLElement, kind: "error" | "success" | "warn", msg: string): void {
  host.replaceChildren();
  if (!msg) return;
  const cls =
    kind === "error" ? "play-alert play-alert--err" : kind === "success" ? "play-success" : "play-alert play-alert--warn";
  host.append(el("p", cls, msg));
}

function shell(): HTMLElement {
  const root = el("div", "site");
  root.innerHTML = `
    <div class="bg-grid" aria-hidden="true"></div>
    ${topBarHtml("account")}
    <main class="account-main">
      <div class="account-wrap account-wrap--wide" id="account-root"></div>
    </main>
  `;
  return root;
}

function renderGate(root: HTMLElement, tab: GateTab, flash?: { kind: "error" | "success"; msg: string }): void {
  root.innerHTML = `
    <p class="eyebrow">Account</p>
    <h1>Account manager</h1>
    <p class="lede account-lede">Log in or register to manage your account and characters. Needs the database only — the game server is not required. Playing is separate on the play page.</p>
    <div id="account-flash"></div>
    <div class="account-tabs" role="tablist">
      <button type="button" class="account-tab ${tab === "login" ? "account-tab--active" : ""}" data-tab="login">Log in</button>
      <button type="button" class="account-tab ${tab === "register" ? "account-tab--active" : ""}" data-tab="register">Register</button>
    </div>
    <section class="play-card account-panel" data-panel="login" ${tab === "login" ? "" : "hidden"}>
      <h2>Log in</h2>
      <p class="play-card-hint muted">Opens your account manager — does not launch the game.</p>
      <form id="login-form">
        <label class="account-label" for="login-user">Username</label>
        <input class="play-input" id="login-user" maxlength="15" autocomplete="username" required />
        <label class="account-label" for="login-pass">Password</label>
        <input class="play-input" id="login-pass" type="password" maxlength="15" autocomplete="current-password" required />
        <button class="btn btn--primary" type="submit">Log in</button>
      </form>
    </section>
    <section class="play-card account-panel" data-panel="register" ${tab === "register" ? "" : "hidden"}>
      <h2>Register</h2>
      <p class="play-card-hint muted">Creates an account, then opens the manager.</p>
      <form id="register-form">
        <label class="account-label" for="reg-user">Username</label>
        <input class="play-input" id="reg-user" maxlength="15" autocomplete="username" required />
        <label class="account-label" for="reg-pass">Password</label>
        <input class="play-input" id="reg-pass" type="password" maxlength="15" autocomplete="new-password" required />
        <label class="account-label" for="reg-pass2">Confirm password</label>
        <input class="play-input" id="reg-pass2" type="password" maxlength="15" autocomplete="new-password" required />
        <button class="btn btn--primary" type="submit">Create account</button>
      </form>
    </section>
    <p class="play-foot muted"><a href="${PLAY_URL}">Open play page</a> · <a href="${HOME_URL}">Back home</a></p>
  `;

  const flashHost = root.querySelector("#account-flash") as HTMLElement;
  if (flash) showFlash(flashHost, flash.kind, flash.msg);

  root.querySelectorAll<HTMLButtonElement>(".account-tab").forEach((btn) => {
    btn.addEventListener("click", () => renderGate(root, (btn.dataset.tab as GateTab) || "login"));
  });

  root.querySelector("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = (root.querySelector("#login-user") as HTMLInputElement).value;
    const pass = (root.querySelector("#login-pass") as HTMLInputElement).value;
    const uErr = validateUsername(user);
    const pErr = validatePassword(pass);
    if (uErr || pErr) {
      showFlash(flashHost, "error", uErr || pErr || "Invalid input.");
      return;
    }
    try {
      const me = await accountLogin(user, pass);
      renderManager(root, me);
    } catch (err) {
      showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
    }
  });

  root.querySelector("#register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = (root.querySelector("#reg-user") as HTMLInputElement).value;
    const pass = (root.querySelector("#reg-pass") as HTMLInputElement).value;
    const pass2 = (root.querySelector("#reg-pass2") as HTMLInputElement).value;
    const uErr = validateUsername(user);
    const pErr = validatePassword(pass);
    if (uErr || pErr) {
      showFlash(flashHost, "error", uErr || pErr || "Invalid input.");
      return;
    }
    if (pass !== pass2) {
      showFlash(flashHost, "error", "Passwords do not match.");
      return;
    }
    try {
      const me = await accountRegister(user, pass);
      renderManager(root, me, { kind: "success", msg: "Account created." });
    } catch (err) {
      showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
    }
  });
}

function characterCard(ch: AccountCharacter): string {
  return `
    <article class="char-card" data-char="${escapeAttr(ch.name)}">
      <header class="char-card__head">
        <h3>${escapeAttr(ch.name)}</h3>
        <span class="pill">Lv ${ch.level}</span>
      </header>
      <p class="muted char-card__meta">Gold ${ch.gold} · XP ${ch.xp}/${ch.maxXp} · Clan ${ch.clan || "—"}</p>
      <dl class="char-stats-grid char-stats-grid--readonly">
        <div><dt>STR</dt><dd>${ch.str}</dd></div>
        <div><dt>AGI</dt><dd>${ch.agi}</dd></div>
        <div><dt>INT</dt><dd>${ch.int}</dd></div>
        <div><dt>Unspent</dt><dd>${ch.stats}</dd></div>
      </dl>
      <div class="char-rename">
        <label class="account-label" for="rename-${escapeAttr(ch.name)}">Rename character</label>
        <input class="play-input" id="rename-${escapeAttr(ch.name)}" data-rename maxlength="15" value="${escapeAttr(ch.name)}" />
      </div>
      <div class="play-actions">
        <button type="button" class="btn btn--ghost" data-action="rename-char">Rename</button>
        <button type="button" class="btn btn--ghost btn--danger" data-action="delete-char">Delete</button>
      </div>
    </article>
  `;
}

function renderManager(
  root: HTMLElement,
  me: AccountMe,
  flash?: { kind: "error" | "success"; msg: string },
): void {
  root.innerHTML = `
    <p class="eyebrow">Account manager</p>
    <h1>${escapeAttr(me.username)}</h1>
    <p class="lede account-lede">Account-bound <strong>Koin ${me.koin}</strong> · Spend it in the <a href="${SHOP_URL}">Koin Shop</a> · Use <a href="${PLAY_URL}">Play</a> to enter the game.</p>
    <div id="account-flash"></div>
    <div class="account-manager-grid">
      <section class="play-card">
        <h2>Account</h2>
        <form id="rename-account-form">
          <label class="account-label" for="new-user">Change account name</label>
          <input class="play-input" id="new-user" maxlength="15" value="${escapeAttr(me.username)}" required />
          <label class="account-label" for="rename-pass">Confirm password</label>
          <input class="play-input" id="rename-pass" type="password" maxlength="15" required />
          <button class="btn btn--primary" type="submit">Save account name</button>
        </form>
        <hr class="account-hr" />
        <form id="password-form">
          <label class="account-label" for="cur-pass">Current password</label>
          <input class="play-input" id="cur-pass" type="password" maxlength="15" required />
          <label class="account-label" for="new-pass">New password</label>
          <input class="play-input" id="new-pass" type="password" maxlength="15" required />
          <label class="account-label" for="new-pass2">Confirm new password</label>
          <input class="play-input" id="new-pass2" type="password" maxlength="15" required />
          <button class="btn btn--primary" type="submit">Change password</button>
        </form>
        <div class="play-actions" style="margin-top:1rem">
          <button type="button" class="btn btn--ghost" id="logout-btn">Log out</button>
          <a class="btn btn--ghost" href="${SHOP_URL}">Koin Shop</a>
          <a class="btn btn--primary" href="${PLAY_URL}">Open play page</a>
        </div>
      </section>
      <section class="play-card">
        <h2>Characters</h2>
        <p class="play-card-hint muted">${me.characters.length} / 3 characters</p>
        <div class="char-list" id="char-list">
          ${
            me.characters.length
              ? me.characters.map(characterCard).join("")
              : `<p class="muted">No characters yet. Create one in-game after logging in on the play page.</p>`
          }
        </div>
      </section>
    </div>
  `;

  const flashHost = root.querySelector("#account-flash") as HTMLElement;
  if (flash) showFlash(flashHost, flash.kind, flash.msg);

  const refresh = async (msg?: string) => {
    const next = await accountMe();
    renderManager(root, next, msg ? { kind: "success", msg } : undefined);
  };

  root.querySelector("#logout-btn")?.addEventListener("click", async () => {
    await accountLogout();
    renderGate(root, "login", { kind: "success", msg: "Logged out." });
  });

  root.querySelector("#rename-account-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newUsername = (root.querySelector("#new-user") as HTMLInputElement).value;
    const password = (root.querySelector("#rename-pass") as HTMLInputElement).value;
    const uErr = validateUsername(newUsername);
    if (uErr) {
      showFlash(flashHost, "error", uErr);
      return;
    }
    try {
      await renameAccount(newUsername, password);
      await refresh("Account name updated.");
    } catch (err) {
      showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
    }
  });

  root.querySelector("#password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = (root.querySelector("#cur-pass") as HTMLInputElement).value;
    const newPassword = (root.querySelector("#new-pass") as HTMLInputElement).value;
    const newPassword2 = (root.querySelector("#new-pass2") as HTMLInputElement).value;
    const pErr = validatePassword(newPassword);
    if (pErr) {
      showFlash(flashHost, "error", pErr);
      return;
    }
    if (newPassword !== newPassword2) {
      showFlash(flashHost, "error", "New passwords do not match.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      (root.querySelector("#password-form") as HTMLFormElement).reset();
      showFlash(flashHost, "success", "Password changed.");
    } catch (err) {
      showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
    }
  });

  root.querySelectorAll<HTMLElement>(".char-card").forEach((card) => {
    const charName = card.dataset.char || "";
    card.querySelector('[data-action="rename-char"]')?.addEventListener("click", async () => {
      const newName = (card.querySelector("[data-rename]") as HTMLInputElement).value.trim();
      try {
        await renameCharacter(charName, newName);
        await refresh(`Renamed to ${newName}.`);
      } catch (err) {
        showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
      }
    });
    card.querySelector('[data-action="delete-char"]')?.addEventListener("click", async () => {
      if (!confirm(`Delete character "${charName}"? This cannot be undone.`)) return;
      try {
        await deleteCharacter(charName);
        await refresh(`Deleted ${charName}.`);
      } catch (err) {
        showFlash(flashHost, "error", String(err instanceof Error ? err.message : err));
      }
    });
  });
}

export async function boot(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(shell());
  const root = document.getElementById("account-root")!;

  if (getAccountToken()) {
    try {
      const me = await accountMe();
      renderManager(root, me);
      return;
    } catch {
      clearAccountSession();
    }
  }
  renderGate(root, "login");
}
