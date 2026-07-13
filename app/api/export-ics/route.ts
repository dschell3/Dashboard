import { createServerClient } from "@/lib/db";

export const dynamic = "force-dynamic";

// Deadlines for roles you're no longer pursuing are noise on a calendar.
const CALENDAR_STATUSES = ["interested", "preparing", "applied", "interview", "offer"];

const esc = (s: string) => (s || "").replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
const toICSDate = (d: string) => d.replace(/-/g, "");

// All-day DTEND is exclusive per RFC 5545, so a one-day event ends the NEXT day.
function nextICSDate(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + 1));
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}${String(t.getUTCDate()).padStart(2, "0")}`;
}

// RFC 5545 line folding: continuation lines start with a space.
function fold(line: string) {
  const out: string[] = [];
  let s = line;
  while (s.length > 73) {
    out.push(s.slice(0, 73));
    s = " " + s.slice(73);
  }
  out.push(s);
  return out.join("\r\n");
}

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("opportunities")
    .select("id, company_name_raw, title, deadline_at, window_opens_at, source_url, status")
    .neq("eligibility_flag", "blocked")
    .in("status", CALENDAR_STATUSES)
    .limit(2000);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Internship Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const o of data || []) {
    const events: { date: string; label: string }[] = [];
    if (o.deadline_at) events.push({ date: o.deadline_at, label: "Deadline" });
    if (o.window_opens_at) events.push({ date: o.window_opens_at, label: "Opens" });
    for (const ev of events) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${o.id}-${ev.label.toLowerCase()}@internship-dashboard`,
        `DTSTAMP:${stamp()}`,
        `DTSTART;VALUE=DATE:${toICSDate(ev.date)}`,
        `DTEND;VALUE=DATE:${nextICSDate(ev.date)}`,
        `SUMMARY:${esc(`${ev.label}: ${o.company_name_raw || ""} — ${o.title}`)}`,
        ...(o.source_url ? [`URL:${o.source_url}`] : []),
        `DESCRIPTION:${esc(`Status: ${o.status}`)}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="internship-deadlines.ics"',
    },
  });
}
