-- Migration 004: Summer 2027 season + nearby-region (Bay Area) scoring tier.
-- Run once in the Supabase SQL editor (after 001-003).
--
-- The swelist feed now points at the SimplifyJobs Summer2027 repo, and scoring
-- gained a "nearby" location tier: roles in the commutable/relocatable Bay Area
-- score below the home Sacramento metro (30) but above remote (18). The app
-- falls back to the same built-in Bay Area list if this column is null, so this
-- migration exists to make the list (and the weight) tunable in the DB.

alter table preferences add column if not exists nearby_locations text[];

update preferences set
  nearby_locations = array[
    'San Francisco','SF','Bay Area','San Jose','Santa Clara','Sunnyvale',
    'Mountain View','Palo Alto','Menlo Park','Redwood City','San Mateo',
    'Foster City','South San Francisco','Oakland','Berkeley','Emeryville',
    'Fremont','Milpitas','Cupertino','San Bruno','Burlingame','Pleasanton',
    'San Ramon','Dublin, CA'
  ],
  season = 'Summer 2027',
  scoring_weights = coalesce(scoring_weights, '{}'::jsonb) || '{"nearby":20}'::jsonb
where nearby_locations is null;
