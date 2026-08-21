import type { Opportunity } from "./types";

export function initials(name: string) {
  const parts = (name || "").replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000);
}

export function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Accepts only real web links. Schemeless input ("solidigm.com/careers") gets
// https:// prefixed; anything that isn't http(s) — javascript:, data:, etc —
// comes back null. Use on every URL that gets stored or rendered as a link.
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type WindowInfo = { text: string; tone: "neutral" | "warning" | "info"; kind: "rolling" | "due" | "opens" };

export function windowInfo(o: Opportunity): WindowInfo {
  if (o.deadline_at) {
    const d = daysUntil(o.deadline_at);
    if (d < 0) return { text: "Overdue", tone: "warning", kind: "due" };
    if (d === 0) return { text: "Due today", tone: "warning", kind: "due" };
    if (d <= 14) return { text: `Due in ${d}d`, tone: "warning", kind: "due" };
    return { text: `Due ${fmtDate(o.deadline_at)}`, tone: "info", kind: "due" };
  }
  if (o.window_opens_at && daysUntil(o.window_opens_at) > 0) {
    return { text: `Opens ${fmtDate(o.window_opens_at)}`, tone: "info", kind: "opens" };
  }
  return { text: "Rolling", tone: "neutral", kind: "rolling" };
}

// Relative age of a posting ("today", "3d ago", then a short date). `recent`
// marks the first week — the window where applying early matters most.
export function postedAgo(iso: string | null): { text: string; recent: boolean } | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return { text: "today", recent: true };
  if (days < 14) return { text: `${days}d ago`, recent: days <= 7 };
  return {
    text: new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    recent: false,
  };
}

export function sourceLabel(s: string | null) {
  if (s === "swelist") return "swelist";
  if (s === "ats") return "company feed";
  return "tracked";
}

export function statusLabel(s: string) {
  if (!s) return "";
  const t = s.replace(/_/g, " "); // "not_relevant" -> "Not relevant"
  return t.charAt(0).toUpperCase() + t.slice(1);
}
