import { describe, it, expect } from "vitest";
import { parseCapture } from "./capture";

describe("parseCapture", () => {
  it("parses the Greenhouse title pattern", () => {
    const r = parseCapture("Job Application for Software Intern at Acme Robotics", "boards.greenhouse.io");
    expect(r).toEqual({ title: "Software Intern", company: "Acme Robotics" });
  });

  it("splits generic 'Title - Company' separators and strips noise words", () => {
    const r = parseCapture("QA Engineer Intern - Dorado Careers", "dorado.com");
    expect(r.title).toBe("QA Engineer Intern");
    expect(r.company).toBe("Dorado");
  });

  it("handles 'Company | Title' order via role-word detection", () => {
    const r = parseCapture("Protelo | Backend Developer Intern", "protelo.com");
    expect(r.title).toBe("Backend Developer Intern");
    expect(r.company).toBe("Protelo");
  });

  it("prefers the user's selection as the title", () => {
    const r = parseCapture("Careers - Acme", "acme.com", "Junior Data Analyst");
    expect(r.title).toBe("Junior Data Analyst");
  });

  it("falls back to the host for the company when the title has none", () => {
    const r = parseCapture("Software Intern", "www.ansync.com");
    expect(r.company).toBe("Ansync");
  });

  it("does NOT derive a company from ATS vendor hosts", () => {
    const r = parseCapture("Software Intern", "acme.myworkdayjobs.com");
    expect(r.company).toBe("");
  });

  it("clamps absurdly long titles", () => {
    const r = parseCapture("x".repeat(1000), "acme.com");
    expect(r.title.length).toBeLessThanOrEqual(300);
  });
});
