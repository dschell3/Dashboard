-- Internship dashboard - seed data
-- Run AFTER schema.sql. Safe to re-run: every statement skips rows that
-- already exist (companies by name, opportunities by external_id, and the
-- preferences row is only inserted when the table is empty).

-- ---------- Focus companies (from your spreadsheet) ----------
insert into companies
  (name, location, region_tag, size, ownership, what_they_do, has_intern_program, roles_to_target, bg_check_risk, sector, fair_chance_friendly, ats_type, careers_url, why_it_fits, priority, is_focus)
values
  ('Inductive Automation', 'Folsom', 'local', '~300 (Private)', 'private', 'Industrial automation software (Ignition SCADA platform)', true, 'Software Technical Analyst, QA Engineer, Software Dev', 'low', 'industrial-software', true, 'unknown', 'inductiveautomation.com/about/careers', 'Python stack fit; recruits Los Rios grads; entry-level pipeline', 'high', true),
  ('PowerSchool', 'Folsom', 'local', '~3,000 (Public)', 'public', 'K-12 education technology SaaS platform', true, 'Software Engineering Intern, Data Intern, QA Intern', 'medium', 'edtech', true, 'unknown', 'powerschool.com/company/careers', 'Flask background relevant; large structured intern cohort; close HQ', 'medium', true),
  ('Solidigm', 'Rancho Cordova', 'local', '~2,000 (Subsidiary)', 'subsidiary', 'SSD storage hardware; AI and data storage; local global HQ', true, 'Software Engineering Intern, Firmware Intern, Data Intern', 'low-med', 'hardware-semiconductor', true, 'unknown', 'solidigm.com/careers', 'Growing local HQ; systems-level fit; former Intel NAND culture', 'high', true),
  ('Visionary Integration Professionals', 'Sacramento', 'local', '~200 (Private)', 'private', 'IT consulting; DevOps and QA for CA state agencies', true, 'Junior Developer, QA Analyst, DevOps Intern', 'medium', 'it-consulting-govt', true, 'unknown', 'trustvip.com/careers', 'Govt consulting pairs with LDC role; Python and testing fit', 'medium', true),
  ('Capitol Tech Solutions', 'Sacramento', 'local', '~50 (Private)', 'private', 'Digital agency: web dev, custom software, data science', true, 'Web Developer Intern, Software Dev, Data Analyst', 'low', 'digital-agency', true, 'unknown', 'capitoltechsolutions.com', 'Flask, Python and web direct match; govt web work; small team', 'medium', true),
  ('Dorado Software', 'Sacramento', 'local', '~30-50 (Private)', 'private', 'Cloud infrastructure management software', true, 'Software Developer, QA, Backend Engineering', 'low', 'cloud-software', true, 'unknown', 'doradosoftware.com', 'Backend Python and Flask relevant; hands-on small team', 'medium', true),
  ('Lyles Services Co.', 'Sacramento', 'local', '~100-200 (Private)', 'private', 'Technology integration: building automation and IT', true, 'Software Intern, Project Engineer Intern, IT Intern', 'low', 'tech-integration', true, 'unknown', 'lylesservices.com', 'Hands-on technical work; systems thinking', 'medium', true),
  ('Parchment', 'Sacramento', 'local', '~200 (Subsidiary)', 'subsidiary', 'Digital credential and transcript platform (Instructure)', true, 'Software Engineering Intern, Data Engineer, Backend Dev', 'medium', 'edtech', true, 'unknown', 'parchment.com/careers', 'Database and web app experience relevant', 'medium', true),
  ('Protelo', 'Sacramento', 'local', '~30-40 (Private)', 'private', 'NetSuite and Acumatica ERP consulting', true, 'Junior Consultant, Developer, Data Migration Analyst', 'low', 'erp-consulting', true, 'unknown', 'proteloinc.com', 'Database and SQL skills relevant; practical ERP work', 'medium', true),
  ('Escape Technology', 'Folsom', 'local', '~20-40 (Private)', 'private', 'IT services and cloud solutions; Microsoft partner', true, 'IT Support, Cloud Solutions, Dev Intern', 'low', 'it-services', true, 'unknown', 'escapetechnology.com', 'Broad tech skills; close to Folsom', 'low', true),
  ('Ansync Labs', 'Sacramento', 'local', '~20-50 (Private)', 'private', 'Custom hardware and software product engineering', true, 'Software Engineering Intern, Embedded Dev Intern', 'low', 'hardware-software', true, 'unknown', 'ansync.com/careers', 'Full-stack and systems fit; versatile engineers valued', 'medium', true),
  ('Synectics', 'Sacramento', 'local', '~50-100 (Private)', 'private', 'Environmental data software and consulting', true, 'Software Developer, Data Analyst, Database Developer', 'low', 'data-software', true, 'unknown', 'synectics-inc.com', 'Python and data pipeline directly relevant; data focus', 'medium', true),
  ('Capio Group', 'Sacramento', 'local', '~50-100 (Private)', 'private', 'IT consulting and custom software for CA agencies', true, 'Software Developer, Full-Stack Dev, Database Developer', 'medium', 'it-consulting-govt', true, 'unknown', 'capiogroup.com', 'Python, Flask and database match; govt consulting fit', 'medium', true),
  ('Agreeya Solutions', 'Folsom', 'local', '~1,000+ (Private)', 'private', 'IT services, software development, staffing', true, 'Software Developer, QA Analyst, Data Analyst', 'medium', 'it-services', true, 'unknown', 'agreeya.com/careers', 'Broad tech skills; structured programs', 'medium', true),
  ('VSP Vision', 'Rancho Cordova', 'local', '~4,000+ (Private)', 'private', 'Vision insurance; large internal software and analytics', true, 'Software Engineering Intern, Data Analyst, QA, Web Developer', 'medium', 'healthcare-insurance', true, 'unknown', 'vspglobal.com/careers', 'Large local employer; analytics and web match; not finance', 'high', true),
  ('Intel', 'Folsom', 'local', '~6,000+ (Public)', 'public', 'Semiconductor R&D hub: graphics, AI, platform engineering', true, 'Software Engineering Intern, GPU Software Intern, Data Science Intern', 'medium', 'hardware-semiconductor', true, 'unknown', 'intel.com/jobs', 'Massive close campus; Python and systems fit; structured program', 'medium', true),
  ('Apple', 'Elk Grove', 'local', '~3,000+ (Public)', 'public', 'Operations, data engineering, supply chain analytics, AppleCare', true, 'Software Engineer Intern, Data Engineer, Operations Analyst', 'medium', 'consumer-tech', true, 'unknown', 'apple.com/careers', 'Literally in Elk Grove; data engineering match; strong resume', 'high', true),
  ('Hewlett Packard Enterprise', 'Roseville', 'local', 'Large (Public)', 'public', 'Enterprise servers, storage, networking, cloud', true, 'Software Engineering Intern, SDET Intern, Cloud Intern', 'medium', 'enterprise-tech', true, 'unknown', 'hpe.com/careers', 'Enterprise tech; Python and testing fit; structured cohort', 'medium', true),
  ('AMD', 'Roseville', 'local', 'Large (Public)', 'public', 'Semiconductors; server software automation', true, 'Software Engineering Intern, Automation Intern, QA Intern', 'medium', 'hardware-semiconductor', true, 'unknown', 'amd.com/careers', 'Server automation uses Python; testing experience fit', 'medium', true),
  ('Oracle', 'Rocklin / Folsom', 'local', 'Large (Public)', 'public', 'Enterprise software and cloud; database, OCI, SaaS', true, 'Software Engineering Intern, Cloud Intern, Database Intern', 'medium', 'enterprise-software', true, 'unknown', 'oracle.com/careers', 'Database coursework (CSC 134) and SQL directly relevant', 'medium', true),
  ('Micron Technology', 'Folsom', 'local', 'Large (Public)', 'public', 'Memory and storage semiconductors; engineering and R&D', true, 'Software/Firmware Engineering Intern, Data Analyst Intern', 'medium', 'hardware-semiconductor', true, 'unknown', 'micron.com/careers', 'Systems-level work; growing Folsom presence', 'medium', true),
  ('Agilent Technologies', 'Folsom', 'local', 'Large (Public)', 'public', 'Life sciences and diagnostics instrumentation', true, 'Software QA Intern, Manufacturing Tech, IT Intern', 'medium', 'life-sciences-instruments', true, 'unknown', 'careers.agilent.com', 'QA and testing relevant; strong employer', 'low', true),
  ('NTT Ltd', 'Sacramento', 'local', 'Large (Private)', 'private', 'Global IT infrastructure and managed services', true, 'Technology Operations Intern, Cloud Intern, IT Intern', 'medium', 'it-infrastructure', true, 'unknown', 'services.global.ntt/careers', 'Infrastructure and cloud exposure', 'low', true),
  ('Scribd', 'Sacramento / Remote', 'remote-ok', '~300-500 (Private)', 'private', 'Digital reading subscription platform', true, 'Software Engineer, Backend Dev, Data Engineer', 'low', 'consumer-tech', true, 'unknown', 'scribd.com/careers', 'Python and web stack relevant; remote-friendly roles', 'medium', true)
on conflict (name) do nothing;

-- ---------- Your preferences + scoring weights (only if none exist yet) ----------
-- (nearby_locations comes from migration 004 — apply migrations before seeding)
insert into preferences
  (target_locations, nearby_locations, remote_ok, keywords, role_types, season, excluded_sectors, excluded_keywords, needs_sponsorship, bg_risk_tolerance, scoring_weights)
select
  array['Elk Grove','Sacramento','Folsom','Rancho Cordova','Roseville','Rocklin','Davis'],
  array['San Francisco','SF','Bay Area','San Jose','Santa Clara','Sunnyvale','Mountain View','Palo Alto','Menlo Park','Redwood City','San Mateo','Foster City','South San Francisco','Oakland','Berkeley','Emeryville','Fremont','Milpitas','Cupertino','San Bruno','Burlingame','Pleasanton','San Ramon','Dublin, CA'],
  true,
  array['python','flask','django','sql','postgres','database','backend','full-stack','web','data','analytics','qa','test','software','javascript','react','node','drupal'],
  array['internship','co-op'],
  'Summer 2027',
  array['defense','finance','banking','law enforcement','corrections'],
  array['security clearance','clearance','defense','lockheed','raytheon','northrop','sierra nevada','l3 harris','kratos','bank','credit union','goldman','jpmorgan','morgan stanley','fintech','police','sheriff','corrections','classified'],
  false,
  'medium',
  '{"location":30,"nearby":20,"remote":18,"focus":25,"keyword_each":6,"keyword_cap":24,"role":12,"fresh_14d":10,"fresh_30d":6}'::jsonb
where not exists (select 1 from preferences);

-- ---------- Starter opportunities for focus companies ----------
-- Rolling by default (no invented deadlines). Edit them from the detail page,
-- or click "Import from swelist" to pull live postings scored to your profile.
insert into opportunities
  (external_id, company_id, company_name_raw, title, role_type, season, locations, work_mode, source, source_url, is_rolling, status, fit_score, eligibility_flag)
values
  ('seed-solidigm',   (select id from companies where name='Solidigm'),               'Solidigm',               'Software Engineering Intern', 'internship', 'Summer 2026', array['Rancho Cordova, CA'], 'onsite', 'manual', 'https://solidigm.com/careers', true, 'interested', 94, 'clear'),
  ('seed-inductive',  (select id from companies where name='Inductive Automation'),   'Inductive Automation',   'Software Technical Analyst',  'internship', 'Summer 2026', array['Folsom, CA'],         'onsite', 'manual', 'https://inductiveautomation.com/about/careers', true, 'preparing', 91, 'clear'),
  ('seed-apple',      (select id from companies where name='Apple'),                  'Apple',                  'Data Engineer Intern',        'internship', 'Summer 2026', array['Elk Grove, CA'],      'onsite', 'manual', 'https://apple.com/careers', true, 'applied',   89, 'review'),
  ('seed-powerschool',(select id from companies where name='PowerSchool'),            'PowerSchool',            'Software Engineering Intern', 'internship', 'Summer 2026', array['Folsom, CA'],         'onsite', 'manual', 'https://powerschool.com/company/careers', true, 'interested', 88, 'review'),
  ('seed-capitol',    (select id from companies where name='Capitol Tech Solutions'), 'Capitol Tech Solutions', 'Web Developer Intern',        'internship', 'Summer 2026', array['Sacramento, CA'],     'onsite', 'manual', 'https://capitoltechsolutions.com', true, 'interested', 78, 'clear'),
  ('seed-synectics',  (select id from companies where name='Synectics'),              'Synectics',              'Software Developer',          'internship', 'Summer 2026', array['Sacramento, CA'],     'onsite', 'manual', 'https://synectics-inc.com', true, 'interested', 74, 'clear'),
  ('seed-parchment',  (select id from companies where name='Parchment'),              'Parchment',              'Backend Developer Intern',    'internship', 'Summer 2026', array['Sacramento, CA'],     'onsite', 'manual', 'https://parchment.com/careers', true, 'applied',   71, 'review'),
  ('seed-dorado',     (select id from companies where name='Dorado Software'),        'Dorado Software',        'Backend Engineering Intern',  'internship', 'Summer 2026', array['Sacramento, CA'],     'onsite', 'manual', 'https://doradosoftware.com', true, 'interested', 66, 'clear')
on conflict (external_id) do nothing;

-- ---------- Company ATS wiring (feeds the nightly per-company import) ----------
update companies set ats_type='ashby',           ats_slug='inductive-automation-llc'                where name='Inductive Automation';
update companies set ats_type='ashby',           ats_slug='ScribdInc'                                where name='Scribd';
update companies set ats_type='ashby',           ats_slug='instructure'                              where name='Parchment';
update companies set ats_type='smartrecruiters', ats_slug='Solidigm'                                 where name='Solidigm';
update companies set ats_type='workday',         ats_slug='hpe.wd5.myworkdayjobs.com/Jobsathpe'      where name='Hewlett Packard Enterprise';
update companies set ats_type='workday',         ats_slug='micron.wd1.myworkdayjobs.com/External'    where name='Micron Technology';
update companies set ats_type='workday',         ats_slug='vsp.wd1.myworkdayjobs.com/VSPVisionCareers' where name='VSP Vision';
update companies set ats_type='icims'  where name='PowerSchool';
update companies set ats_type='custom' where name in ('AMD','Intel','Apple','Oracle');
