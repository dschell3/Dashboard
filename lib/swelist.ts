import type { Listing } from "./scoring";

// Machine-readable feed behind swelist.com: the SimplifyJobs / Summer2027-Internships
// repo, refreshed daily. (~12MB JSON; lives on the dev branch.) SimplifyJobs
// starts a new repo each season — bump this URL when the next cycle begins.
const FEED_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

export async function fetchSwelistListings(): Promise<Listing[]> {
  const res = await fetch(FEED_URL, { cache: "no-store" });
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
    }));
}
