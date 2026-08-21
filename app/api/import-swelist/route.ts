import { NextResponse } from "next/server";
import { createServerClient, upsertGrouped } from "@/lib/db";
import { fetchSwelistListings } from "@/lib/swelist";
import { buildProfile } from "@/lib/profile";
import { scoreListing, matchFocusCompany } from "@/lib/scoring";
import { safeUrl } from "@/lib/format";
import { safeEqual } from "@/lib/gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Only import listings that clear this fit score (keeps the DB focused on
// relevant roles). Lower it to pull a wider net.
const THRESHOLD = 35;

async function runImport() {
  try {
    const supabase = createServerClient();

    const [companiesRes, prefsRes] = await Promise.all([
      supabase.from("companies").select("id, name, bg_check_risk, is_focus"),
      supabase.from("preferences").select("*").limit(1),
    ]);
    const companies = companiesRes.data || [];
    const prefs = prefsRes.data && prefsRes.data[0];
    const profile = buildProfile(prefs, companies);

    const companyIdByName: Record<string, string> = {};
    for (const c of companies) companyIdByName[c.name.toLowerCase().trim()] = c.id;
    const companyKeys = Object.keys(companyIdByName);

    const listings = await fetchSwelistListings();

    const rows: any[] = [];
    for (const l of listings) {
      const { fitScore, eligibility, breakdown } = scoreListing(l, profile);
      if (fitScore < THRESHOLD) continue;
      // Excluded-sector roles are never stored: they'd be hidden everywhere
      // anyway, and keeping them out keeps the database clean.
      if (eligibility === "blocked") continue;

      const matchKey = matchFocusCompany(l.company, companyKeys);
      const isRemote = l.locations.some((x) => x.toLowerCase().includes("remote"));
      // Feed seasons are usually bare ("Summer"); don't double a year if present.
      const season = l.season
        ? (/\d{4}/.test(l.season) ? l.season : `${l.season} 2027`)
        : "Summer 2027";

      rows.push({
        external_id: l.externalId,
        company_name_raw: (l.company || "").slice(0, 200),
        company_id: matchKey ? companyIdByName[matchKey] : null,
        title: (l.title || "").slice(0, 300),
        role_type: "internship",
        season,
        locations: (l.locations || []).slice(0, 10).map((x) => String(x).slice(0, 120)),
        work_mode: isRemote ? "remote" : l.locations.length ? "onsite" : null,
        source: "swelist",
        source_url: safeUrl(l.url),
        sponsorship: l.sponsorship ? String(l.sponsorship).slice(0, 200) : null,
        date_posted: l.datePosted ? new Date(l.datePosted * 1000).toISOString() : null,
        date_updated: new Date().toISOString(),
        // is_rolling intentionally omitted: new rows default to rolling, and
        // re-imports must not reset a deadline you've set on the detail page.
        fit_score: fitScore,
        fit_breakdown: breakdown,
        eligibility_flag: eligibility,
        // NOTE: status is intentionally omitted so existing rows keep the status
        // you set, and new rows fall back to the column default ('interested').
      });
    }

    // Which of these listings do we already have? (So we can report new vs updated.)
    const { data: existing } = await supabase
      .from("opportunities")
      .select("external_id")
      .not("external_id", "is", null)
      .limit(10000);
    const known = new Set((existing || []).map((r: any) => r.external_id));
    const added = rows.filter((r) => !known.has(r.external_id)).length;

    // Existing rows keep the work_mode you may have set by hand on the detail
    // page: the column is only written when the row is first created.
    const finalRows = rows.map((r) => {
      if (!known.has(r.external_id)) return r;
      const { work_mode, ...rest } = r;
      return rest;
    });

    await upsertGrouped(supabase, "opportunities", finalRows, "external_id");

    return NextResponse.json({ added, updated: rows.length - added, scanned: listings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Import failed" }, { status: 500 });
  }
}

// Button in the UI (cookie-authenticated by the middleware; SameSite=Lax
// keeps cross-site POSTs from carrying the cookie).
export async function POST() {
  return runImport();
}

// Scheduled runs only: requires the CRON_SECRET bearer token even though the
// middleware lets it through, so a cookie-bearing GET (e.g. an <img> tag on a
// hostile page) can never trigger an import.
export async function GET(req: Request) {
  const cron = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (!cron || !safeEqual(header, "Bearer " + cron)) {
    return NextResponse.json({ error: "Scheduled imports require CRON_SECRET" }, { status: 401 });
  }
  return runImport();
}
