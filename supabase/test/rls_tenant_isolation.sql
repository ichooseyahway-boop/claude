-- Cross-tenant isolation tests.
--
-- PRD refs: 16.2 (tenant-isolation tests), 20.3 (security release tests),
-- mandatory E2E scenarios 5 and 6.
--
-- Run against a database with the migrations applied and `auth_stub.sql`
-- loaded. Each assertion sets the acting user via `request.jwt.claim.sub` and
-- checks what that user can actually SELECT through RLS — not what the
-- application chooses to show them.
--
-- Any failure raises an exception, so the script exits non-zero under
-- `psql -v ON_ERROR_STOP=1` and fails CI.

begin;

-- A role that is subject to RLS. The superuser bypasses it, so testing as the
-- owner would prove nothing.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end;
$$;

grant usage on schema public to app_authenticated;
grant select, insert, update on all tables in schema public to app_authenticated;
grant usage on schema auth to app_authenticated;
grant select on auth.users to app_authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures: two unrelated customer organizations and one internal analyst.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.ca'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.ca'),
  ('33333333-3333-3333-3333-333333333333', 'analyst@example.ca'),
  ('44444444-4444-4444-4444-444444444444', 'billing-a@example.ca'),
  ('55555555-5555-5555-5555-555555555555', 'platform-owner@example.ca');

insert into profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Client Owner A'),
  ('22222222-2222-2222-2222-222222222222', 'Client Owner B'),
  ('33333333-3333-3333-3333-333333333333', 'Analyst'),
  ('44444444-4444-4444-4444-444444444444', 'Billing Admin A'),
  ('55555555-5555-5555-5555-555555555555', 'Platform Owner');

insert into organizations (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'org-b'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Internal', 'internal');

insert into memberships (organization_id, user_id, role, accepted_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'client_owner', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'client_owner', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'analyst', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'billing_admin', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'platform_owner', now());

-- A fixture-only package code, so the suite runs against a database that has
-- already loaded seed.sql without colliding on `service_packages.code`.
insert into service_packages
  (id, code, name_en, name_fr, billing_type, reference_amount_minor, entitlement)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'rls_fixture_package', 'Fixture',
   'Fixture', 'one_time', 49500, '{"systems":1}'::jsonb);

insert into orders
  (organization_id, service_package_id, status, total_minor, idempotency_key)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'paid', 49500, 'idem-a-1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'paid', 49500, 'idem-b-1');

insert into projects (id, organization_id, name, package_snapshot) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Project A', '{}'::jsonb),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Project B', '{}'::jsonb);

insert into audit_plans (id, organization_id, project_id, version, scenario_limit) values
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 1, 25),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 1, 25);

insert into test_runs (id, organization_id, project_id, audit_plan_id, state) values
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'released'),
  ('b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'released');

insert into findings
  (organization_id, project_id, test_run_id, reference, severity, dimension,
   title, summary, expected_behaviour, observed_behaviour, customer_impact,
   recommended_remediation, confidence, internal_notes)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'F-001', 'high', 'factual_policy_accuracy',
   'A finding', 'summary', 'expected', 'observed', 'impact', 'remediation', 'high',
   'INTERNAL ONLY - analyst note'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
   'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 'F-001', 'low', 'empathy_and_tone',
   'B finding', 'summary', 'expected', 'observed', 'impact', 'remediation', 'high',
   'INTERNAL ONLY - analyst note');

-- Two reports for Org A: one released, one still a draft.
insert into reports
  (organization_id, project_id, test_run_id, family_id, version, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'a4a4a4a4-a4a4-a4a4-a4a4-a4a4a4a4a4a4', 1, 'released'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'a5a5a5a5-a5a5-a5a5-a5a5-a5a5a5a5a5a5', 1, 'draft');

insert into comments
  (organization_id, object_type, object_id, author_id, visibility, content)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'project',
   'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '33333333-3333-3333-3333-333333333333',
   'internal', 'Internal analyst discussion'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'project',
   'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '33333333-3333-3333-3333-333333333333',
   'customer', 'Customer-visible note');

insert into audit_events (actor_type, actor_id, organization_id, action, outcome)
values ('user', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'project.viewed', 'success');

insert into evaluation_versions
  (rubric_version, prompt_version, provider, model_identifier, json_schema_version)
values ('default@1.0.0', 'evaluator@1.0.0', 'test', 'test-model', '1.0');

-- ---------------------------------------------------------------------------
-- Assertion helper
-- ---------------------------------------------------------------------------

create or replace function assert_equals(
  actual bigint, expected bigint, label text
) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', label, expected, actual;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

set role app_authenticated;

-- ---------------------------------------------------------------------------
-- 1. A client cannot read another organization's project by changing an ID.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select assert_equals(
  (select count(*) from projects), 1,
  'Client A sees exactly one project'
);
select assert_equals(
  (select count(*) from projects
   where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'), 0,
  'Client A cannot read Org B project by ID'
);
select assert_equals(
  (select count(*) from findings
   where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'Client A cannot read Org B findings'
);
select assert_equals(
  (select count(*) from test_runs
   where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0,
  'Client A cannot read Org B runs'
);

-- ---------------------------------------------------------------------------
-- 2. A client never sees unreleased reports.
-- ---------------------------------------------------------------------------
select assert_equals(
  (select count(*) from reports), 1,
  'Client A sees only the released report, not the draft'
);
select assert_equals(
  (select count(*) from reports where status = 'draft'), 0,
  'Client A cannot read a draft report'
);

-- ---------------------------------------------------------------------------
-- 3. Internal analyst notes are not readable by a client.
-- ---------------------------------------------------------------------------
select assert_equals(
  (select count(*) from comments where visibility = 'internal'), 0,
  'Client A cannot read internal comments'
);
select assert_equals(
  (select count(*) from comments where visibility = 'customer'), 1,
  'Client A can read customer-visible comments'
);

-- ---------------------------------------------------------------------------
-- 4. AI proposals, scenario templates and audit events are internal only.
-- ---------------------------------------------------------------------------
select assert_equals(
  (select count(*) from evaluation_versions), 0,
  'Client A cannot read evaluator versions'
);
select assert_equals(
  (select count(*) from audit_events), 0,
  'Client A cannot read the audit event log'
);
select assert_equals(
  (select count(*) from billing_events), 0,
  'Client A cannot read billing provider events'
);

-- ---------------------------------------------------------------------------
-- 5. A billing-only member cannot reach audit content (7.6).
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select assert_equals(
  (select count(*) from orders), 1,
  'Billing admin can read their organization orders'
);
select assert_equals(
  (select count(*) from findings), 0,
  'Billing admin cannot read findings'
);
select assert_equals(
  (select count(*) from reports), 0,
  'Billing admin cannot read reports'
);
select assert_equals(
  (select count(*) from projects), 0,
  'Billing admin cannot read projects'
);

-- ---------------------------------------------------------------------------
-- 6. Symmetry: Org B sees only its own data.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select assert_equals(
  (select count(*) from findings), 1,
  'Client B sees exactly one finding'
);
select assert_equals(
  (select count(*) from findings
   where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0,
  'Client B cannot read Org A findings'
);

-- ---------------------------------------------------------------------------
-- 7. An internal analyst can see operational data across organizations.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select assert_equals(
  (select count(*) from projects), 2,
  'Analyst sees both projects'
);
select assert_equals(
  (select count(*) from comments where visibility = 'internal'), 1,
  'Analyst can read internal comments'
);
select assert_equals(
  (select count(*) from reports), 2,
  'Analyst can read draft and released reports'
);

-- ---------------------------------------------------------------------------
-- 8. Only the platform owner reads the audit log and billing events.
-- ---------------------------------------------------------------------------
select assert_equals(
  (select count(*) from audit_events), 0,
  'A plain analyst cannot read the audit event log'
);

set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select assert_equals(
  (select count(*) from audit_events), 1,
  'Platform owner can read the audit event log'
);

-- ---------------------------------------------------------------------------
-- 9. An unauthenticated session sees nothing tenant-owned.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '';

select assert_equals(
  (select count(*) from projects), 0,
  'Anonymous session sees no projects'
);
select assert_equals(
  (select count(*) from findings), 0,
  'Anonymous session sees no findings'
);
select assert_equals(
  (select count(*) from reports), 0,
  'Anonymous session sees no reports'
);

reset role;

-- ---------------------------------------------------------------------------
-- 10. Immutability of captured content and released reports (12.7).
-- ---------------------------------------------------------------------------
do $$
declare
  ok boolean := false;
begin
  begin
    update reports
      set score = 99
      where status = 'released';
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'FAIL: a released report was mutable';
  end if;
  raise notice 'PASS: released reports are immutable';
end;
$$;

do $$
declare
  ok boolean := false;
begin
  begin
    update audit_events set outcome = 'denied';
  exception when others then
    ok := true;
  end;
  if not ok then
    raise exception 'FAIL: audit events were mutable';
  end if;
  raise notice 'PASS: audit events are append-only';
end;
$$;

rollback;
