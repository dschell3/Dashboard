// Transparent, rule-based fit scoring. Every component is in the breakdown so a
// score can always be explained. Tune the weights in the preferences table.

export type Listing = {
  externalId: string;
  company: string;
  title: string;
  locations: string[];
  sponsorship: string | null;
  season: string | null;
  datePosted: number | null; // unix seconds
  url: string;
  source: string;
  description?: string | null; // posting text when the board API includes it
  detailRef?: string | null;   // id/path for a per-posting detail fetch
};

export type Profile = {
  targetLocations: string[];
  remoteOk: boolean;
  keywords: string[];
  excludedKeywords: string[];
  focusCompanies: string[];
  companyEligibility: Record<string, "clear" | "review">;
  weights: Record<string, number>;
};

export type ScoreResult = {
  fitScore: number;
  eligibility: "clear" | "review" | "blocked";
  breakdown: Record<string, number>;
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  location: 30, remote: 18, focus: 25,
  keyword_each: 6, keyword_cap: 24, role: 12,
  fresh_14d: 10, fresh_30d: 6,
};

const norm = (s: string) => (s || "").toLowerCase().trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Word-START match: the term must begin at a word boundary but may extend, so
// "bank" hits "bank"/"banking" but NOT "Burbank", and "test" hits "testing".
// Right for skill keywords and exclusion terms (broader net = safer exclusions).
export function containsWord(haystack: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  try {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(n)}`).test(norm(haystack));
  } catch {
    return norm(haystack).includes(n);
  }
}

// Whole-word match: bounded on BOTH sides, so "Apple" matches "Apple" and
// "Apple Inc" but not "Applebees", and "Intel" won't match "Intelligent Systems".
// Right for company-name matching, where suffix growth means a different company.
export function containsWordExact(haystack: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  try {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(n)}([^a-z0-9]|$)`).test(norm(haystack));
  } catch {
    return norm(haystack) === n;
  }
}

// Returns the focus-company key a listing's company matches, or null.
// Matches either direction on whole-word boundaries: feed "Hewlett Packard"
// matches focus "Hewlett Packard Enterprise", and feed "Apple Inc" matches
// focus "Apple" — but "Applebees" matches nothing.
export function matchFocusCompany(companyName: string, focusCompanies: string[]): string | null {
  const c = norm(companyName);
  if (!c) return null;
  for (const f of focusCompanies) {
    if (!f) continue;
    if (c === f || containsWordExact(c, f) || containsWordExact(f, c)) return f;
  }
  return null;
}

export function scoreListing(listing: Listing, profile: Profile): ScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...(profile.weights || {}) };
  const breakdown: Record<string, number> = {};
  const title = norm(listing.title);
  const locs = (listing.locations || []).map(norm);

  // Location
  let loc = 0;
  const metro = locs.some((l) => profile.targetLocations.some((t) => l.includes(norm(t))));
  const remote = locs.some((l) => l.includes("remote"));
  if (metro) loc = w.location;
  else if (remote && profile.remoteOk) loc = w.remote;
  breakdown.location = loc;

  // Focus company (whole-word so "Applebees" can't match "Apple")
  const focusMatch = matchFocusCompany(listing.company, profile.focusCompanies);
  breakdown.focus = focusMatch ? w.focus : 0;

  // Keywords (word-start, in the title)
  let kw = 0;
  for (const k of profile.keywords) if (containsWord(title, k)) kw += w.keyword_each;
  kw = Math.min(kw, w.keyword_cap);
  breakdown.keywords = kw;

  // Role type
  const role = (title.includes("intern") || title.includes("co-op") || title.includes("coop")) ? w.role : 0;
  breakdown.role = role;

  // Freshness
  let fresh = 0;
  if (listing.datePosted) {
    const days = (Date.now() / 1000 - listing.datePosted) / 86400;
    if (days <= 14) fresh = w.fresh_14d;
    else if (days <= 30) fresh = w.fresh_30d;
  }
  breakdown.freshness = fresh;

  const fitScore = Math.max(0, Math.min(100, Math.round(loc + breakdown.focus + kw + role + fresh)));

  // Eligibility (word-start so "bank" can't hit "Burbank" but does hit "banking")
  const text = listing.company + " " + listing.title;
  let eligibility: "clear" | "review" | "blocked" = "clear";
  if (profile.excludedKeywords.some((e) => containsWord(text, e))) {
    eligibility = "blocked";
  } else if (focusMatch && profile.companyEligibility[focusMatch]) {
    eligibility = profile.companyEligibility[focusMatch];
  }

  return { fitScore, eligibility, breakdown };
}
