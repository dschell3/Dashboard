import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const supabase = createServerClient();
  const { error } = await supabase.from("tailored_resumes").delete().eq("id", params.id);
  if (error) {
    console.error("tailored delete failed:", error.message);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
