import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { buildProfile } from "@/lib/profile";
import { scoreListing, matchFocusCompany, type Listing } from "@/lib/scoring";
import { safeUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.company !== "string" || !b.company.trim() || typeof b.title !== "string" || !b.title.trim()) {
    return NextResponse.json({ error: "Company and role are required." }, { status: 400 });
  }

  const supabase = createServerClient();
  const [companiesRes, prefsRes] = await Promise.all([
    supabase.from("companies").select("id, name, bg_check_risk, is_focus"),
    supabase.from("preferences").select("*").limit(1),
  ]);
  const companies = companiesRes.data || [];
  const profile = buildProfile(prefsRes.data && prefsRes.data[0], companies);

  const companyIdByName: Record<string, string> = {};
  for (const c of companies) companyIdByName[c.name.toLowerCase().trim()] = c.id;

  const company = b.company.trim().slice(0, 200);
  const title = b.title.trim().slice(0, 300);
  const location = typeof b.location === "string" ? b.location.trim().slice(0, 120) : "";
  const url = safeUrl(b.source_url);

  // Score manual entries with the same engine as the feed import.
  const listing: Listing = {
    externalId: "",
    company,
    title,
    locations: location ? [location] : [],
    sponsorship: null,
    season: "Summer 2026",
    datePosted: Math.floor(Date.now() / 1000),
    url: url || "",
    source: "manual",
  };
  const { fitScore, eligibility, breakdown } = scoreListing(listing, profile);
  const matchKey = matchFocusCompany(company, Object.keys(companyIdByName));

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      company_name_raw: company,
      company_id: matchKey ? companyIdByName[matchKey] : null,
      title,
      locations: location ? [location] : [],
      role_type: ["internship", "co-op", "new-grad"].includes(b.role_type) ? b.role_type : "internship",
      status: ["interested", "preparing", "applied", "interview", "offer"].includes(b.status) ? b.status : "interested",
      source: "manual",
      source_url: url,
      deadline_at: /^\d{4}-\d{2}-\d{2}$/.test(b.deadline || "") ? b.deadline : null,
      is_rolling: !b.deadline,
      season: "Summer 2026",
      work_mode: /remote/i.test(location) ? "remote" : location ? "onsite" : null,
      date_posted: new Date().toISOString(),
      fit_score: fitScore,
      fit_breakdown: breakdown,
      // You added it on purpose, so a tripped exclusion keyword downgrades to
      // "review" instead of hiding your own entry.
      eligibility_flag: eligibility === "blocked" ? "review" : eligibility,
    })
    .select("id")
    .single();

  if (error) {
    console.error("opportunities insert failed:", error.message);
    return NextResponse.json({ error: "Could not save the opportunity." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
