import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

// The resume on file. Single-slot by design: uploading replaces whatever was
// there. The client sends the file as base64 JSON (files are ≤4MB, so no
// multipart plumbing needed).

const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"];
const MAX_BASE64_CHARS = 6_000_000; // ~4.4MB decoded

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("filename, mime_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);
  // A missing table (migration 003 not run yet) surfaces as an error — treat
  // it the same as "no resume" so the UI can degrade gracefully.
  if (error || !data || data.length === 0) return NextResponse.json({ resume: null });
  return NextResponse.json({ resume: data[0] });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (
    !b ||
    typeof b.filename !== "string" ||
    !b.filename.trim() ||
    typeof b.mime_type !== "string" ||
    typeof b.content_base64 !== "string" ||
    !b.content_base64
  ) {
    return NextResponse.json({ error: "filename, mime_type, and content_base64 are required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(b.mime_type)) {
    return NextResponse.json({ error: "Upload a PDF, .txt, or .md file." }, { status: 400 });
  }
  if (b.content_base64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "File too large — keep the resume under 4MB." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(b.content_base64)) {
    return NextResponse.json({ error: "Invalid file encoding." }, { status: 400 });
  }

  // Text uploads also store the decoded text (sent to the model as plain text).
  let contentText: string | null = null;
  if (b.mime_type !== "application/pdf") {
    try {
      contentText = Buffer.from(b.content_base64, "base64").toString("utf8").slice(0, 100000);
    } catch {
      contentText = null;
    }
  }

  const supabase = createServerClient();
  // Single-slot: clear previous uploads, then insert the new one.
  await supabase.from("resumes").delete().gte("created_at", "1970-01-01");
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      filename: b.filename.trim().slice(0, 200),
      mime_type: b.mime_type,
      content_base64: b.content_base64,
      content_text: contentText,
      updated_at: new Date().toISOString(),
    })
    .select("filename, mime_type, updated_at")
    .single();

  if (error) {
    console.error("resume upload failed:", error.message);
    const hint = /relation|does not exist|schema/i.test(error.message)
      ? "Could not save — run supabase/migration-003-resume.sql in the Supabase SQL editor first."
      : "Could not save the resume.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ resume: data });
}

export async function DELETE() {
  const supabase = createServerClient();
  const { error } = await supabase.from("resumes").delete().gte("created_at", "1970-01-01");
  if (error) {
    console.error("resume delete failed:", error.message);
    return NextResponse.json({ error: "Could not delete the resume." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
