import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { safeUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["interested", "preparing", "applied", "interview", "offer", "rejected", "withdrawn", "closed"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const b = await req.json().catch(() => ({}));

  const supabase = createServerClient();
  const { data: current } = await supabase
    .from("opportunities")
    .select("applied_at")
    .eq("id", params.id)
    .single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, any> = { last_activity_at: new Date().toISOString() };

  if (typeof b.status === "string") {
    if (!STATUSES.includes(b.status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
    update.status = b.status;
    // First time it moves to applied, stamp the date; don't overwrite it later.
    if (b.status === "applied" && !current.applied_at) update.applied_at = new Date().toISOString();
  }
  if ("priority" in b) update.priority = ["high", "medium", "low"].includes(b.priority) ? b.priority : null;
  if ("deadline_at" in b) {
    update.deadline_at = DATE_RE.test(b.deadline_at || "") ? b.deadline_at : null;
    update.is_rolling = !update.deadline_at;
  }
  if ("window_opens_at" in b) update.window_opens_at = DATE_RE.test(b.window_opens_at || "") ? b.window_opens_at : null;
  if ("source_url" in b) update.source_url = safeUrl(b.source_url);
  if ("work_mode" in b) update.work_mode = ["onsite", "hybrid", "remote"].includes(b.work_mode) ? b.work_mode : null;
  if (typeof b.notes === "string") update.notes = b.notes.slice(0, 5000);

  const { error } = await supabase.from("opportunities").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
