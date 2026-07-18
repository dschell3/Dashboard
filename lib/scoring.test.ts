import { describe, it, expect } from "vitest";
import { containsWord, containsWordExact, matchFocusCompany, scoreListing, type Listing, type Profile } from "./scoring";

// The word-aware matching fixed real false-positive bugs ("Burbank" tripping
// the "bank" exclusion, "Applebees" matching focus company "Apple"). These
// tests pin that behavior down.

describe("containsWord (word-start match)", () => {
  it("matches the exact word", () => expect(containsWord("investment bank analyst", "bank")).toBe(true));
  it("matches word-starts: bank → banking", () => expect(containsWord("retail banking intern", "bank")).toBe(true));
  it("does NOT match mid-word: bank vs Burbank", () => expect(containsWord("Burbank, CA", "bank")).toBe(false));
  it("matches at the start of the string", () => expect(containsWord("bank teller", "bank")).toBe(true));
  it("is case-insensitive", () => expect(containsWord("DEFENSE contractor", "defense")).toBe(true));
  it("ignores empty needles", () => expect(containsWord("anything", "")).toBe(false));
  it("escapes regex metacharacters", () => expect(containsWord("c++ developer", "c++")).toBe(true));
});

describe("containsWordExact (whole-word match)", () => {
  it("matches the standalone word", () => expect(containsWordExact("Apple", "apple")).toBe(true));
  it("matches inside a longer phrase", () => expect(containsWordExact("Apple Inc", "apple")).toBe(true));
  it("does NOT match a longer word: Apple vs Applebees", () => expect(containsWordExact("Applebees", "apple")).toBe(false));
  it("does NOT match Intel vs Intelligent", () => expect(containsWordExact("Intelligent Systems", "intel")).toBe(false));
});

describe("matchFocusCompany", () => {
  const focus = ["hewlett packard enterprise", "apple", "micron"];
  it("exact match", () => expect(matchFocusCompany("Micron", focus)).toBe("micron"));
  it("feed name inside focus name", () => expect(matchFocusCompany("Hewlett Packard", focus)).toBe("hewlett packard enterprise"));
  it("focus name inside feed name", () => expect(matchFocusCompany("Apple Inc", focus)).toBe("apple"));
  it("rejects suffix growth: Applebees", () => expect(matchFocusCompany("Applebees", focus)).toBe(null));
  it("returns null when nothing matches", () => expect(matchFocusCompany("Some Startup", focus)).toBe(null));
});

const baseProfile: Profile = {
  targetLocations: ["Sacramento", "Folsom"],
  remoteOk: true,
  keywords: ["python", "sql", "backend", "software"],
  excludedKeywords: ["defense", "clearance", "bank", "police"],
  focusCompanies: ["solidigm"],
  companyEligibility: { solidigm: "review" },
  weights: {},
};

const baseListing: Listing = {
  externalId: "x1",
  company: "Solidigm",
  title: "Software Engineering Intern",
  locations: ["Rancho Cordova, Sacramento, CA"],
  sponsorship: null,
  season: "Summer 2026",
  datePosted: Math.floor(Date.now() / 1000) - 5 * 86400, // 5 days ago
  url: "https://example.com/job",
  source: "ats",
};

describe("scoreListing", () => {
  it("scores metro + focus + keyword + role + freshness with default weights", () => {
    const r = scoreListing(baseListing, baseProfile);
    // location 30 + focus 25 + keywords 6 (software) + role 12 + fresh 10 = 83
    expect(r.breakdown).toEqual({ location: 30, focus: 25, keywords: 6, role: 12, freshness: 10 });
    expect(r.fitScore).toBe(83);
  });

  it("keeps the stored breakdown consistent with the score", () => {
    const r = scoreListing(baseListing, baseProfile);
    const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
    expect(r.fitScore).toBe(sum);
  });

  it("uses the remote weight when not in metro but remote is ok", () => {
    const r = scoreListing({ ...baseListing, locations: ["Remote"] }, baseProfile);
    expect(r.breakdown.location).toBe(18);
  });

  it("gives no location points for far-away onsite roles", () => {
    const r = scoreListing({ ...baseListing, locations: ["Houston, TX"] }, baseProfile);
    expect(r.breakdown.location).toBe(0);
  });

  it("caps keyword points", () => {
    const r = scoreListing(
      { ...baseListing, title: "Python SQL Backend Software Intern" },
      baseProfile
    );
    expect(r.breakdown.keywords).toBe(24); // 4 hits x 6 = 24, at the cap
  });

  it("honors custom weights from preferences", () => {
    const r = scoreListing(baseListing, { ...baseProfile, weights: { location: 40 } });
    expect(r.breakdown.location).toBe(40);
  });

  it("degrades freshness after 14 days", () => {
    const r = scoreListing(
      { ...baseListing, datePosted: Math.floor(Date.now() / 1000) - 20 * 86400 },
      baseProfile
    );
    expect(r.breakdown.freshness).toBe(6);
  });

  it("flags excluded-sector keywords as blocked (word-start)", () => {
    const r = scoreListing({ ...baseListing, company: "First National Banking Corp" }, baseProfile);
    expect(r.eligibility).toBe("blocked");
  });

  it("does NOT block Burbank on the bank exclusion", () => {
    const r = scoreListing({ ...baseListing, company: "Burbank Studios" }, baseProfile);
    expect(r.eligibility).not.toBe("blocked");
  });

  it("applies focus-company eligibility (review)", () => {
    const r = scoreListing(baseListing, baseProfile);
    expect(r.eligibility).toBe("review");
  });

  it("is clear when no exclusion or company eligibility applies", () => {
    const r = scoreListing({ ...baseListing, company: "Some Startup" }, baseProfile);
    expect(r.eligibility).toBe("clear");
  });
});
