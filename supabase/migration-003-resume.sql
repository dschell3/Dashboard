-- Migration 003: resume storage + AI-tailored resumes + posting text.
-- Run this in the Supabase SQL editor (like 001/002 before it). Idempotent.

-- Posting text captured at import time (stripped of HTML, clamped app-side).
-- Used as the job description when tailoring a resume, so no live fetch of
-- JS-rendered ATS pages is needed for imported roles.
alter table opportunities add column if not exists description text;

-- The resume on file. The app treats this as a single-row table (uploading
-- replaces the previous resume); the original file is kept base64-encoded so
-- PDFs can be sent to the Claude API as documents and re-downloaded intact.
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  mime_type text not null,
  content_base64 text not null,
  content_text text,                -- decoded text for .txt/.md uploads
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table resumes enable row level security;

-- Tailored versions, one per generation, linked to the opportunity.
create table if not exists tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  content_md text not null,
  model text,
  created_at timestamptz default now()
);
alter table tailored_resumes enable row level security;
create index if not exists tailored_resumes_opp_idx
  on tailored_resumes (opportunity_id, created_at desc);
