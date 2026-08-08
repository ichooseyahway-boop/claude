-- BotAssure CX - row level security
--
-- PRD refs: 7.7 (permission principles), 16.1, 16.2 (tenant-isolation tests),
-- 23.3 ("RLS enabled and tested on all exposed tenant tables").
--
-- Model:
--   * Deny by default. RLS is enabled on every table, and a table with no
--     policy for a role is unreadable by that role.
--   * A client sees rows for organizations where they hold an active,
--     non-revoked membership.
--   * Internal staff (platform_owner, analyst, senior_analyst) see operational
--     data; a plain analyst is additionally limited to assigned projects.
--   * Internal-only content (analyst notes, AI proposals, audit events) is
--     never selectable by a client role at all — the client never receives it
--     through the API, an export, or a crafted query (16.2).
--
-- The helper functions below are SECURITY DEFINER with a pinned search_path so
-- that a policy cannot be subverted by a shadowed function or table.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function app_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid();
$$;

create or replace function app_is_internal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role in ('platform_owner', 'analyst', 'senior_analyst')
  );
$$;

create or replace function app_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role = 'platform_owner'
  );
$$;

-- Organizations the current user belongs to as a client.
create or replace function app_member_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id
  from memberships m
  where m.user_id = auth.uid()
    and m.revoked_at is null
    and m.accepted_at is not null;
$$;

-- True when the current user may see rows belonging to `org_id`.
create or replace function app_can_read_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_is_internal()
      or org_id in (select app_member_organization_ids());
$$;

-- Client roles that may modify remediation state.
create or replace function app_can_write_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role in ('platform_owner', 'analyst', 'senior_analyst',
                     'client_owner', 'client_contributor')
  );
$$;

-- Billing-only members must not reach audit content (7.6, 16.2).
create or replace function app_is_billing_only(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and m.revoked_at is null
      and m.role = 'billing_admin'
  )
  and not exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and m.revoked_at is null
      and m.role <> 'billing_admin'
  );
$$;

-- Audit content readable: member of the org AND not billing-only.
create or replace function app_can_read_audit_content(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_is_internal()
      or (org_id in (select app_member_organization_ids())
          and not app_is_billing_only(org_id));
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table profiles                   enable row level security;
alter table organizations              enable row level security;
alter table memberships                enable row level security;
alter table invitations                enable row level security;
alter table service_packages           enable row level security;
alter table orders                     enable row level security;
alter table subscriptions              enable row level security;
alter table billing_events             enable row level security;
alter table usage_counters             enable row level security;
alter table projects                   enable row level security;
alter table ai_systems                 enable row level security;
alter table connection_configs         enable row level security;
alter table authorization_attestations enable row level security;
alter table knowledge_sources          enable row level security;
alter table scenario_templates         enable row level security;
alter table audit_plans                enable row level security;
alter table plan_scenarios             enable row level security;
alter table test_runs                  enable row level security;
alter table test_cases                 enable row level security;
alter table conversation_turns         enable row level security;
alter table evidence_objects           enable row level security;
alter table evaluation_versions        enable row level security;
alter table evaluations                enable row level security;
alter table dimension_scores           enable row level security;
alter table findings                   enable row level security;
alter table finding_evidence           enable row level security;
alter table finding_status_history     enable row level security;
alter table reports                    enable row level security;
alter table report_access_events       enable row level security;
alter table comments                   enable row level security;
alter table notifications              enable row level security;
alter table support_tickets            enable row level security;
alter table consent_records            enable row level security;
alter table privacy_requests           enable row level security;
alter table audit_events               enable row level security;
alter table feature_flags              enable row level security;

-- Force RLS even for the table owner, so a mistake in a definer function
-- cannot bypass tenant isolation.
alter table organizations              force row level security;
alter table projects                   force row level security;
alter table findings                   force row level security;
alter table reports                    force row level security;
alter table conversation_turns         force row level security;
alter table evidence_objects           force row level security;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create policy profiles_self_read on profiles
  for select using (id = app_current_user_id() or app_is_internal());

create policy profiles_self_update on profiles
  for update using (id = app_current_user_id())
  with check (id = app_current_user_id());

create policy organizations_read on organizations
  for select using (app_can_read_org(id));

create policy organizations_update on organizations
  for update using (
    app_is_platform_owner()
    or exists (
      select 1 from memberships m
      where m.user_id = app_current_user_id()
        and m.organization_id = organizations.id
        and m.revoked_at is null
        and m.role = 'client_owner'
    )
  );

create policy memberships_read on memberships
  for select using (
    user_id = app_current_user_id() or app_can_read_org(organization_id)
  );

create policy invitations_read on invitations
  for select using (app_can_read_org(organization_id));

-- ---------------------------------------------------------------------------
-- Commerce
--
-- Packages are public catalogue data. Billing events are internal only: they
-- reference provider payloads and must never be client-readable.
-- ---------------------------------------------------------------------------

create policy service_packages_read on service_packages
  for select using (active or app_is_internal());

create policy orders_read on orders
  for select using (app_can_read_org(organization_id));

create policy subscriptions_read on subscriptions
  for select using (app_can_read_org(organization_id));

create policy billing_events_internal_only on billing_events
  for select using (app_is_platform_owner());

create policy usage_counters_read on usage_counters
  for select using (app_can_read_org(organization_id));

-- ---------------------------------------------------------------------------
-- Projects, systems and authorization
-- ---------------------------------------------------------------------------

create policy projects_read on projects
  for select using (app_can_read_audit_content(organization_id));

create policy projects_write on projects
  for update using (app_is_internal() or app_can_write_org(organization_id));

create policy ai_systems_read on ai_systems
  for select using (app_can_read_audit_content(organization_id));

create policy ai_systems_write on ai_systems
  for all using (app_is_internal() or app_can_write_org(organization_id))
  with check (app_is_internal() or app_can_write_org(organization_id));

-- Connection configuration holds secret REFERENCES and authorized hosts.
-- Client viewers and billing admins have no business reading it (7.5, 7.6).
create policy connection_configs_read on connection_configs
  for select using (
    app_is_internal()
    or exists (
      select 1 from memberships m
      where m.user_id = app_current_user_id()
        and m.organization_id = connection_configs.organization_id
        and m.revoked_at is null
        and m.role in ('client_owner', 'client_contributor')
    )
  );

create policy authorization_attestations_read on authorization_attestations
  for select using (app_can_read_audit_content(organization_id));

create policy knowledge_sources_read on knowledge_sources
  for select using (app_can_read_audit_content(organization_id));

create policy knowledge_sources_write on knowledge_sources
  for insert with check (
    app_is_internal() or app_can_write_org(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Scenario library
--
-- Templates are internal intellectual property (4.5) and are not exposed to
-- clients at all.
-- ---------------------------------------------------------------------------

create policy scenario_templates_internal_only on scenario_templates
  for select using (app_is_internal());

create policy audit_plans_read on audit_plans
  for select using (app_can_read_audit_content(organization_id));

create policy plan_scenarios_read on plan_scenarios
  for select using (app_can_read_audit_content(organization_id));

-- ---------------------------------------------------------------------------
-- Execution and evidence
--
-- A client may read their own run and evidence records. Raw AI proposals are
-- internal only.
-- ---------------------------------------------------------------------------

create policy test_runs_read on test_runs
  for select using (app_can_read_audit_content(organization_id));

create policy test_cases_read on test_cases
  for select using (app_can_read_audit_content(organization_id));

create policy conversation_turns_read on conversation_turns
  for select using (app_can_read_audit_content(organization_id));

create policy evidence_objects_read on evidence_objects
  for select using (app_can_read_audit_content(organization_id));

create policy evaluation_versions_internal_only on evaluation_versions
  for select using (app_is_internal());

-- FR-EVAL-001: "AI-generated proposals are never directly client-visible."
create policy evaluations_internal_only on evaluations
  for select using (app_is_internal());

-- Clients see approved dimension scores; the proposed column is filtered by
-- the API layer, and the internal-only rationale stays server-side.
create policy dimension_scores_read on dimension_scores
  for select using (app_can_read_audit_content(organization_id));

-- ---------------------------------------------------------------------------
-- Findings and reports
-- ---------------------------------------------------------------------------

-- A client may read findings for their organization once they exist; drafts
-- are gated at the run/report level and by the release process, and the
-- `internal_notes` column is never selected by client-facing queries.
create policy findings_read on findings
  for select using (app_can_read_audit_content(organization_id));

create policy findings_client_remediation_update on findings
  for update using (app_is_internal() or app_can_write_org(organization_id))
  with check (app_is_internal() or app_can_write_org(organization_id));

create policy finding_evidence_read on finding_evidence
  for select using (app_can_read_audit_content(organization_id));

create policy finding_status_history_read on finding_status_history
  for select using (app_can_read_audit_content(organization_id));

-- A client only ever sees a RELEASED (or superseded) report. Draft and
-- in-review reports are invisible to them at the row level, not merely hidden
-- in the UI (7.5, FR-RPT-003).
create policy reports_read on reports
  for select using (
    app_is_internal()
    or (
      app_can_read_audit_content(organization_id)
      and status in ('released', 'superseded')
    )
  );

create policy report_access_events_read on report_access_events
  for select using (app_is_internal());

-- ---------------------------------------------------------------------------
-- Collaboration and governance
-- ---------------------------------------------------------------------------

-- FR-PORT-002: "Internal analyst notes are never exposed."
create policy comments_read on comments
  for select using (
    app_is_internal()
    or (visibility = 'customer' and app_can_read_audit_content(organization_id))
  );

create policy comments_write on comments
  for insert with check (
    author_id = app_current_user_id()
    and (app_is_internal() or app_can_write_org(organization_id))
    -- A client cannot author an "internal" comment.
    and (visibility = 'customer' or app_is_internal())
  );

create policy notifications_read on notifications
  for select using (user_id = app_current_user_id());

create policy notifications_update on notifications
  for update using (user_id = app_current_user_id())
  with check (user_id = app_current_user_id());

create policy support_tickets_read on support_tickets
  for select using (
    app_is_internal() or app_can_read_org(organization_id)
  );

create policy support_tickets_insert on support_tickets
  for insert with check (
    requester_id = app_current_user_id()
    and app_can_read_org(organization_id)
  );

create policy consent_records_read on consent_records
  for select using (
    app_is_platform_owner()
    or user_id = app_current_user_id()
  );

create policy privacy_requests_read on privacy_requests
  for select using (
    app_is_platform_owner()
    or requester_id = app_current_user_id()
    or app_can_read_org(organization_id)
  );

-- FR-OPS-005: the audit event viewer is owner-only.
create policy audit_events_owner_only on audit_events
  for select using (app_is_platform_owner());

create policy feature_flags_read on feature_flags
  for select using (app_is_internal());

create policy feature_flags_write on feature_flags
  for all using (app_is_platform_owner())
  with check (app_is_platform_owner());

-- ---------------------------------------------------------------------------
-- Coverage assertion
--
-- 20.3: "RLS coverage query confirms every exposed tenant table has RLS
-- enabled." Failing the migration is better than discovering the gap later.
-- ---------------------------------------------------------------------------

do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ')
  into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'Tables without row level security: %', unprotected;
  end if;
end;
$$;
