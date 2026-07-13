import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

// Reachable two ways, both enforced by the middleware:
//   - signed-in browser (cookie) — visit /api/reminders to test it
//   - Vercel Cron with "Authorization: Bearer $CRON_SECRET"
// Sends nothing unless RESEND_API_KEY and REMINDER_TO are configured.

const ACTIVE = ["interested", "preparing", "applied", "interview"];

const escapeHtml = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export async function GET() {
  const supabase = createServerClient();
  const horizon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("opportunities")
    .select("company_name_raw, title, deadline_at, status")
    .not("deadline_at", "is", null)
    .lte("deadline_at", horizon)
    .in("status", ACTIVE)
    .neq("eligibility_flag", "blocked")
    .order("deadline_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data || [];
  if (items.length === 0) {
    return NextResponse.json({ sent: false, reason: "Nothing due in the next 7 days." });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.REMINDER_TO;
  if (!key || !to) {
    return NextResponse.json({
      sent: false,
      reason: "Set RESEND_API_KEY and REMINDER_TO to enable reminder emails.",
      due: items.length,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const list = items
    .map((o) => {
      const overdue = (o.deadline_at as string) < today;
      return `<li><strong>${escapeHtml(o.company_name_raw || "")}</strong> — ${escapeHtml(o.title)} · due ${o.deadline_at}${overdue ? " <em>(overdue)</em>" : ""} · ${o.status}</li>`;
    })
    .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM || "Internship Dashboard <onboarding@resend.dev>",
      to: [to],
      subject: `Internship deadlines: ${items.length} within 7 days`,
      html: `<p>Coming up on your board:</p><ul>${list}</ul>`,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    return NextResponse.json({ sent: false, error: `Resend: ${detail}` }, { status: 502 });
  }
  return NextResponse.json({ sent: true, count: items.length });
}
