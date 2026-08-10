-- ===========================================================================
-- 0005_governance_and_operations.sql
-- Governance, notifications, privacy and operations (PRD 12.6).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- comments (PRD 12.6, FR-PORT-002)
-- ---------------------------------------------------------------------------
create table public.comments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  object_type      text not null check (object_type in ('finding', 'project', 'report', 'test_case')),
  object_id        uuid not null,
  author_user_id   uuid references auth.users(id) on delete set null,
  -- The column that keeps analyst notes away from customers (PRD 7.7).
  visibility       app.comment_visibility not null,
  -- Sanitized on write. The raw submission is never stored.
  content          text not null check (length(content) between 1 and 10000),
  mentions         uuid[] not null default '{}',
  edited_at        timestamptz,
  created_at       timestamptz not null default now()
);

create index comments_object on public.comments (object_type, object_id, created_at);

-- ---------------------------------------------------------------------------
-- notifications (PRD 12.6, FR-NOT-003)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  category          text not null,
  -- A translation key plus parameters, never a rendered sentence. FR-I18N-001
  -- requires the recipient's locale to decide the wording at read time.
  content_key       text not null,
  content_params    jsonb not null default '{}'::jsonb,
  target_path       text,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index notifications_user_unread on public.notifications (user_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- support_tickets (PRD 12.6, FR-SUP-001)
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  category         text not null
    check (category in ('access', 'billing', 'onboarding', 'report', 'privacy', 'security')),
  priority         text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status           text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  subject          text not null,
  -- FR-NOT-002 / PRD 16.6: the narrative must not become a second copy of
  -- sensitive content. Bounded, and the UI warns against pasting transcripts.
  description      text not null check (length(description) <= 5000),
  assignee_user_id uuid references auth.users(id) on delete set null,
  first_response_at timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index support_tickets_open on public.support_tickets (status, created_at)
  where status in ('open', 'in_progress');

create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- consent_records (PRD 12.6, FR-LEGAL-001)
--
-- One row per consent type. PRD FR-LEGAL-001 forbids bundling optional
-- marketing consent into required service acceptance, which is exactly why
-- these are separate rows rather than booleans on a user.
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade,
  lead_email       citext,
  consent_type     text not null
    check (consent_type in ('terms', 'privacy', 'authorization', 'acceptable_use', 'dpa', 'marketing', 'case_study')),
  document_version text not null,
  source           text not null,
  granted_at       timestamptz,
  withdrawn_at     timestamptz,
  created_at       timestamptz not null default now(),

  constraint consent_records_have_a_subject
    check (user_id is not null or lead_email is not null)
);

create index consent_records_user on public.consent_records (user_id, consent_type);

-- ---------------------------------------------------------------------------
-- privacy_requests (PRD 12.6, FR-PORT-004, 16.6)
-- ---------------------------------------------------------------------------
create table public.privacy_requests (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references public.organizations(id) on delete cascade,
  requester_user_id     uuid references auth.users(id) on delete set null,
  request_type          app.privacy_request_type not null,
  identity_verified_at  timestamptz,
  identity_method       text,
  status                text not null default 'received'
    check (status in ('received', 'verifying', 'in_progress', 'completed', 'refused', 'partially_completed')),
  due_date              date not null,
  scope_description     text,
  refusal_reason        text,
  completion_evidence   text,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint privacy_requests_refusal_needs_reason
    check (status <> 'refused' or refusal_reason is not null)
);

create index privacy_requests_open on public.privacy_requests (status, due_date)
  where status not in ('completed', 'refused');

create trigger privacy_requests_touch before update on public.privacy_requests
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- audit_events (PRD 12.6, FR-OPS-005)
--
-- The immutable decision and access record. PRD 5.1 calls this out as a
-- product goal, not just a log.
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id               bigint generated always as identity primary key,
  actor_type       text not null check (actor_type in ('user', 'service', 'system', 'anonymous')),
  actor_user_id    uuid references auth.users(id) on delete set null,
  organization_id  uuid references public.organizations(id) on delete set null,
  action           text not null,
  object_type      text,
  object_id        uuid,
  outcome          text not null check (outcome in ('allowed', 'denied', 'error')),
  risk_level       app.risk_level not null default 'low',
  correlation_id   text,
  -- FR-OPS-005: sensitive field values must be redacted. The application
  -- passes this through `redactForLog` before insert.
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index audit_events_org  on public.audit_events (organization_id, created_at desc);
create index audit_events_actor on public.audit_events (actor_user_id, created_at desc);
create index audit_events_risk on public.audit_events (risk_level, created_at desc)
  where risk_level in ('high', 'critical');

-- No UPDATE or DELETE path exists, for anyone. Retention is handled by a
-- scheduled job running with elevated privileges, not by application code.
create trigger audit_events_immutable
  before update or delete on public.audit_events
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- feature_flags (PRD 12.6, PRD 1.1 rule 5)
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  id                   uuid primary key default gen_random_uuid(),
  key                  text not null,
  environment          text not null
    check (environment in ('development', 'preview', 'staging', 'production')),
  enabled              boolean not null default false,
  organization_allowlist uuid[] not null default '{}',
  changed_by           uuid references auth.users(id) on delete set null,
  change_reason        text,
  updated_at           timestamptz not null default now(),

  constraint feature_flags_key_environment unique (key, environment)
);

create trigger feature_flags_touch before update on public.feature_flags
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- usage_counters (PRD 12.6, FR-BILL-004)
-- ---------------------------------------------------------------------------
create table public.usage_counters (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  period_start     date not null,
  period_end       date not null,
  metric           text not null
    check (metric in ('scenarios', 'reports', 'retests', 'systems', 'user_seats', 'ai_tokens')),
  quantity         integer not null default 0 check (quantity >= 0),
  -- Separates included usage from billable overage (PRD 6.3).
  overage_quantity integer not null default 0 check (overage_quantity >= 0),
  source           text not null default 'system',
  updated_at       timestamptz not null default now(),

  constraint usage_counters_unique_period
    unique (organization_id, subscription_id, period_start, metric),
  constraint usage_counters_period_ordered check (period_end > period_start)
);

create trigger usage_counters_touch before update on public.usage_counters
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.comments          enable row level security;
alter table public.notifications     enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.consent_records   enable row level security;
alter table public.privacy_requests  enable row level security;
alter table public.audit_events      enable row level security;
alter table public.feature_flags     enable row level security;
alter table public.usage_counters    enable row level security;

alter table public.comments        force row level security;
alter table public.audit_events    force row level security;
alter table public.consent_records force row level security;

-- The single most important policy in this file: an internal comment is
-- readable only by internal staff. PRD 20.2 scenario 6 tests exactly this.
create policy comments_read on public.comments
  for select to authenticated
  using (
    app.can_access_project(project_id)
    and (visibility = 'customer' or app.is_internal())
  );

create policy comments_write on public.comments
  for insert to authenticated
  with check (
    app.can_access_project(project_id)
    and author_user_id = app.current_user_id()
    -- A customer cannot author an internal note.
    and (visibility = 'customer' or app.is_internal())
  );

create policy notifications_own_read on public.notifications
  for select to authenticated using (user_id = app.current_user_id());

create policy notifications_own_update on public.notifications
  for update to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());

create policy support_tickets_read on public.support_tickets
  for select to authenticated
  using (app.is_org_member(organization_id) or app.is_internal());

create policy consent_records_read on public.consent_records
  for select to authenticated
  using (user_id = app.current_user_id() or app.is_platform_owner());

create policy privacy_requests_read on public.privacy_requests
  for select to authenticated
  using (
    requester_user_id = app.current_user_id()
    or app.has_org_role(organization_id, array['client_owner']::app.membership_role[])
    or app.is_platform_owner()
  );

-- FR-OPS-005: the audit log is an owner surface.
create policy audit_events_owner_read on public.audit_events
  for select to authenticated using (app.is_platform_owner());

create policy feature_flags_read on public.feature_flags
  for select to authenticated using (app.is_internal());

create policy feature_flags_owner_write on public.feature_flags
  for all to authenticated
  using (app.is_platform_owner())
  with check (app.is_platform_owner());

create policy usage_counters_read on public.usage_counters
  for select to authenticated
  using (
    app.has_org_role(organization_id, array['client_owner', 'billing_admin']::app.membership_role[])
    or app.is_internal()
  );

-- ---------------------------------------------------------------------------
-- RLS coverage assertion (PRD 20.3)
--
-- Fails the migration if any table in `public` is missing RLS. This is the
-- check the release gate depends on, run at the point where forgetting is
-- cheapest to fix.
-- ---------------------------------------------------------------------------
do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'Tables in public without row level security: %', unprotected;
  end if;
end;
$$;
