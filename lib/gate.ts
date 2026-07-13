// Shared pieces of the single-user password gate. Used by the middleware and
// the login/logout routes so the token derivation only exists in one place.

export const AUTH_COOKIE = "dash_auth";

export async function gateToken(password: string) {
  const data = new TextEncoder().encode("internship-dashboard:" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time comparison (for equal-length strings).
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
