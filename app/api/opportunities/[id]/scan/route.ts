import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { safeUrl } from "@/lib/format";
import { extractDeadline, stripHtml, plausibleDeadline } from "@/lib/deadline";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side fetch guard: the URL comes from the row's stored source_url
// (already restricted to http/https by safeUrl on write), and this blocks the
// obvious internal targets. Fine for a single-user tool; don't expose this
// pattern on a multi-tenant service without a real SSRF allowlist.
function isFetchableHost(u: URL): boolean {
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

// Fetches the saved posting page and scans it for a stated deadline.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const supabase = createServerClient();
  const { data: opp } = await supabase
    .from("opportunities")
    .select("source_url")
    .eq("id", params.id)
    .single();
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = safeUrl(opp.source_url);
  if (!url) return NextResponse.json({ found: null, reason: "No posting link on this role." });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ found: null, reason: "Bad link." }); }
  if (!isFetchableHost(parsed)) return NextResponse.json({ found: null, reason: "Link host not scannable." });

  let text = "";
  try {
    const ctrl = new AbortController();
    // The timer stays armed through the BODY read, not just the headers —
    // otherwise a slow-drip server can hold the function to maxDuration.
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        cache: "no-store",
        // Don't follow redirects: the SSRF host check above only vetted the
        // ORIGINAL host, and a 3xx could point it at localhost/private ranges.
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (internship-dashboard deadline scan)" },
      });
      if (res.status >= 300 && res.status < 400) {
        return NextResponse.json({ found: null, reason: "Page redirected — open the posting and set the deadline by hand." });
      }
      if (!res.ok) return NextResponse.json({ found: null, reason: `Page returned HTTP ${res.status}.` });
      // Stream with a hard cap so a huge response never buffers fully.
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        const MAX = 500000;
        while (text.length < MAX) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        if (text.length >= MAX) {
          text = text.slice(0, MAX);
          reader.cancel().catch(() => {});
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return NextResponse.json({ found: null, reason: "Could not reach the page." });
  }

  const deadline = extractDeadline(stripHtml(text));
  if (!deadline || !plausibleDeadline(deadline)) {
    return NextResponse.json({ found: null, reason: "No stated deadline found — likely rolling." });
  }

  await supabase
    .from("opportunities")
    .update({ deadline_at: deadline, is_rolling: false, last_activity_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ found: deadline });
}
