import type { Profile } from "./scoring";

type CompanyRow = { name: string; bg_check_risk: string | null; is_focus: boolean | null };

// Commutable/relocatable region for a Sacramento-based search: the Bay Area.
// Scores below the home metro, above remote. Used when the preferences row has
// no nearby_locations yet (migration 004 makes it tunable in the DB).
const DEFAULT_NEARBY = [
  "San Francisco", "SF", "Bay Area", "San Jose", "Santa Clara", "Sunnyvale",
  "Mountain View", "Palo Alto", "Menlo Park", "Redwood City", "San Mateo",
  "Foster City", "South San Francisco", "Oakland", "Berkeley", "Emeryville",
  "Fremont", "Milpitas", "Cupertino", "San Bruno", "Burlingame", "Pleasanton",
  "San Ramon", "Dublin, CA",
];

// Turns the preferences row + companies table into a scoring Profile.
// Company eligibility: medium BG-check risk -> review, otherwise clear.
export function buildProfile(prefs: any, companies: CompanyRow[]): Profile {
  const focusCompanies = companies
    .filter((c) => c.is_focus)
    .map((c) => c.name.toLowerCase().trim());

  const companyEligibility: Record<string, "clear" | "review"> = {};
  for (const c of companies) {
    const key = c.name.toLowerCase().trim();
    companyEligibility[key] = (c.bg_check_risk || "").toLowerCase() === "medium" ? "review" : "clear";
  }

  return {
    targetLocations: prefs?.target_locations ?? ["Sacramento", "Folsom", "Rancho Cordova", "Elk Grove", "Roseville", "Rocklin"],
    nearbyLocations: prefs?.nearby_locations ?? DEFAULT_NEARBY,
    remoteOk: prefs?.remote_ok ?? true,
    keywords: prefs?.keywords ?? ["python", "flask", "sql", "backend", "data", "software", "web", "qa"],
    excludedKeywords: prefs?.excluded_keywords ?? ["defense", "clearance", "bank", "police"],
    focusCompanies,
    companyEligibility,
    weights: prefs?.scoring_weights ?? {},
  };
}
