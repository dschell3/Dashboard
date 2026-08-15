import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

// Download the stored resume file (cookie-gated by the middleware).
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("filename, mime_type, content_base64")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) {
    return new Response("No resume on file.", { status: 404 });
  }
  const r = data[0];
  const bytes = Buffer.from(r.content_base64, "base64");
  const safeName = (r.filename || "resume").replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": r.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
