import { describe, it, expect } from "vitest";
import { extractDeadline, stripHtml, plausibleDeadline } from "./deadline";

// Dates in these tests are generated relative to "now" so the plausibility
// window (−60d … +550d) always contains them, whenever the suite runs.
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function future(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function longDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; // "January 15, 2026"
}

const d90 = future(90);

describe("extractDeadline", () => {
  it('finds "apply by Month D, YYYY"', () => {
    expect(extractDeadline(`Great role. Apply by ${longDate(d90)} for consideration.`)).toBe(iso(d90));
  });

  it('finds "application deadline: YYYY-MM-DD"', () => {
    expect(extractDeadline(`Application deadline: ${iso(d90)}.`)).toBe(iso(d90));
  });

  it('finds "applications close" with "D Month YYYY"', () => {
    const s = `${d90.getDate()} ${MONTHS[d90.getMonth()]} ${d90.getFullYear()}`;
    expect(extractDeadline(`Applications close on ${s}.`)).toBe(iso(d90));
  });

  it('finds US "M/D/YYYY" after a trigger', () => {
    const s = `${d90.getMonth() + 1}/${d90.getDate()}/${d90.getFullYear()}`;
    expect(extractDeadline(`Posting closes ${s}`)).toBe(iso(d90));
  });

  it("ignores dates with NO trigger phrase nearby", () => {
    expect(extractDeadline(`The program starts ${longDate(d90)} and runs 12 weeks.`)).toBe(null);
  });

  it("ignores a date too far from the trigger (outside the 90-char window)", () => {
    const pad = "x".repeat(120);
    expect(extractDeadline(`Apply by ${pad} ${longDate(d90)}`)).toBe(null);
  });

  it("skips an implausible date but keeps scanning for a later trigger", () => {
    const text = `Applications close December 31, 2099. Second posting: apply by ${longDate(d90)}.`;
    expect(extractDeadline(text)).toBe(iso(d90));
  });

  it("returns null for empty text", () => {
    expect(extractDeadline("")).toBe(null);
  });

  it("handles ordinal day suffixes", () => {
    const s = `${MONTHS[d90.getMonth()]} ${d90.getDate()}th, ${d90.getFullYear()}`;
    expect(extractDeadline(`Deadline to apply: ${s}`)).toBe(iso(d90));
  });

  it("resolves a yearless 'Month D' to the next occurrence", () => {
    const s = `${MONTHS[d90.getMonth()]} ${d90.getDate()}`;
    const got = extractDeadline(`Apply before ${s}.`);
    expect(got).toBe(iso(d90));
  });
});

describe("plausibleDeadline", () => {
  it("accepts a near-future date", () => expect(plausibleDeadline(iso(future(30)))).toBe(true));
  it("accepts a recently past date (still actionable as overdue)", () =>
    expect(plausibleDeadline(iso(future(-30)))).toBe(true));
  it("rejects far-past dates", () => expect(plausibleDeadline(iso(future(-120)))).toBe(false));
  it("rejects placeholder far-future dates (2099-12-31)", () => expect(plausibleDeadline("2099-12-31")).toBe(false));
  it("rejects garbage", () => expect(plausibleDeadline("not-a-date")).toBe(false));
});

describe("stripHtml", () => {
  it("drops tags, scripts, and styles; collapses whitespace", () => {
    const html = `<html><style>.x{color:red}</style><script>alert(1)</script>
      <p>Apply   by <b>March 1, 2026</b></p></html>`;
    expect(stripHtml(html)).toBe("Apply by March 1, 2026");
  });
  it("decodes the entities the extractor cares about", () => {
    expect(stripHtml("Q&amp;A&nbsp;session")).toBe("Q&A session");
  });
});
