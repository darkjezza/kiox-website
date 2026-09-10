export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 15) return "Username must be at most 15 characters.";
  if (!/^[A-Za-z0-9]+$/.test(u)) return "Username may only use letters and digits.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 3) return "Password must be at least 3 characters.";
  if (password.length > 15) return "Password must be at most 15 characters.";
  if ([...password].some((c) => c.charCodeAt(0) < 32)) return "Password contains invalid characters.";
  return null;
}
