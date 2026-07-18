# Internship Dashboard — Project Context

Personal, single-user internship-search dashboard for a Sacramento-area CS student.
Next.js 14 (App Router, TypeScript) + Tailwind + Supabase (Postgres), deployed on
Vercel with cron jobs. Repo: `dschell3/Dashboard`, auto-deploys `main`.

## Functional requirements (source of truth)

**Purpose:** track Summer 2026 internship opportunities, score them by fit,
flag eligibility, pull live postings automatically, and surface deadlines.

- **Fit scoring** (`lib/scoring.ts`): rule-based, transparent, weights stored in
  `preferences.scoring_weights`. Every stored score keeps its breakdown
  (`fit_breakdown` jsonb) and the detail page shows it. Signals: target-metro
  location (30), remote (18), focus-company match (25), title keywords
  (6 each, cap 24), intern/co-op role (12), freshness (10/6). Import threshold 35.
- **Eligibility is separate from fit** and is a core requirement, not
  decoration. The user's search excludes sectors with strict background-check
  barriers (defense/clearance, banking/finance, law enforcement/corrections).
  Flags: `blocked` (excluded-sector keyword hit — never stored on import, and a
  manual add that trips it is downgraded to `review` rather than hiding the
  user's own entry), `review` (focus company with medium background-check risk;
  CA Fair Chance Act context — apply anyway, conditional offer precedes the
  check), `clear` (everything else). Do not remove, genericize, or weaken this
  system; treat it matter-of-factly.
- **Matching must be word-aware** (`containsWord`, `containsWordExact`,
  `matchFocusCompany`): keyword/exclusion terms match word-starts ("bank" hits
  "banking", never "Burbank"); company names match whole words only ("Apple"
  never matches "Applebees"). This fixed real false-positive bugs — preserve it.
  Unit tests in `lib/scoring.test.ts` pin the behavior.
- **Imports** (three sources, all upsert on `external_id`, all preserve
  user-set state):
  - swelist feed (`/api/import-swelist`): SimplifyJobs Summer2026 JSON.
  - Per-company ATS pulls (`/api/import-ats`, `lib/ats.ts`): Ashby (Inductive
    Automation, Scribd, Instructure/Parchment), SmartRecruiters (Solidigm),
    Workday (HPE, Micron, VSP). Config lives in `companies.ats_type` +
    `companies.ats_slug`; Workday slugs are `host/site`. Workday boards are
    searched for "intern" server-side (page size 50, Workday's max — a single
    request per board); small boards are scanned in full (this matters:
    Inductive's "Software Technical Analyst" is a target role without "intern"
    in the title). ATS pulls require metro-or-remote location before scoring
    (focus bonus alone would otherwise pass far-away roles).
  - Capture bookmarklet (`/capture`, `lib/capture.ts`): sends only URL, title,
    and selection; ALL parsing stays server/app-side so installed bookmarklets
    never go stale. Prefills `/opportunities/new` via `?u=&t=&s=`.
- **Non-clobber rule:** imports never overwrite `status`, manually set
  `deadline_at`, `is_rolling`, or (on existing rows) `work_mode` — columns are
  omitted from upsert rows unless the import has real data, e.g. a found
  deadline. Moving to `applied` stamps `applied_at` once and never overwrites
  it. Upserts go through `upsertGrouped()` (`lib/db.ts`), which batches rows
  by key signature: PostgREST bulk writes null-fill keys missing from some
  rows, so mixed-shape batches would clobber the very columns being omitted.
  `locations` is still rewritten by imports (feed location data is treated as
  fresher).
- **Deadline capture** (`lib/deadline.ts`): Workday structured `endDate` when
  present; trigger-phrase + nearest-date scan of posting text during ATS
  imports; on-demand "Scan posting" button (`/api/opportunities/[id]/scan`).
  Dates outside a plausibility window (−60d … +550d) are rejected. The
  yearless "Month D" fallback refuses dates that carry a year, so placeholder
  dates like "December 31, 2099" can't be misread as this year's. Tests in
  `lib/deadline.test.ts`.
- **Dashboard logic:** date windows measure from *start of today* so a
  deadline due today still counts; overdue active roles surface first in
  Needs Attention, and every Needs Attention bucket filters to active
  statuses. Tasks panel shows incomplete `requirements` ordered by `due_at`
  (nulls last) and supports check-off.
- **.ics export:** RFC 5545 — exclusive DTEND (+1 day), lines folded by
  UTF-8 octets, active statuses only.
- **Reminders** (`/api/reminders`): Resend digest of active roles due ≤7 days
  (overdue included); no-ops gracefully without `RESEND_API_KEY`/`REMINDER_TO`.
  A signed-in (cookie) GET is a dry run that reports what's due; only the
  CRON_SECRET bearer actually sends.

## Security model — invariants (do not weaken)

- **Single-user password gate**, not Supabase Auth — deliberate for a solo
  tool. `middleware.ts` + `lib/gate.ts`: the cookie is a **signed expiring
  token** `<expiry-epoch>.<hmac>` keyed off `APP_PASSWORD` (httpOnly,
  SameSite=Lax, Secure in prod, 30-day expiry enforced server-side on every
  request), constant-time comparisons, ~400ms delay on failed login. Changing
  `APP_PASSWORD` revokes all sessions. **Fails closed in production** when
  `APP_PASSWORD` is unset (dev stays open). Login preserves `?next=` but only
  same-origin relative paths (no `//`, no `\` — open-redirect guard incl.
  backslash normalization). Token behavior pinned by `lib/gate.test.ts`.
- **Keep Next.js patched.** The gate lives entirely in middleware, so
  middleware-bypass CVEs (e.g. CVE-2025-29927, fixed in 14.2.25) are
  auth-bypass severity for this app. Pinned to the latest 14.x patch; check
  `npm audit` on every pass. Remaining audit advisories are only fixed in
  Next 16 (breaking) and are DoS/cache-poisoning class issues tied to
  next/image (unused) and self-hosting (this deploys on Vercel) — accepted
  until the next major upgrade.
- **Database:** RLS enabled on all tables with **zero policies**; the anon key
  can do nothing. All queries go through the service-role key in server code
  only (`lib/db.ts`). Never import `lib/db.ts` into a client component; never
  reintroduce browser-side DB writes.
- **Supabase fetches must stay `cache: "no-store"`** (`lib/db.ts` wraps the
  client's fetch). Next.js caches GET responses in its Data Cache ACROSS
  requests in production — `force-dynamic` does not opt fetch() out — and
  without this wrapper pages render stale rows (a saved status change
  visibly "reverted"; bug reproduced and fixed 2026-07). Do not remove.
- **Cron model:** Vercel crons send `Authorization: Bearer $CRON_SECRET`.
  The middleware allows that bearer through for the three cron paths, but the
  GET handlers on `import-swelist`, `import-ats`, and (for the actual send)
  `reminders` *re-check the bearer in-route* so a cookie-bearing GET (CSRF via
  `<img>`) can never trigger writes or emails. POSTs rely on SameSite=Lax.
  Keep both layers.
- **Security headers** (`next.config.mjs`): CSP (modest — App Router needs
  inline scripts; the value is frame-ancestors/object-src/base-uri/form-action
  and connect-src 'self'), X-Frame-Options DENY, nosniff, HSTS,
  Referrer-Policy no-referrer (posting links must not learn the dashboard
  URL), Permissions-Policy. Dev (and only dev) adds `'unsafe-eval'` to
  script-src — Next dev tooling needs it and hydration silently dies without
  it; production must never get it.
- **URLs:** every stored or rendered link passes `safeUrl()` (http/https only,
  auto-https for schemeless, `javascript:` dropped); external links use
  `rel="noopener noreferrer"`. Applies to feed data, ATS data, and user input.
- **Input handling:** API routes whitelist enums (statuses, priorities, work
  modes, requirement types), validate UUIDs and `YYYY-MM-DD` dates by regex,
  and clamp string lengths. Error responses are generic; details are logged
  server-side only (never return raw Supabase `error.message`).
- **Scan endpoint SSRF guard** (`scan/route.ts`): fetches only the row's
  stored (already-validated) `source_url`, blocks localhost/private-range/
  IP-literal/odd-port hosts, refuses redirects (a 3xx could point at an
  internal address the original-host check never saw), abort timeout covers
  the body read, response streamed with a hard 500KB cap. Known limitation:
  hostname-based guarding is not DNS-rebinding-proof — acceptable for a
  single-user tool; do not expose this pattern multi-tenant.
- **Accepted risks (documented, revisit if the tool becomes shared):** login
  throttling is the fixed 400ms delay (Vercel is stateless — an in-memory
  counter won't hold; platform-level WAF rate rules are the upgrade path).

## Intentional decisions — do not "fix"

- No Supabase Auth / per-user RLS (roadmap item for multi-user, not now).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is effectively unused; kept for future use.
- No new npm dependencies without strong justification (Resend is called via
  plain `fetch`, no SDK; keep it that way). Vitest (dev-only) is the sanctioned
  exception.
- Blocked-eligibility listings are never stored, by design.
- Workday intern-only search and the 5-per-company enrichment budget are
  deliberate request-volume caps.
- Seed (`supabase/seed.sql`) is idempotent by design: `on conflict do nothing`
  keyed on unique company name / `external_id`, preferences guarded by
  `where not exists`. Migrations 001 (RLS) and 002 (ATS wiring) have already
  been applied to the live database — schema changes need a new migration
  file, never edits to applied ones.
- Optimistic UI in `OpportunitiesTable` intentionally resyncs from server
  props via `useEffect(() => setOpps(initial), [initial])`. Filters/sort/search
  mirror into the URL with `history.replaceState` (no navigations).

## Environment & ops

- Env (Vercel + `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `APP_PASSWORD`, `CRON_SECRET`; optional `RESEND_API_KEY`, `REMINDER_TO`,
  `REMINDER_FROM`. **Never commit `.env.local`; never print key values.**
- Crons (UTC): swelist 14:00, ATS 14:15, reminders 14:30 (`vercel.json`).
- Validation: `npm install`, `npx tsc --noEmit`, `npx next build` (placeholder
  env vars suffice for building), `npm test` (Vitest — unit tests for
  `lib/scoring.ts`, `lib/deadline.ts`, `lib/capture.ts`, `lib/gate.ts`).
- UI feedback goes through the shared `toast()` in `components/Toaster.tsx`
  (mounted once in the root layout) — not transient inline text.
- Git history was reset with a force-push (nested-folder cleanup); shallow
  history is expected. Windows checkout produces CRLF warnings — harmless.
