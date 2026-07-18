import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ["resume", "cover_letter", "transcript", "essay", "references", "portfolio", "online_assessment", "other"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !UUID_RE.test(b.opportunity_id || "") || typeof b.label !== "string" || !b.label.trim()) {
    return NextResponse.json({ error: "opportunity_id and label are required." }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requirements")
    .insert({
      opportunity_id: b.opportunity_id,
      label: b.label.trim().slice(0, 300),
      type: TYPES.includes(b.type) ? b.type : "other",
      due_at: DATE_RE.test(b.due_at || "") ? b.due_at : null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("requirement insert failed:", error.message);
    return NextResponse.json({ error: "Could not add the task." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
