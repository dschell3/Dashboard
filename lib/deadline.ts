// Finds application deadlines stated in posting text. Postings rarely expose a
// structured close date, but many state one in prose — this pairs deadline
// trigger phrases with the nearest date that follows them.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const TRIGGER =
  /(apply (?:by|before|no later than)|application deadline|applications? (?:close|closes|closing|due|are due|will close|accepted (?:until|through)|must be (?:received|submitted) by)|closing date|close date|deadline (?:to apply|for applications?)|deadline is|deadline:|posting closes|open until|closes on|submit(?:ted)? (?:by|before))/gi;

export function stripHtml(html: string): string {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A deadline more than ~60 days past or ~18 months out is almost certainly a
// misparse (or a placeholder like 2099-12-31 in Workday's endDate).
export function plausibleDeadline(iso: string): boolean {
  const t = new Date(iso + "T00:00:00").getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  return t >= now - 60 * 86400000 && t <= now + 550 * 86400000;
}

function parseDateIn(window: string): string | null {
  let m: RegExpMatchArray | null;

  // "January 15, 2026" / "Jan 15 2026" / "Jan. 15th, 2026"
  m = window.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      const d = new Date(Number(m[3]), mo, Number(m[2]));
      const iso = fmt(d);
      if (plausibleDeadline(iso)) return iso;
    }
  }

  // "15 January 2026"
  m = window.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/i);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      const iso = fmt(new Date(Number(m[3]), mo, Number(m[1])));
      if (plausibleDeadline(iso)) return iso;
    }
  }

  // "2026-01-15"
  m = window.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    if (plausibleDeadline(iso)) return iso;
  }

  // "1/15/2026" (US month/day/year)
  m = window.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) {
    const iso = fmt(new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
    if (plausibleDeadline(iso)) return iso;
  }

  // "March 1" with no year — assume the next occurrence. The lookahead
  // requires the day NOT be followed by a year: "December 31, 2099" is a
  // dated (implausible, already-rejected) placeholder, and re-matching it
  // here as yearless would fabricate "December 31 <next year>".
  m = window.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!,?\s+\d{4})/i);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      const now = new Date();
      let d = new Date(now.getFullYear(), mo, Number(m[2]));
      if (d.getTime() < now.getTime() - 7 * 86400000) d = new Date(now.getFullYear() + 1, mo, Number(m[2]));
      const iso = fmt(d);
      if (plausibleDeadline(iso)) return iso;
    }
  }

  return null;
}

// Scans plain text; returns the first deadline stated after a trigger phrase.
export function extractDeadline(text: string): string | null {
  if (!text) return null;
  const t = text.slice(0, 200000);
  TRIGGER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRIGGER.exec(t)) !== null) {
    const idx = m.index + m[0].length;
    const found = parseDateIn(t.slice(idx, idx + 90));
    if (found) return found;
    if (m.index === TRIGGER.lastIndex) TRIGGER.lastIndex++;
  }
  return null;
}
