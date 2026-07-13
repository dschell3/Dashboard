import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const b = await req.json().catch(() => ({}));

  const update: Record<string, any> = {};
  if (typeof b.is_complete === "boolean") update.is_complete = b.is_complete;
  if (typeof b.label === "string" && b.label.trim()) update.label = b.label.trim().slice(0, 300);
  if ("due_at" in b) update.due_at = DATE_RE.test(b.due_at || "") ? b.due_at : null;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from("requirements").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase.from("requirements").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
