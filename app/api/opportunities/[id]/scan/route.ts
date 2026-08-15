import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { safeUrl } from "@/lib/format";
import { fetchPostingPage } from "@/lib/fetchGuard";
import { extractDeadline, stripHtml, plausibleDeadline } from "@/lib/deadline";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fetches the saved posting page and scans it for a stated deadline. The
// SSRF guards (host checks, no redirects, timeout over the body, size cap)
// live in lib/fetchGuard.
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

  const page = await fetchPostingPage(url);
  if (page.text === null) {
    const reason = page.reason === "Page redirected."
      ? "Page redirected — open the posting and set the deadline by hand."
      : page.reason;
    return NextResponse.json({ found: null, reason });
  }

  const deadline = extractDeadline(stripHtml(page.text));
  if (!deadline || !plausibleDeadline(deadline)) {
    return NextResponse.json({ found: null, reason: "No stated deadline found — likely rolling." });
  }

  await supabase
    .from("opportunities")
    .update({ deadline_at: deadline, is_rolling: false, last_activity_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ found: deadline });
}
