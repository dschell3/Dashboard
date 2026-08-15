// SSRF-guarded fetch of a stored posting URL, shared by the deadline-scan and
// resume-tailor endpoints. The URL must already have passed safeUrl() on
// write; this adds the network-level guards: no internal hosts, no redirects
// (a 3xx could point somewhere the original-host check never saw), an abort
// timeout that covers the body read, and a hard streamed size cap.
// Known limitation: hostname-based guarding is not DNS-rebinding-proof —
// acceptable for a single-user tool; do not expose this pattern multi-tenant.

export function isFetchableHost(u: URL): boolean {
  const h = u.hostname.toLowerCase();
  if (u.port && u.port !== "80" && u.port !== "443") return false;
  if (h === "localhost" || h === "0.0.0.0" || h.endsWith(".local") || h.includes(":")) return false;
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 127 || a === 10 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) return false;
  }
  return true;
}

export type GuardedFetchResult = { text: string } | { text: null; reason: string };

export async function fetchPostingPage(url: string, maxBytes = 500000): Promise<GuardedFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { text: null, reason: "Bad link." };
  }
  if (!isFetchableHost(parsed)) return { text: null, reason: "Link host not scannable." };

  let text = "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        cache: "no-store",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (internship-dashboard)" },
      });
      if (res.status >= 300 && res.status < 400) {
        return { text: null, reason: "Page redirected." };
      }
      if (!res.ok) return { text: null, reason: `Page returned HTTP ${res.status}.` };
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (text.length < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        if (text.length >= maxBytes) {
          text = text.slice(0, maxBytes);
          reader.cancel().catch(() => {});
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { text: null, reason: "Could not reach the page." };
  }
  return { text };
}
