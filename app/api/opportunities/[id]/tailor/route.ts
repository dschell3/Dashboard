import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { safeUrl } from "@/lib/format";
import { stripHtml } from "@/lib/deadline";
import { fetchPostingPage } from "@/lib/fetchGuard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tailors the resume on file to a specific opportunity via the Claude API.
// Job text priority: pasted text (explicit user intent) > description stored
// at import > SSRF-guarded live fetch of the posting page > title/company only.
// Called with plain fetch per the house no-SDK rule (same as Resend).

const SYSTEM_PROMPT = `You are an expert resume writer helping a college student apply to internships.

You will receive the student's current resume and a job posting. Produce a version of the resume tailored to that posting.

Hard rules — truthfulness is non-negotiable:
- Never invent, add, or exaggerate experience, skills, projects, employers, titles, dates, degrees, or metrics. Every fact in your output must appear in the original resume.
- You may reorder sections and bullets, reword bullets to emphasize genuinely relevant experience, drop less-relevant items, and mirror the posting's terminology where it accurately describes something the student actually did.

Style:
- ATS-friendly: simple structure, standard section headings, no tables or graphics.
- Keep it to roughly one page of content.
- Output the tailored resume as clean Markdown and nothing else — no preamble, no commentary, no explanations of your changes.`;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set ANTHROPIC_API_KEY (Vercel env vars) to enable resume tailoring." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const pastedText = typeof body.job_text === "string" ? body.job_text.trim().slice(0, 30000) : "";

  const supabase = createServerClient();
  const [{ data: opp }, resumeRes] = await Promise.all([
    supabase
      .from("opportunities")
      .select("company_name_raw, title, locations, description, source_url")
      .eq("id", params.id)
      .single(),
    supabase
      .from("resumes")
      .select("filename, mime_type, content_base64, content_text")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resume = resumeRes.data && resumeRes.data[0];
  if (!resume) {
    return NextResponse.json(
      { error: "No resume on file — upload one from the dashboard first." },
      { status: 400 }
    );
  }

  // Resolve the job description.
  let jobText = pastedText || (opp.description ? String(opp.description).slice(0, 30000) : "");
  let jobTextSource = pastedText ? "pasted" : opp.description ? "stored" : "";
  if (!jobText) {
    const url = safeUrl(opp.source_url);
    if (url) {
      const page = await fetchPostingPage(url);
      if (page.text) {
        const stripped = stripHtml(page.text).slice(0, 30000);
        // JS-rendered ATS pages often yield only an app shell — require some substance.
        if (stripped.length > 400) {
          jobText = stripped;
          jobTextSource = "fetched";
        }
      }
    }
  }

  const role = [opp.title, opp.company_name_raw, (opp.locations || [])[0]].filter(Boolean).join(" at ");
  const userText = [
    `Job posting: ${opp.title} — ${opp.company_name_raw || "unknown company"}${(opp.locations || [])[0] ? ` (${(opp.locations || [])[0]})` : ""}.`,
    jobText
      ? `Posting text:\n\n${jobText}`
      : "No posting text is available — tailor using the title and company alone, emphasizing the most relevant parts of the resume for that kind of role.",
    "Tailor the attached resume for this posting, following your rules exactly.",
  ].join("\n\n");

  // Resume goes first as a document (PDF) or text block, then the instructions.
  const resumeBlock =
    resume.mime_type === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: resume.content_base64 },
        }
      : {
          type: "text",
          text: `The student's current resume:\n\n${resume.content_text || Buffer.from(resume.content_base64, "base64").toString("utf8").slice(0, 100000)}`,
        };

  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

  let apiRes: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    apiRes = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        // medium keeps generation inside Vercel's function time limit while
        // staying strong for a rewrite task; thinking stays on (model default).
        output_config: { effort: "medium" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: [resumeBlock, { type: "text", text: userText }] }],
      }),
    }).finally(() => clearTimeout(timer));
  } catch {
    return NextResponse.json({ error: "Could not reach the Claude API — try again." }, { status: 502 });
  }

  if (!apiRes.ok) {
    const detail = (await apiRes.text().catch(() => "")).slice(0, 500);
    console.error("anthropic error:", apiRes.status, detail);
    const friendly =
      apiRes.status === 401
        ? "Claude API key was rejected — check ANTHROPIC_API_KEY."
        : apiRes.status === 429
        ? "Claude API rate limit hit — wait a minute and try again."
        : "Tailoring failed — try again.";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }

  const data = await apiRes.json().catch(() => null);
  if (!data) return NextResponse.json({ error: "Tailoring failed — try again." }, { status: 502 });

  // Check stop_reason BEFORE reading content — a refusal returns HTTP 200.
  if (data.stop_reason === "refusal") {
    return NextResponse.json({ error: "The model declined this request — try again or adjust the posting text." }, { status: 502 });
  }

  const contentMd = (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
  if (!contentMd) return NextResponse.json({ error: "The model returned no resume text — try again." }, { status: 502 });

  const { data: saved, error: saveError } = await supabase
    .from("tailored_resumes")
    .insert({ opportunity_id: params.id, content_md: contentMd, model: data.model || model })
    .select("id, content_md, model, created_at")
    .single();

  if (saveError) {
    console.error("tailored save failed:", saveError.message);
    // Still return the content so the work isn't lost, just unsaved.
    return NextResponse.json({ tailored: { id: null, content_md: contentMd, model, created_at: null }, note: `Generated for ${role} but could not be saved — run migration-003.` });
  }
  return NextResponse.json({ tailored: saved });
}
