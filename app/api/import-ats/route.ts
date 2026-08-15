import { NextResponse } from "next/server";
import { createServerClient, upsertGrouped } from "@/lib/db";
import { buildProfile } from "@/lib/profile";
import { scoreListing, type Listing } from "@/lib/scoring";
import { fetchCompanyListings, enrichListing, isPullable, pool, looksSenior, externalIdPrefix, type AtsCompany } from "@/lib/ats";
import { safeUrl } from "@/lib/format";
import { extractDeadline, stripHtml, plausibleDeadline } from "@/lib/deadline";
import { safeEqual } from "@/lib/gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THRESHOLD = 35;

// Unlike the national swelist feed (where the fit threshold does the pruning),
// focus companies score 25 points on the name alone — so without this gate an
// HPE intern role in Houston would sneak in. Only metro or remote roles count.
function isRelevant(l: Listing, targetLocations: string[], remoteOk: boolean) {
  const locs = l.locations.map((x) => x.toLowerCase());
  const metro = locs.some((x) => targetLocations.some((t) => x.includes(t.toLowerCase())));
  const remote = locs.some((x) => x.includes("remote"));
  return metro || (remote && remoteOk);
}

async function runImport() {
  try {
    const supabase = createServerClient();

    const [companiesRes, prefsRes] = await Promise.all([
      supabase.from("companies").select("id, name, bg_check_risk, is_focus, ats_type, ats_slug"),
      supabase.from("preferences").select("*").limit(1),
    ]);
    const companies = companiesRes.data || [];
    const profile = buildProfile(prefsRes.data && prefsRes.data[0], companies);

    const pullable = companies.filter((c) => c.is_focus && isPullable(c as AtsCompany));
    if (pullable.length === 0) {
      return NextResponse.json({
        added: 0, updated: 0, scanned: 0, results: [],
        note: "No companies have an ATS configured. Set ats_type + ats_slug on the companies table.",
      });
    }

    const rows: any[] = [];
    const results = await pool(pullable, 4, async (c: any) => {
      try {
        const listings = await fetchCompanyListings(c as AtsCompany);
        let kept = 0;
        let deadlines = 0;
        const keptIds: string[] = [];
        // Detail fetches cost one request per posting, so cap them per company.
        let enrichBudget = 5;
        for (const l of listings) {
          // Full-board scans surface senior roles that focus+location points
          // alone would push past the threshold — drop them by title.
          if (looksSenior(l.title)) continue;
          if (!isRelevant(l, profile.targetLocations, profile.remoteOk)) continue;
          const { fitScore, eligibility, breakdown } = scoreListing(l, profile);
          if (fitScore < THRESHOLD || eligibility === "blocked") continue;
          kept++;

          // Deadline capture: structured endDate when the ATS has one,
          // otherwise scan the posting text for a stated deadline.
          let description = l.description || null;
          let deadline: string | null = null;
          if ((c.ats_type === "smartrecruiters" || c.ats_type === "workday") && l.detailRef && enrichBudget > 0) {
            enrichBudget--;
            const e = await enrichListing(c as AtsCompany, l);
            description = description || e.description;
            deadline = e.deadline;
          }
          if (!deadline && description) deadline = extractDeadline(stripHtml(description));
          if (deadline && !plausibleDeadline(deadline)) deadline = null;
          if (deadline) deadlines++;

          const isRemote = l.locations.some((x) => x.toLowerCase().includes("remote"));
          keptIds.push(l.externalId.slice(0, 500));
          rows.push({
            external_id: l.externalId.slice(0, 500),
            company_name_raw: (l.company || "").slice(0, 200),
            company_id: c.id,
            title: (l.title || "").slice(0, 300),
            role_type: "internship",
            season: "Summer 2026",
            locations: (l.locations || []).slice(0, 10).map((x) => String(x).slice(0, 120)),
            work_mode: isRemote ? "remote" : l.locations.length ? "onsite" : null,
            source: "ats",
            source_url: safeUrl(l.url),
            date_posted: l.datePosted ? new Date(l.datePosted * 1000).toISOString() : null,
            date_updated: new Date().toISOString(),
            fit_score: fitScore,
            fit_breakdown: breakdown,
            eligibility_flag: eligibility,
            // Only written when a deadline was found — so a re-import never
            // wipes out a deadline you set by hand on the detail page.
            ...(deadline ? { deadline_at: deadline, is_rolling: false } : {}),
            // Posting text (stripped) powers resume tailoring without a live
            // fetch of JS-rendered ATS pages. Omitted when absent so a pull
            // without text never clears a previously stored description.
            ...(description ? { description: stripHtml(String(description)).slice(0, 20000) } : {}),
          });
        }
        return {
          company: c.name,
          ats: c.ats_type,
          found: listings.length,
          kept,
          deadlines,
          // Only ids that still pass the CURRENT import rules count as alive
          // for cleanup — a previously imported row that today's rules would
          // reject (vanished, senior-titled, no longer relevant) is a ghost.
          prefix: externalIdPrefix(c as AtsCompany),
          liveIds: keptIds,
        };
      } catch (e: any) {
        return { company: c.name, ats: c.ats_type, found: 0, kept: 0, error: e?.message || "fetch failed" };
      }
    });

    // Dedupe (two boards can theoretically emit the same id) and count new rows.
    const byId = new Map<string, any>();
    for (const r of rows) byId.set(r.external_id, r);
    const unique = Array.from(byId.values());

    const { data: existing } = await supabase
      .from("opportunities")
      .select("id, external_id, status")
      .like("external_id", "ats:%")
      .limit(10000);
    const existingRows = existing || [];
    const known = new Set(existingRows.map((r: any) => r.external_id));
    const added = unique.filter((r) => !known.has(r.external_id)).length;

    // Existing rows keep the work_mode you may have set by hand on the detail
    // page: the column is only written when the row is first created.
    const finalRows = unique.map((r) => {
      if (!known.has(r.external_id)) return r;
      const { work_mode, ...rest } = r;
      return rest;
    });

    await upsertGrouped(supabase, "opportunities", finalRows, "external_id");

    // Ghost cleanup: a posting imported earlier that the board no longer
    // lists is closed — but ONLY rows still on the untouched default status
    // ('interested'), so anything you moved through the pipeline is never
    // auto-closed. Skipped entirely for boards whose fetch failed.
    let closed = 0;
    for (const r of results as any[]) {
      if (r.error || !r.prefix || !r.liveIds) continue;
      const live = new Set(r.liveIds);
      const ghosts = existingRows.filter(
        (row: any) =>
          typeof row.external_id === "string" &&
          row.external_id.startsWith(r.prefix) &&
          !live.has(row.external_id) &&
          row.status === "interested"
      );
      if (ghosts.length === 0) continue;
      const { error } = await supabase
        .from("opportunities")
        .update({ status: "closed", date_updated: new Date().toISOString() })
        .in("id", ghosts.map((g: any) => g.id));
      if (!error) {
        r.closed = ghosts.length;
        closed += ghosts.length;
      }
    }

    const scanned = results.reduce((n, r) => n + r.found, 0);
    // liveIds can be hundreds of entries per board — not useful to callers.
    const publicResults = (results as any[]).map(({ liveIds, prefix, ...rest }) => rest);
    return NextResponse.json({ added, updated: unique.length - added, closed, scanned, results: publicResults });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Company import failed" }, { status: 500 });
  }
}

// UI button (cookie-authenticated by the middleware).
export async function POST() {
  return runImport();
}

// Scheduled runs only — explicit CRON_SECRET check, same rationale as the
// swelist route: a cookie-bearing GET must never be able to trigger writes.
export async function GET(req: Request) {
  const cron = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (!cron || !safeEqual(header, "Bearer " + cron)) {
    return NextResponse.json({ error: "Scheduled imports require CRON_SECRET" }, { status: 401 });
  }
  return runImport();
}
