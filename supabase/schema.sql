-- Internship dashboard schema
-- Run this in the Supabase SQL editor before seed.sql.
-- RLS is enabled at the bottom with NO policies: the public anon key can't
-- touch anything, and the app talks to the DB exclusively through the
-- service-role key on the server, behind the APP_PASSWORD gate.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  region_tag text,                       -- local | remote-ok
  size text,
  ownership text,                        -- public | private | subsidiary
  what_they_do text,
  has_intern_program boolean default true,
  intern_program_notes text,
  roles_to_target text,
  bg_check_risk text,                    -- low | low-med | medium
  sector text,
  fair_chance_friendly boolean default true,
  ats_type text,                         -- greenhouse | lever | ashby | smartrecruiters | workday | icims | custom | unknown
  ats_slug text,                         -- board token; workday uses "host/site"
  careers_url text,
  why_it_fits text,
  notes text,
  priority text default 'medium',        -- high | medium | low
  is_focus boolean default false,
  created_at timestamptz default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  company_name_raw text,
  title text not null,
  role_type text default 'internship',   -- internship | new-grad | co-op
  season text,
  locations text[] default '{}',
  work_mode text,                        -- onsite | hybrid | remote
  source text default 'manual',          -- manual | swelist | bookmarklet
  source_url text,
  external_id text unique,               -- dedup key for the swelist feed
  sponsorship text,
  date_posted timestamptz,
  date_updated timestamptz,
  window_opens_at date,
  deadline_at date,
  is_rolling boolean default true,
  status text default 'interested',      -- interested | preparing | applied | interview | offer | accepted | rejected | withdrawn | closed | not_relevant
  priority text,
  fit_score int default 0,
  fit_breakdown jsonb,
  eligibility_flag text default 'clear', -- clear | review | blocked
  applied_at timestamptz,
  last_activity_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Company names must be unique so the seed can be re-run safely.
create unique index if not exists companies_name_key on companies (name);

create index if not exists opportunities_fit_idx on opportunities (fit_score desc);
create index if not exists opportunities_status_idx on opportunities (status);
create index if not exists opportunities_company_idx on opportunities (company_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  opportunity_id uuid references opportunities(id) on delete set null,
  kind text,                             -- resume | cover_letter | essay | portfolio
  label text,
  storage_path text,
  external_url text,
  version int default 1,
  notes text,
  created_at timestamptz default now()
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  type text,                             -- resume | cover_letter | transcript | essay | references | portfolio | online_assessment | other
  label text,
  details text,
  is_required boolean default true,
  is_complete boolean default false,
  document_id uuid references documents(id) on delete set null,
  due_at date,
  created_at timestamptz default now()
);

create table if not exists preferences (
  id uuid primary key default gen_random_uuid(),
  target_locations text[] default '{}',
  remote_ok boolean default true,
  keywords text[] default '{}',
  role_types text[] default '{internship}',
  season text,
  excluded_sectors text[] default '{}',
  excluded_keywords text[] default '{}',
  needs_sponsorship boolean default false,
  bg_risk_tolerance text default 'medium',
  scoring_weights jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Security: Row Level Security ----------
-- RLS is ON with no policies, which denies ALL access through the public anon
-- key. The app reads/writes exclusively server-side with the service-role key
-- (which bypasses RLS), behind the app's password gate.
-- Phase 2: add Supabase Auth and per-user policies here instead.
alter table companies enable row level security;
alter table opportunities enable row level security;
alter table documents enable row level security;
alter table requirements enable row level security;
alter table preferences enable row level security;
