# Internship dashboard

A personal command center for the Summer 2026 internship search — tuned to a
Sacramento-area, fair-chance-aware job hunt. Tracks opportunities, scores them
by fit, flags eligibility, pulls live postings from the swelist feed, and nags
you before deadlines.

---

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** (Postgres) for storage — accessed server-side only
- **lucide-react** for icons · optional **Resend** for reminder emails

---

## Setup (about 10 minutes)

### 1. Create a Supabase project
[supabase.com](https://supabase.com) → New project → **SQL Editor**, then run in order:

1. `supabase/schema.sql`
2. `supabase/seed.sql` (your 24 focus companies, scoring preferences, and starter roles — safe to re-run)

### 2. Configure the app
```bash
cp .env.local.example .env.local
```
Fill in, from Supabase → **Project Settings → API**:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (kept for future use; RLS blocks it from everything) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — server-side only |
| `APP_PASSWORD` | the password that gates the whole app |
| `CRON_SECRET` / `RESEND_API_KEY` / `REMINDER_TO` | optional, for automation (below) |

### 3. Run it
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000), sign in with your
`APP_PASSWORD`, and click **Import from swelist**.

### Upgrading from the first Phase 1 build
Already created your database before RLS was in the schema? Run
`supabase/migration-001-enable-rls.sql` once, add `APP_PASSWORD` to
`.env.local`, and you're current — everything else is code-side.

---

## What's in it

**Dashboard (`/`)** — stat cards (active, due this week, pipeline, new matches),
fit-sorted top matches, a Needs-attention list (overdue first, then upcoming
deadlines, opening windows, and rolling roles worth applying to now), live
tasks you can check off, and the pipeline by status.

**Opportunities (`/opportunities`)** — the full database: live search, filters
(status / source / eligibility / focus companies), sortable columns, inline
status changes, and delete. Click any company to open its detail page.

**Role detail (`/opportunities/[id]`)** — edit status, priority, deadline,
opening window, work mode, link, and notes; see exactly why a role got its fit
score; and build the application checklist (resume tailoring, essays,
transcripts, OAs…) that feeds the dashboard Tasks panel. Moving a role to
*Applied* stamps the date automatically.

**Capture (`/capture`)** — a bookmarklet for everything else. Drag the button
to your bookmarks bar once; then on any job posting (the small local shops,
LinkedIn, anywhere) one click opens the Add form pre-filled with the role,
company, and link, parsed from the page. Select the job title on the page
first and the capture uses your selection verbatim. Captured roles are scored
like imports.

**Add (`/opportunities/new`)** — log roles by hand (small local shops usually
aren't in swelist). Manual entries are scored by the same engine as imports.

**Company feeds (the good stuff)** — a per-company ATS puller fetches real
openings straight from your focus companies' job boards. Wired up out of the
box (public, no-auth APIs):

| Company | ATS |
| --- | --- |
| Inductive Automation | Ashby |
| Solidigm | SmartRecruiters |
| VSP Vision | Workday |
| Hewlett Packard Enterprise | Workday |
| Micron Technology | Workday |
| Scribd | Ashby |
| Parchment (Instructure) | Ashby |

Only roles in your target metro (or remote) are kept, scored like everything
else. To wire another company, set `ats_type`
(greenhouse / lever / ashby / smartrecruiters / workday) and `ats_slug` on its
`companies` row — Workday slugs look like `host/site`
(e.g. `hpe.wd5.myworkdayjobs.com/Jobsathpe`). PowerSchool (iCIMS) and
AMD / Intel / Apple / Oracle (custom portals) have no public APIs — those are
manual-add territory. Note: Workday boards are searched for "intern" roles
specifically; the smaller boards are scanned in full.

**Import from swelist** — pulls the live
[SimplifyJobs / Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships)
feed, scores every listing against your profile, and upserts the relevant ones.
Safe to re-run: dedupes on listing id and **preserves any status you've set**.
Roles matching your excluded sectors are never stored at all.

**Deadline capture** — most US internships are genuinely rolling, but when a
posting states a deadline, the dashboard finds it three ways: Workday's
structured `endDate` when present, a text scan of posting descriptions during
company-feed imports ("apply by March 1", "applications close January 15,
2026"…), and a **Scan posting** button on every role's detail page that
fetches the saved link and looks for a stated deadline. Found deadlines feed
"Due this week", Needs attention, the `.ics` export, and the reminder emails.
Imports never overwrite a deadline you set by hand.

**Export .ics** — calendar file of deadlines and opening windows for active
roles (RFC-5545-correct all-day events).

---

## How scoring works

Rule-based and transparent — every stored score keeps its breakdown, shown on
the detail page. Weights live in `preferences.scoring_weights`:

| Signal | Points |
| --- | --- |
| Location in a target metro | 30 |
| Remote (US) | 18 |
| Matches a focus company | 25 |
| Each skill keyword in the title | 6 (max 24) |
| Internship / co-op role | 12 |
| Posted in the last 14 / 30 days | 10 / 6 |

Listings need **≥ 35** to be imported (`THRESHOLD` in
`app/api/import-swelist/route.ts`).

Matching is word-aware in both directions: exclusion and skill keywords match
word *starts* ("bank" hits "banking" but never "Burbank"), while company names
must match on whole words ("Apple" matches "Apple Inc" but never "Applebees").

**Eligibility** is separate from fit:
- **Blocked** — hits an excluded-sector keyword (defense/clearance, banking,
  law enforcement…). Never stored on import; a manual add that trips it is
  downgraded to *review* instead of hiding your own entry.
- **Review** — a focus company with *medium* background-check risk (large
  corps, govt contractors, ed-tech). The Fair Chance Act applies — apply
  anyway; the conditional offer comes before the check.
- **Eligible** — everything else, including all your low / low-med companies.

Target locations, keywords, and exclusions are all in the `preferences` row.

---

## Security model

- **App gate** — every page and API route requires the `APP_PASSWORD` cookie
  (SHA-256 token: httpOnly, SameSite=Lax, Secure in production, 30-day expiry;
  constant-time comparisons). Sign out from the nav. With no password set, the
  app is open in local dev but **fails closed in production**.
- **Database** — RLS is enabled with **no policies**, so the public anon key
  can't read or write anything. All queries go through the service-role key in
  server code only; nothing database-shaped ships to the browser.
- **Inputs** — every stored or rendered link is validated to http(s) (a
  `javascript:` URL from the feed or a form is dropped), external links get
  `rel="noopener noreferrer"`, imports clamp field lengths, and API routes
  whitelist statuses/types and validate UUIDs and dates.
- **CSRF** — state changes ride on POST/PATCH/DELETE with a SameSite=Lax
  cookie; the cron-triggered GET import additionally requires the
  `CRON_SECRET` bearer token, so a cookie alone can never fire it.

Deploying to Vercel: set all env vars in the project settings, and that's it —
this build is designed to be safe on a public URL.

---

## Automation (optional)

`vercel.json` schedules three jobs (UTC): the swelist feed at 14:00, the
per-company ATS pull at 14:15, and the deadline digest at 14:30. Set `CRON_SECRET` in Vercel and both endpoints accept
`Authorization: Bearer <CRON_SECRET>` (Vercel sends it automatically).

For emails, set `RESEND_API_KEY` and `REMINDER_TO` (free Resend account works;
`REMINDER_FROM` defaults to Resend's onboarding sender). The digest covers
active roles due within 7 days, overdue ones flagged. Visit `/api/reminders`
in the browser any time to test.

---

## Project structure

```
middleware.ts             password gate + cron-secret bypass
lib/
  gate.ts                 shared auth-token helpers
  db.ts                   service-role Supabase client (server-only)
  scoring.ts              fit score, eligibility, word-aware matching
  swelist.ts / profile.ts feed fetch + preferences -> scoring profile
  format.ts / types.ts    date/url helpers + shared types
app/
  page.tsx                dashboard
  login/                  sign-in screen
  opportunities/          table · add form · [id] detail + checklist
  capture/                bookmarklet install page
  api/
    login, logout         gate endpoints
    opportunities, requirements   CRUD (validated, server-side)
    import-swelist        POST (button) · GET (cron-only)
    import-ats            per-company board pull, same auth model
    export-ics            calendar download
    reminders             email digest (cron or manual)
supabase/
  schema.sql              tables + RLS + unique indexes
  seed.sql                idempotent seed (companies, prefs, starter roles)
  migration-001/002-….sql  upgrade path for existing databases
vercel.json               cron schedules
```

---

## What's next (Phase 3 ideas)

- Multi-user: swap the gate for Supabase Auth + per-user RLS policies
