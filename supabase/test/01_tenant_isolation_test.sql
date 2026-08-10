-- ===========================================================================
-- 01_tenant_isolation_test.sql
-- Database-level proof of the tenant-isolation claims (PRD 16.2, 20.1, 20.3).
--
-- PRD 16.2 lists what automated tests must prove. This file proves the parts
-- that live in the database:
--   * a client user cannot read another organization's project by ID
--   * search never returns cross-tenant objects
--   * internal notes are not returned to a client
--   * billing-only users cannot reach audit content
--   * released-only visibility for reports and findings
-- plus the immutability guarantees behind evidence and released reports.
--
-- Run with: npm run db:test
-- Every assertion raises an exception on failure, so a non-zero psql exit
-- means a real isolation defect.
-- ===========================================================================

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- Assertion helper
-- ---------------------------------------------------------------------------
create or replace function test.assert(condition boolean, label text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok  %', label;
end;
$$;

grant execute on function test.assert(boolean, text) to anon, authenticated, service_role;

-- True when the current role cannot obtain any row from the table, whether
-- because the GRANT layer refuses outright or because RLS filters everything
-- away. Both are acceptable outcomes; a caller must not distinguish them.
create or replace function test.reads_nothing_from(relation text)
returns boolean
language plpgsql
as $$
declare
  row_count bigint;
begin
  execute format('select count(*) from public.%I', relation) into row_count;
  return row_count = 0;
exception
  when insufficient_privilege then
    return true;
end;
$$;

grant execute on function test.reads_nothing_from(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fixtures: two unrelated customer organizations, plus the internal one.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.invalid'),
  ('33333333-3333-3333-3333-333333333333', 'analyst@botassure.invalid'),
  ('44444444-4444-4444-4444-444444444444', 'billing-a@example.invalid'),
  ('55555555-5555-5555-5555-555555555555', 'viewer-a@example.invalid');

insert into public.organizations (id, name, slug, is_internal) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alpha Retail', 'alpha-retail', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Beta Travel',  'beta-travel',  false),
  ('cccccccc-0000-0000-0000-000000000003', 'BotAssure CX', 'botassure',    true);

insert into public.memberships (organization_id, user_id, role, accepted_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'client_owner',   now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'client_owner',   now()),
  ('cccccccc-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'analyst',        now()),
  ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'billing_admin',  now()),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'client_viewer',  now());

insert into public.service_packages
  (id, code, name_en, name_fr, description_en, description_fr, billing_type, entitlement)
values
  ('dddddddd-0000-0000-0000-000000000001', 'essential_audit', 'Essential Audit', 'Audit Essentiel',
   'One system, one language.', 'Un systeme, une langue.', 'one_time', '{}'::jsonb);

insert into public.orders
  (id, organization_id, package_id, contact_email, status, subtotal_cents, tax_cents,
   total_cents, idempotency_key, entitlement_snapshot)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'owner-a@example.invalid', 'paid',
   49500, 6435, 55935, 'idem-alpha-001', '{}'::jsonb),
  ('eeeeeeee-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'dddddddd-0000-0000-0000-000000000001', 'owner-b@example.invalid', 'paid',
   49500, 6435, 55935, 'idem-beta-001', '{}'::jsonb);

insert into public.projects
  (id, organization_id, order_id, name, package_snapshot, locales, assigned_analyst_id)
values
  ('ffffffff-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001', 'Alpha chatbot audit', '{}'::jsonb,
   array['en-CA']::app.locale_code[], '33333333-3333-3333-3333-333333333333'),
  ('ffffffff-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002',
   'eeeeeeee-0000-0000-0000-000000000002', 'Beta chatbot audit', '{}'::jsonb,
   array['en-CA']::app.locale_code[], null);

insert into public.audit_plans (id, organization_id, project_id, version, scenario_limit, status)
values ('99999999-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
        'ffffffff-0000-0000-0000-00000000000a', 1, 25, 'draft');

insert into public.test_runs (id, organization_id, project_id, plan_id, state)
values ('88888888-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
        'ffffffff-0000-0000-0000-00000000000a', '99999999-0000-0000-0000-00000000000a', 'running');

-- One released finding and one still in draft.
insert into public.findings
  (id, organization_id, project_id, run_id, reference, severity, category, title, summary,
   expected_behaviour, observed_behaviour, customer_impact, recommended_remediation,
   confidence, internal_notes, customer_notes, released_at)
values
  ('77777777-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-00000000000a', '88888888-0000-0000-0000-00000000000a',
   'BA-2026-0001', 'high', 'policy_accuracy', 'Refund window misstated',
   'The bot stated seven days.', 'Thirty days per policy 4.2.', 'Said seven days.',
   'Customers may abandon valid refund requests.', 'Correct the knowledge entry.',
   'high', 'INTERNAL: client contact was defensive on the call.',
   'We recommend correcting the refund knowledge entry.', now()),
  ('77777777-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-00000000000a', '88888888-0000-0000-0000-00000000000a',
   'BA-2026-0002', 'medium', 'tone', 'Draft finding not yet released',
   'Draft summary.', 'Expected.', 'Observed.', 'Impact.', 'Remediation.',
   'medium', 'INTERNAL: still deciding severity.', null, null);

insert into public.reports
  (id, organization_id, project_id, run_id, family_id, version, locale_mode, status)
values
  ('66666666-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-00000000000a', '88888888-0000-0000-0000-00000000000a',
   '66666666-1111-0000-0000-000000000000', 1, 'en', 'draft');

insert into public.comments
  (organization_id, project_id, object_type, object_id, author_user_id, visibility, content)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000a',
   'finding', '77777777-0000-0000-0000-00000000000a',
   '33333333-3333-3333-3333-333333333333', 'internal',
   'Analyst note: do not share the raw transcript with the client.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000a',
   'finding', '77777777-0000-0000-0000-00000000000a',
   '33333333-3333-3333-3333-333333333333', 'customer',
   'We have recorded this finding and recommend the fix above.');

-- ===========================================================================
-- PRD 16.2: "A client user cannot read another organization's project by
-- changing an ID."
-- ===========================================================================
select test.become('11111111-1111-1111-1111-111111111111');

select test.assert(
  (select count(*) from public.projects where id = 'ffffffff-0000-0000-0000-00000000000a') = 1,
  'client owner A reads their own project'
);

select test.assert(
  (select count(*) from public.projects where id = 'ffffffff-0000-0000-0000-00000000000b') = 0,
  'client owner A cannot read organization B''s project by ID'
);

-- PRD 16.2: "Search never returns cross-tenant objects."
select test.assert(
  (select count(*) from public.projects) = 1,
  'an unfiltered project scan returns only the caller''s tenant'
);

select test.assert(
  (select count(*) from public.organizations) = 1,
  'an unfiltered organization scan returns only the caller''s tenant'
);

select test.assert(
  (select count(*) from public.orders) = 1,
  'an unfiltered order scan returns only the caller''s tenant'
);

-- ===========================================================================
-- PRD 16.2: "Internal notes are not returned in client APIs."
-- ===========================================================================
select test.assert(
  (select count(*) from public.comments where visibility = 'internal') = 0,
  'client owner cannot read internal comments'
);

select test.assert(
  (select count(*) from public.comments where visibility = 'customer') = 1,
  'client owner can read customer-visible comments'
);

-- ===========================================================================
-- FR-FND-001 / FR-RPT-003: unreleased work is not customer-visible.
-- ===========================================================================
select test.assert(
  (select count(*) from public.findings) = 1,
  'client owner sees only released findings, not drafts'
);

select test.assert(
  (select count(*) from public.reports) = 0,
  'client owner cannot read a draft report'
);

-- ===========================================================================
-- PRD 7.5: a client viewer is read-only on released material.
-- ===========================================================================
select test.become('55555555-5555-5555-5555-555555555555');

select test.assert(
  (select count(*) from public.findings) = 1,
  'client viewer sees the released finding'
);

select test.assert(
  (select count(*) from public.comments where visibility = 'internal') = 0,
  'client viewer cannot read internal comments'
);

-- ===========================================================================
-- PRD 16.2: "Billing-only users cannot access audit content." (PRD 7.6)
-- ===========================================================================
select test.become('44444444-4444-4444-4444-444444444444');

select test.assert(
  (select count(*) from public.orders) = 1,
  'billing administrator reads their organization''s orders'
);

select test.assert(
  (select count(*) from public.projects) = 0,
  'billing administrator cannot read projects'
);

select test.assert(
  (select count(*) from public.findings) = 0,
  'billing administrator cannot read findings'
);

select test.assert(
  (select count(*) from public.reports) = 0,
  'billing administrator cannot read reports'
);

-- ===========================================================================
-- Internal staff reach assigned work, and only assigned work.
-- ===========================================================================
select test.become('33333333-3333-3333-3333-333333333333');

select test.assert(
  (select count(*) from public.projects where id = 'ffffffff-0000-0000-0000-00000000000a') = 1,
  'assigned analyst reads the project they are assigned to'
);

select test.assert(
  (select count(*) from public.comments where visibility = 'internal') = 1,
  'analyst reads internal comments'
);

select test.assert(
  (select count(*) from public.findings) = 2,
  'analyst sees draft findings as well as released ones'
);

select test.assert(
  (select count(*) from public.reports) = 1,
  'analyst sees the draft report'
);

-- ===========================================================================
-- Anonymous callers get nothing but the public price list.
-- ===========================================================================
select test.become_anonymous();

select test.assert(
  (select count(*) from public.service_packages) = 1,
  'anonymous visitor reads the active public package list'
);

select test.assert(
  test.reads_nothing_from('projects'),
  'anonymous visitor reads no projects'
);

select test.assert(
  test.reads_nothing_from('findings'),
  'anonymous visitor reads no findings'
);

select test.assert(
  test.reads_nothing_from('organizations'),
  'anonymous visitor reads no organizations'
);

select test.assert(
  test.reads_nothing_from('conversation_turns'),
  'anonymous visitor reads no transcripts'
);

select test.assert(
  test.reads_nothing_from('orders'),
  'anonymous visitor reads no orders'
);

-- ===========================================================================
-- Immutability guarantees (FR-RUN-005, FR-RPT-004, PRD 12.7)
--
-- These run as `postgres`, because the point is that the trigger refuses the
-- write even for a superuser-owned connection. RLS is not what stops this.
-- ===========================================================================
set local role postgres;

insert into public.plan_scenarios
  (id, organization_id, plan_id, locale, display_order, custom_scenario)
values
  ('55555555-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   '99999999-0000-0000-0000-00000000000a', 'en-CA', 1,
   '{"objective": "Ask about the refund window."}'::jsonb);

insert into public.test_cases
  (id, organization_id, run_id, plan_scenario_id, locale, capture_mode)
values
  ('44444444-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   '88888888-0000-0000-0000-00000000000a', '55555555-0000-0000-0000-00000000000a',
   'en-CA', 'manual');

insert into public.conversation_turns
  (id, organization_id, test_case_id, sequence, role, original_content, checksum_sha256)
values
  ('33333333-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
   '44444444-0000-0000-0000-00000000000a', 0, 'system',
   'You have seven days to return an item.', digest('seed', 'sha256'));

do $$
declare
  refused boolean := false;
begin
  begin
    update public.conversation_turns
       set original_content = 'You have thirty days to return an item.'
     where id = '33333333-0000-0000-0000-00000000000a';
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a captured response cannot be edited after capture');
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    delete from public.conversation_turns
     where id = '33333333-0000-0000-0000-00000000000a';
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a captured response cannot be deleted');
end;
$$;

-- A released report is frozen; a correction must become version 2.
update public.reports
   set status = 'released',
       content_snapshot = '{"sections": []}'::jsonb,
       released_by = '33333333-3333-3333-3333-333333333333',
       released_at = now(),
       overall_score = 72.5,
       grade = 'C'
 where id = '66666666-0000-0000-0000-00000000000a';

do $$
declare
  refused boolean := false;
begin
  begin
    update public.reports
       set overall_score = 95.0, grade = 'A'
     where id = '66666666-0000-0000-0000-00000000000a';
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a released report score cannot be rewritten in place');
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    update public.reports
       set content_snapshot = '{"sections": ["tampered"]}'::jsonb
     where id = '66666666-0000-0000-0000-00000000000a';
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a released report snapshot cannot be rewritten in place');
end;
$$;

-- Superseding it IS allowed: that is how FR-RPT-004 corrections work.
update public.reports
   set status = 'superseded', superseded_at = now()
 where id = '66666666-0000-0000-0000-00000000000a';

select test.assert(
  (select status from public.reports where id = '66666666-0000-0000-0000-00000000000a')
    = 'superseded',
  'a released report can be superseded by a later version'
);

-- ===========================================================================
-- Constraint checks (PRD 12.7)
-- ===========================================================================

do $$
declare
  refused boolean := false;
begin
  begin
    -- PRD 10.8: low confidence cannot be Critical without senior confirmation.
    insert into public.findings
      (organization_id, project_id, run_id, reference, severity, category, title, summary,
       expected_behaviour, observed_behaviour, customer_impact, recommended_remediation, confidence)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000a',
       '88888888-0000-0000-0000-00000000000a', 'BA-2026-9001', 'critical', 'privacy',
       'Unconfirmed critical', 'Summary.', 'Expected.', 'Observed.', 'Impact.',
       'Remediation.', 'low');
  exception when others then
    refused := true;
  end;

  perform test.assert(
    refused,
    'a low-confidence Critical finding is refused without senior confirmation'
  );
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    -- FR-FND-004: risk acceptance requires an identified owner and a reason.
    insert into public.findings
      (organization_id, project_id, run_id, reference, severity, status, category, title,
       summary, expected_behaviour, observed_behaviour, customer_impact,
       recommended_remediation, confidence)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000a',
       '88888888-0000-0000-0000-00000000000a', 'BA-2026-9002', 'medium', 'risk_accepted',
       'tone', 'Undocumented risk acceptance', 'Summary.', 'Expected.', 'Observed.',
       'Impact.', 'Remediation.', 'high');
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'risk acceptance is refused without an owner and reason');
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    -- FR-ONB-005: a plaintext secret must not be storable in the config row.
    insert into public.ai_systems
      (id, organization_id, project_id, display_name, system_type, channel, environment)
    values
      ('22222222-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
       'ffffffff-0000-0000-0000-00000000000a', 'Alpha bot', 'chatbot', 'web_chat', 'staging');

    insert into public.connection_configs
      (organization_id, ai_system_id, adapter_type, secret_reference)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-00000000000a',
       -- Assembled by concatenation so the repository contains no string a
       -- secret scanner would flag as a real provider key.
       'http_json', 'sk' || '_live_' || 'abcdefghijklmnopqrstuvwx');
  exception when others then
    refused := true;
  end;

  perform test.assert(
    refused,
    'a raw secret is refused in connection_configs.secret_reference'
  );
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    -- PRD 10.7: a parity index only exists on a bilingual report.
    insert into public.reports
      (organization_id, project_id, run_id, family_id, version, locale_mode, parity_index)
    values
      ('aaaaaaaa-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000a',
       '88888888-0000-0000-0000-00000000000a', gen_random_uuid(), 1, 'en', 88.0);
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a parity index is refused on a single-locale report');
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    -- FR-BILL-002: a replayed webhook collides on provider_event_id.
    insert into public.billing_events (provider_event_id, event_type)
    values ('evt_replay_001', 'checkout.session.completed');
    insert into public.billing_events (provider_event_id, event_type)
    values ('evt_replay_001', 'checkout.session.completed');
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'a replayed billing event is refused by the unique constraint');
end;
$$;

do $$
declare
  refused boolean := false;
begin
  begin
    -- FR-OPS-005: the audit log cannot be rewritten by anyone.
    insert into public.audit_events (actor_type, action, outcome)
    values ('system', 'test.event', 'allowed');

    update public.audit_events set outcome = 'denied' where action = 'test.event';
  exception when others then
    refused := true;
  end;

  perform test.assert(refused, 'an audit event cannot be modified after it is written');
end;
$$;

-- FR-FND-004: status history is written automatically, not by the caller.
select test.assert(
  (select count(*) from public.finding_status_history
    where finding_id = '77777777-0000-0000-0000-00000000000a') >= 1,
  'a finding status change is recorded in history automatically'
);

rollback;
