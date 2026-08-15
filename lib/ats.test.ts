import { describe, it, expect } from "vitest";
import { looksSenior, looksInternTitle, externalIdPrefix, type AtsCompany } from "./ats";

describe("looksSenior", () => {
  it.each([
    "Senior Software Engineer",
    "Sr. Staff Engineer",
    "Principal Data Scientist",
    "Engineering Manager",
    "Lead Developer",
    "Director of Engineering",
    "Distinguished Fellow",
    "Solutions Architect",
  ])("flags %s", (t) => expect(looksSenior(t)).toBe(true));

  it.each([
    "Software Engineering Intern",
    "Software Technical Analyst", // Inductive's target role — must survive
    "QA Co-op",
    "Web Developer Intern",
    "Data Engineer",
  ])("passes %s", (t) => expect(looksSenior(t)).toBe(false));
});

describe("looksInternTitle", () => {
  it.each([
    "Software Engineering Intern",
    "Internship - Data Analytics",
    "Hardware Engineering Co-op",
    "Co-Op, Firmware",
    "University Graduate Program",
    "Student Software Developer",
    "Early Career Engineer",
  ])("accepts %s", (t) => expect(looksInternTitle(t)).toBe(true));

  // The reason this exists: Workday's search matches DESCRIPTIONS, so a
  // search for "intern" returns roles that merely mention "internal".
  it.each([
    "Internal Audit Manager",
    "Senior Internal Communications Specialist",
    "Software Engineer",
    "International Sales Rep",
  ])("rejects %s", (t) => expect(looksInternTitle(t)).toBe(false));
});

describe("externalIdPrefix", () => {
  const mk = (ats_type: string, ats_slug: string): AtsCompany => ({ id: "x", name: "X", ats_type, ats_slug });

  it("uses the tenant for workday host/site slugs", () => {
    expect(externalIdPrefix(mk("workday", "hpe.wd5.myworkdayjobs.com/Jobsathpe"))).toBe("ats:workday:hpe:");
  });
  it("uses type:slug for the rest", () => {
    expect(externalIdPrefix(mk("ashby", "inductive-automation-llc"))).toBe("ats:ashby:inductive-automation-llc:");
    expect(externalIdPrefix(mk("smartrecruiters", "Solidigm"))).toBe("ats:smartrecruiters:Solidigm:");
  });
  it("returns null without a slug", () => {
    expect(externalIdPrefix(mk("ashby", ""))).toBe(null);
  });
});
