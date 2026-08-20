// Per-company ATS pullers. Each adapter hits a public, no-auth job-board API
// and normalizes to the same Listing shape the scorer uses.
//
// Supported: greenhouse | lever | ashby | smartrecruiters | workday
// A company is pullable when companies.ats_type is one of those AND
// companies.ats_slug is set. Slug formats:
//   greenhouse       -> board token          (boards-api.greenhouse.io/v1/boards/{slug}/jobs)
//   lever            -> site token           (api.lever.co/v0/postings/{slug})
//   ashby            -> job-board name       (api.ashbyhq.com/posting-api/job-board/{slug})
//   smartrecruiters  -> company identifier   (api.smartrecruiters.com/v1/companies/{slug}/postings)
//   workday          -> "host/site", e.g. "hpe.wd5.myworkdayjobs.com/Jobsathpe"

import type { Listing } from "./scoring";

export type AtsCompany = {
  id: string;
  name: string;
  ats_type: string | null;
  ats_slug: string | null;
};

export const PULLABLE_TYPES = ["greenhouse", "lever", "ashby", "smartrecruiters", "workday"];

export function isPullable(c: AtsCompany) {
  return !!c.ats_slug && !!c.ats_type && PULLABLE_TYPES.includes(c.ats_type);
}

// Some boards (Workday tenants especially) sit behind bot protection that
// rejects requests without a browser-like User-Agent — a bare server fetch
// gets a 403 while the same request from a browser succeeds.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchJson(url: string, init?: RequestInit, ms = 9000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...BROWSER_HEADERS, ...(init?.headers || {}) },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Seniority markers that disqualify a title outright. Full-board scans
// (Ashby) would otherwise import senior roles at focus companies — location
// (30) + focus (25) clears the import threshold on the name alone.
const SENIOR_RE =
  /\b(senior|sr\.?|staff|principal|lead|director|manager|mgr\.?|vp|vice president|head of|chief|distinguished|fellow|architect)\b/i;

export function looksSenior(title: string): boolean {
  return SENIOR_RE.test(title || "");
}

// Intern-shaped titles. Word-bounded so "internal" does NOT match — this
// matters because Workday's searchText matches posting DESCRIPTIONS too, so a
// search for "intern" happily returns "Internal Audit" and senior roles whose
// description mentions "internal teams".
const INTERN_TITLE_RE =
  /\bintern(ship)?s?\b|\bco-?op\b|\bcoop\b|\bstudent\b|\buniversity\b|\bnew grad(uate)?\b|\bearly career\b/i;

export function looksInternTitle(title: string): boolean {
  return INTERN_TITLE_RE.test(title || "");
}

// Prefix shared by every external_id a company's ATS pull can produce —
// used to find rows from PREVIOUS pulls that the current pull no longer
// returned (vanished postings). Mirrors the id formats in the adapters.
export function externalIdPrefix(c: AtsCompany): string | null {
  const slug = (c.ats_slug || "").trim();
  if (!slug || !c.ats_type) return null;
  if (c.ats_type === "workday") {
    const sep = slug.indexOf("/");
    const tenant = (sep >= 0 ? slug.slice(0, sep) : slug).split(".")[0];
    return `ats:workday:${tenant}:`;
  }
  return `ats:${c.ats_type}:${slug}:`;
}

const iso = (s: any): number | null => {
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
};

// Workday only reports relative dates ("Posted 3 Days Ago").
function postedOnToUnix(s?: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  if (t.includes("today")) return now;
  if (t.includes("yesterday")) return now - 86400;
  const m = t.match(/(\d+)\+?\s*day/);
  if (m) return now - Number(m[1]) * 86400;
  return null;
}

function mk(partial: Omit<Listing, "season" | "sponsorship" | "source">): Listing {
  return { ...partial, season: "Summer 2027", sponsorship: null, source: "ats" };
}

async function fromGreenhouse(company: string, slug: string): Promise<Listing[]> {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);
  return (data.jobs || []).map((j: any) =>
    mk({
      externalId: `ats:greenhouse:${slug}:${j.id}`,
      company,
      title: j.title || "",
      locations: j.location?.name ? [j.location.name] : [],
      datePosted: iso(j.updated_at),
      url: j.absolute_url || "",
      description: j.content || null,
    })
  );
}

async function fromLever(company: string, slug: string): Promise<Listing[]> {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);
  return (Array.isArray(data) ? data : []).map((j: any) =>
    mk({
      externalId: `ats:lever:${slug}:${j.id}`,
      company,
      title: j.text || "",
      locations: [j.categories?.location, j.workplaceType === "remote" ? "Remote" : null].filter(Boolean) as string[],
      datePosted: j.createdAt ? Math.floor(j.createdAt / 1000) : null,
      url: j.hostedUrl || "",
      description: [j.descriptionPlain, j.additionalPlain, ...(j.lists || []).map((x: any) => x.content)]
        .filter(Boolean)
        .join(" ") || null,
    })
  );
}

async function fromAshby(company: string, slug: string): Promise<Listing[]> {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`);
  return (data.jobs || [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) =>
      mk({
        externalId: `ats:ashby:${slug}:${j.id || j.jobUrl}`,
        company,
        title: j.title || "",
        locations: [j.location, ...(j.secondaryLocations || []).map((s: any) => s.location)].filter(Boolean),
        datePosted: iso(j.publishedAt),
        url: j.jobUrl || j.applyUrl || "",
        description: j.descriptionHtml || j.descriptionPlain || null,
      })
    );
}

async function fromSmartRecruiters(company: string, slug: string): Promise<Listing[]> {
  const data = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100`);
  return (data.content || []).map((j: any) => {
    const loc = [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(", ");
    const locations = [loc, j.location?.remote ? "Remote" : null].filter(Boolean) as string[];
    return mk({
      externalId: `ats:smartrecruiters:${slug}:${j.id}`,
      company,
      title: j.name || "",
      locations,
      datePosted: iso(j.releasedDate),
      url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
      detailRef: j.id ? String(j.id) : null,
    });
  });
}

async function fromWorkday(company: string, slug: string): Promise<Listing[]> {
  const sep = slug.indexOf("/");
  if (sep < 0) throw new Error('workday slug must be "host/site"');
  const host = slug.slice(0, sep);
  const site = slug.slice(sep + 1);
  const tenant = host.split(".")[0];
  // Workday boards are huge, so ask its search for intern roles server-side.
  // The CXS jobs endpoint rejects limit > 20 with HTTP 400 (this broke all
  // three boards when we tried limit 50), so page through at 20 — capped at
  // 3 pages per board to keep the request volume deliberate.
  const postings: any[] = [];
  for (let offset = 0; offset < 60; offset += 20) {
    const data = await fetchJson(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: "intern" }),
    });
    const page = data.jobPostings || [];
    postings.push(...page);
    if (page.length < 20) break;
  }
  return postings
    // The search matches descriptions too ("internal…"), so require an
    // intern-shaped TITLE before trusting a Workday result.
    .filter((j: any) => looksInternTitle(j.title || ""))
    .map((j: any) =>
      mk({
        externalId: `ats:workday:${tenant}:${(j.bulletFields && j.bulletFields[0]) || j.externalPath}`,
        company,
        title: j.title || "",
        locations: j.locationsText ? [j.locationsText] : [],
        datePosted: postedOnToUnix(j.postedOn),
        url: j.externalPath ? `https://${host}/en-US/${site}${j.externalPath}` : "",
        detailRef: j.externalPath || null,
      })
    );
}

export async function fetchCompanyListings(c: AtsCompany): Promise<Listing[]> {
  const slug = (c.ats_slug || "").trim();
  switch (c.ats_type) {
    case "greenhouse": return fromGreenhouse(c.name, slug);
    case "lever": return fromLever(c.name, slug);
    case "ashby": return fromAshby(c.name, slug);
    case "smartrecruiters": return fromSmartRecruiters(c.name, slug);
    case "workday": return fromWorkday(c.name, slug);
    default: return [];
  }
}

export type Enrichment = { description: string | null; deadline: string | null };

// Second-request enrichment for boards whose list payload has no posting text.
// Workday detail responses sometimes include a real endDate — a structured
// deadline, which beats prose scanning when present.
export async function enrichListing(c: AtsCompany, l: Listing): Promise<Enrichment> {
  try {
    if (c.ats_type === "smartrecruiters" && l.detailRef) {
      const d = await fetchJson(
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(c.ats_slug || "")}/postings/${encodeURIComponent(l.detailRef)}`
      );
      const sec = d.jobAd?.sections || {};
      const text = [sec.companyDescription, sec.jobDescription, sec.qualifications, sec.additionalInformation]
        .map((x: any) => x?.text || "")
        .join(" ")
        .trim();
      return { description: text || null, deadline: null };
    }
    if (c.ats_type === "workday" && l.detailRef && c.ats_slug) {
      const sep = c.ats_slug.indexOf("/");
      const host = c.ats_slug.slice(0, sep);
      const site = c.ats_slug.slice(sep + 1);
      const tenant = host.split(".")[0];
      const d = await fetchJson(`https://${host}/wday/cxs/${tenant}/${site}${l.detailRef}`);
      const info = d.jobPostingInfo || {};
      const endDate =
        typeof info.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(info.endDate) ? info.endDate : null;
      return { description: info.jobDescription || null, deadline: endDate };
    }
  } catch {
    // Enrichment is best-effort: a failed detail fetch never fails the import.
  }
  return { description: null, deadline: null };
}

// Small concurrency pool so 7+ boards don't fetch one at a time (or all at once).
export async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) || 1 }, worker));
  return out;
}
