// Shared pieces of the single-user password gate. Used by the middleware and
// the login/logout routes so the token derivation only exists in one place.
//
// The auth cookie is a signed, EXPIRING token: "<expiry-epoch>.<hmac>", where
// the HMAC is keyed off APP_PASSWORD. Unlike the previous static hash, a
// stolen cookie dies when its embedded expiry passes (server-enforced, not
// just the browser's maxAge), and changing APP_PASSWORD still revokes
// everything at once. Web Crypto only — this must run in the edge runtime.

export const AUTH_COOKIE = "dash_auth";
export const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(password: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("internship-dashboard:" + password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// Hash used ONLY to compare a submitted password against APP_PASSWORD in
// constant time (never stored in the cookie).
export async function gateToken(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode("internship-dashboard:" + password));
  return toHex(digest);
}

export async function issueToken(password: string, nowMs: number = Date.now()) {
  const exp = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  return `${exp}.${await hmacHex(password, "auth:" + exp)}`;
}

export async function verifyToken(token: string, password: string, nowMs: number = Date.now()) {
  const dot = token.indexOf(".");
  if (dot <= 0) return false; // includes legacy static-hash cookies
  const expStr = token.slice(0, dot);
  if (!/^\d{1,12}$/.test(expStr)) return false;
  if (Number(expStr) * 1000 <= nowMs) return false; // expired
  const expected = await hmacHex(password, "auth:" + expStr);
  return safeEqual(token.slice(dot + 1), expected);
}

// Constant-time comparison (for equal-length strings).
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
