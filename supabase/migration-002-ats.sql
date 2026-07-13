-- Company ATS wiring (researched July 2026). Run once on any existing DB;
-- fresh installs get the same via seed.sql. Safe to re-run.

alter table companies add column if not exists ats_slug text;

-- Live pullers (public job-board APIs):
update companies set ats_type='ashby',           ats_slug='inductive-automation-llc'                where name='Inductive Automation';
update companies set ats_type='ashby',           ats_slug='ScribdInc'                                where name='Scribd';
update companies set ats_type='ashby',           ats_slug='instructure'                              where name='Parchment';
update companies set ats_type='smartrecruiters', ats_slug='Solidigm'                                 where name='Solidigm';
update companies set ats_type='workday',         ats_slug='hpe.wd5.myworkdayjobs.com/Jobsathpe'      where name='Hewlett Packard Enterprise';
update companies set ats_type='workday',         ats_slug='micron.wd1.myworkdayjobs.com/External'    where name='Micron Technology';
update companies set ats_type='workday',         ats_slug='vsp.wd1.myworkdayjobs.com/VSPVisionCareers' where name='VSP Vision';

-- No public API (apply on their sites / use the capture flow):
update companies set ats_type='icims'  where name='PowerSchool';
update companies set ats_type='custom' where name in ('AMD','Intel','Apple','Oracle');
