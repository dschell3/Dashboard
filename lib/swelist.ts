import type { Listing } from "./scoring";

// Machine-readable feeds behind swelist.com: SimplifyJobs repos, refreshed
// daily (~12MB JSON each; both live on the dev branch). SimplifyJobs starts a
// new internships repo each season — bump that URL per cycle; the new-grad
// repo is season-less and stays put.
const FEEDS: { url: string; roleType: "internship" | "new-grad" }[] = [
  {
    url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json",
    roleType: "internship",
  },
  {
    url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
    roleType: "new-grad",
  },
];

async function fetchFeed(url: string, roleType: "internship" | "new-grad"): Promise<Listing[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch swelist feed: HTTP " + res.status);
  const data: any[] = await res.json();
  return data
    .filter((d) => d && d.active && d.is_visible)
    .map((d) => ({
      externalId: String(d.id),
      company: d.company_name || "",
      title: d.title || "",
      locations: Array.isArray(d.locations) ? d.locations : [],
      sponsorship: d.sponsorship || null,
      season: d.season || null,
      datePosted: typeof d.date_posted === "number" ? d.date_posted : null,
      url: d.url || d.company_url || "",
      source: "swelist",
      roleType,
    }));
}

export async function fetchSwelistListings(): Promise<Listing[]> {
  // One feed failing shouldn't sink the other's import; fail only when
  // neither can be fetched.
  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.url, f.roleType)));
  const ok = results.filter((r): r is PromiseFulfilledResult<Listing[]> => r.status === "fulfilled");
  if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => r.value);
}
