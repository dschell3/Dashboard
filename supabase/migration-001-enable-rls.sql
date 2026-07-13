-- Run this if you created your database with the ORIGINAL Phase 1 schema.sql.
-- Fresh databases don't need it — the current schema.sql already includes all
-- of this.

-- 1) Lock out the public anon key. No policies are created on purpose: the app
--    reads/writes exclusively server-side with the service-role key.
alter table companies enable row level security;
alter table opportunities enable row level security;
alter table documents enable row level security;
alter table requirements enable row level security;
alter table preferences enable row level security;

-- 2) Company names must be unique so seed.sql can be re-run safely.
--    (If this errors, you have duplicate company rows — delete the extras first.)
create unique index if not exists companies_name_key on companies (name);
