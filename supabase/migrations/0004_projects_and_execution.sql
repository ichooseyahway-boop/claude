-- ===========================================================================
-- 0003_projects_and_execution.sql
-- Projects, systems, authorization, scenarios and execution (PRD 12.3, 12.4).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- projects (PRD 12.3)
-- ---------------------------------------------------------------------------
create table public.projects (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  order_id                 uuid references public.orders(id) on delete set null,
  subscription_id          uuid references public.subscriptions(id) on delete set null,
  name                     text not null check (length(trim(name)) between 1 and 200),
  package_snapshot         jsonb not null,
  locales                  app.locale_code[] not null check (cardinality(locales) between 1 and 2),
  status                   app.project_status not null default 'awaiting_onboarding',
  priority                 integer not null default 0,
  due_date                 date,
  assigned_analyst_id      uuid references auth.users(id) on delete set null,
  scope_summary            text,
  -- FR-OPS-003: the SLA clock pauses only while a documented customer-blocked
  -- state is set, which is why the reason and the timestamp travel together.
  blocked_reason           text,
  blocked_since            timestamptz,
  onboarding_completed_at  timestamptz,
  onboarding_accepted_at   timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint projects_blocked_needs_reason
    check ((blocked_reason is null) = (blocked_since is null)),
  -- Every project traces to a paid order or an active subscription. PRD 6.5:
  -- work begins only after payment.
  constraint projects_have_a_commercial_basis
    check (order_id is not null or subscription_id is not null)
);

create index projects_org        on public.projects (organization_id, created_at desc);
create index projects_queue      on public.projects (status, due_date);
create index projects_analyst    on public.projects (assigned_analyst_id) where assigned_analyst_id is not null;

create trigger projects_touch before update on public.projects
  for each row execute function app.touch_updated_at();

-- Project-scoped access for internal staff (PRD 7.2). Declared here because it
-- needs `projects`, and used by every policy below.
create or replace function app.can_access_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.memberships m
      on m.user_id = auth.uid()
     and m.revoked_at is null
     and m.accepted_at is not null
    where p.id = target_project
      and (
        -- A customer member of the owning organization, respecting any
        -- project scope on the membership.
        (
          m.organization_id = p.organization_id
          and m.role in ('client_owner', 'client_contributor', 'client_viewer')
          and (m.project_scope is null or p.id = any(m.project_scope))
        )
        or
        -- PRD 7.6: a billing administrator cannot view test transcripts or
        -- reports "unless separately granted project access". Organization
        -- membership alone is NOT that grant — an explicit project_scope is.
        (
          m.organization_id = p.organization_id
          and m.role = 'billing_admin'
          and m.project_scope is not null
          and p.id = any(m.project_scope)
        )
        or
        -- Internal staff: the platform owner sees everything; an analyst sees
        -- assigned projects, or any project when their membership is unscoped.
        (
          m.role = 'platform_owner'
          or (
            m.role in ('analyst', 'senior_analyst')
            and (
              p.assigned_analyst_id = auth.uid()
              or m.project_scope is null
              or p.id = any(m.project_scope)
            )
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- ai_systems (PRD 12.3, FR-SYS-001)
-- ---------------------------------------------------------------------------
create table public.ai_systems (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  display_name      text not null,
  internal_ref      text,
  system_type       text not null,
  channel           text not null check (channel in ('web_chat', 'help_centre', 'email', 'messaging', 'api', 'other')),
  environment       text not null check (environment in ('production', 'staging', 'sandbox')),
  vendor            text,
  model_identifier  text,
  supported_locales app.locale_code[] not null default array['en-CA']::app.locale_code[],
  disclosure_text   text,
  escalation_rules  jsonb not null default '{}'::jsonb,
  operating_hours   text,
  known_limitations text,
  data_categories   text[] not null default '{}',
  -- FR-RUN-003: the adapter refuses any host outside this list.
  authorized_hosts  text[] not null default '{}',
  rate_limit_per_minute integer check (rate_limit_per_minute > 0),
  system_owner_name  text,
  system_owner_email citext,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index ai_systems_project on public.ai_systems (project_id);

create trigger ai_systems_touch before update on public.ai_systems
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- connection_configs (PRD 12.3, FR-ONB-005)
-- ---------------------------------------------------------------------------
create table public.connection_configs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  ai_system_id     uuid not null references public.ai_systems(id) on delete cascade,
  adapter_type     text not null,
  -- Non-secret configuration only: URL, method, header NAMES, field mappings.
  configuration    jsonb not null default '{}'::jsonb,
  -- FR-ONB-005: a pointer into the managed secret store. Never the secret.
  -- The check is a tripwire against a plaintext value being written here.
  secret_reference text
    check (secret_reference is null or secret_reference ~ '^(vault|supabase|env):[A-Za-z0-9_/.:-]{1,200}$'),
  status           text not null default 'unconfigured'
    check (status in ('unconfigured', 'configured', 'verified', 'failed', 'revoked')),
  last_tested_at   timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index connection_configs_system on public.connection_configs (ai_system_id);

create trigger connection_configs_touch before update on public.connection_configs
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- authorization_attestations (PRD 12.3, FR-ONB-002)
-- ---------------------------------------------------------------------------
create table public.authorization_attestations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  project_id         uuid not null references public.projects(id) on delete cascade,
  signer_user_id     uuid not null references auth.users(id) on delete restrict,
  document_version   text not null,
  scope              jsonb not null,
  -- Region only, never a raw IP. PRD 16.3 is data minimization; the PRD text
  -- itself says "IP-derived region if legally appropriate".
  signer_region      text,
  evidence_file_key  text,
  accepted_at        timestamptz not null default now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  revoked_reason     text,

  constraint attestation_expiry_after_acceptance
    check (expires_at is null or expires_at > accepted_at)
);

create index attestations_project on public.authorization_attestations (project_id, accepted_at desc);

-- An attestation is a signed record. Correcting one means signing a new one.
create trigger attestations_immutable
  before update on public.authorization_attestations
  for each row
  when (
    old.revoked_at is not distinct from new.revoked_at
    and old.revoked_reason is not distinct from new.revoked_reason
  )
  execute function app.forbid_mutation();

-- Is there a live authorization right now? Used by the run state machine's
-- database-side counterpart and by the operations queue.
create or replace function app.project_authorization_active(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.authorization_attestations a
    where a.project_id = target_project
      and a.revoked_at is null
      and (a.expires_at is null or a.expires_at > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- knowledge_sources (PRD 12.3, FR-ONB-004)
-- ---------------------------------------------------------------------------
create table public.knowledge_sources (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  project_id         uuid not null references public.projects(id) on delete cascade,
  title              text not null,
  source_type        text not null check (source_type in ('pdf', 'docx', 'txt', 'csv', 'url')),
  storage_key        text,
  source_url         text,
  effective_date     date,
  authority_rank     integer not null default 100 check (authority_rank between 1 and 1000),
  version            integer not null default 1 check (version >= 1),
  checksum_sha256    bytea,
  byte_size          bigint check (byte_size >= 0),
  scan_status        text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'infected', 'failed', 'skipped')),
  extraction_status  text not null default 'pending'
    check (extraction_status in ('pending', 'extracted', 'failed', 'unsupported')),
  is_authoritative   boolean not null default false,
  analyst_reviewed_at timestamptz,
  uploaded_by        uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  -- PRD 16.5 retention: active project plus 90 days by default.
  retention_until    date,

  constraint knowledge_sources_have_a_location
    check (storage_key is not null or source_url is not null)
);

create index knowledge_sources_project on public.knowledge_sources (project_id);

-- ---------------------------------------------------------------------------
-- scenario_templates (PRD 12.4, FR-SCN-001)
--
-- Global intellectual property, not tenant data (PRD 4.5). A custom scenario
-- written for one customer carries their organization_id; library templates
-- leave it NULL.
-- ---------------------------------------------------------------------------
create table public.scenario_templates (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null,
  version          integer not null check (version >= 1),
  organization_id  uuid references public.organizations(id) on delete cascade,
  locale           app.locale_code not null,
  category         text not null,
  title            text not null,
  objective        text not null,
  industry         text,
  channel          text,
  persona          text,
  preconditions    text,
  -- Conversation turns, expected facts, disallowed outcomes, required
  -- escalation behaviour and required evidence (FR-SCN-001).
  body             jsonb not null,
  evaluation_rules jsonb not null default '{}'::jsonb,
  risk_weight      numeric(2,1) not null default 1.0 check (risk_weight in (1.0, 1.5, 2.0)),
  -- Pairs an English template with its French counterpart (FR-SCN-003).
  bilingual_pair_key text,
  tags             text[] not null default '{}',
  status           text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  retired_at       timestamptz,

  -- FR-SCN-001: editing a published template creates a NEW version.
  constraint scenario_templates_family_version unique (family_id, version)
);

create index scenario_templates_lookup
  on public.scenario_templates (category, locale, status);
create index scenario_templates_pair
  on public.scenario_templates (bilingual_pair_key) where bilingual_pair_key is not null;

-- Published templates are frozen. Only the retirement fields may change.
create trigger scenario_templates_frozen_when_published
  before update on public.scenario_templates
  for each row
  when (
    old.status = 'published'
    and (
      old.body is distinct from new.body
      or old.evaluation_rules is distinct from new.evaluation_rules
      or old.objective is distinct from new.objective
      or old.risk_weight is distinct from new.risk_weight
    )
  )
  execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- audit_plans and plan_scenarios (PRD 12.4, FR-SCN-003)
-- ---------------------------------------------------------------------------
create table public.audit_plans (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  version          integer not null check (version >= 1),
  status           text not null default 'draft'
    check (status in ('draft', 'approved', 'superseded')),
  scenario_limit   integer not null check (scenario_limit >= 1),
  coverage_summary jsonb not null default '{}'::jsonb,
  -- A new version requires a reason (FR-SCN-003).
  revision_reason  text,
  created_by       uuid references auth.users(id) on delete set null,
  approved_by      uuid references auth.users(id) on delete set null,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),

  constraint audit_plans_project_version unique (project_id, version),
  constraint audit_plans_approval_is_complete
    check ((approved_by is null) = (approved_at is null)),
  constraint audit_plans_approved_requires_approver
    check (status <> 'approved' or approved_by is not null)
);

-- FR-SCN-003: once approved for execution the plan is frozen.
create trigger audit_plans_frozen_when_approved
  before update on public.audit_plans
  for each row
  when (old.status = 'approved' and new.status = 'approved')
  execute function app.forbid_mutation();

create table public.plan_scenarios (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  plan_id               uuid not null references public.audit_plans(id) on delete cascade,
  scenario_template_id  uuid references public.scenario_templates(id) on delete restrict,
  custom_scenario       jsonb,
  display_order         integer not null default 0,
  locale                app.locale_code not null,
  risk_weight           numeric(2,1) not null default 1.0 check (risk_weight in (1.0, 1.5, 2.0)),
  -- Matched English/French pair for the parity index (PRD 10.7).
  bilingual_pair_id     uuid,
  customer_facts        jsonb not null default '{}'::jsonb,
  expected_outcomes     jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),

  constraint plan_scenarios_have_a_source
    check (scenario_template_id is not null or custom_scenario is not null)
);

create index plan_scenarios_plan on public.plan_scenarios (plan_id, display_order);
create index plan_scenarios_pair on public.plan_scenarios (bilingual_pair_id)
  where bilingual_pair_id is not null;

-- ---------------------------------------------------------------------------
-- test_runs, test_cases, conversation_turns, evidence_objects (PRD 12.4)
-- ---------------------------------------------------------------------------
create table public.test_runs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  plan_id             uuid not null references public.audit_plans(id) on delete restrict,
  run_type            text not null default 'initial'
    check (run_type in ('initial', 'retest', 'monitoring')),
  state               app.run_state not null default 'draft',
  -- For a retest or monitoring cycle, the run this one is compared against.
  baseline_run_id     uuid references public.test_runs(id) on delete set null,
  scheduled_start     timestamptz,
  scheduled_end       timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  released_at         timestamptz,
  evaluation_version_id uuid,
  -- PRD 6.6 unit economics: cost per audit must be visible to the owner.
  ai_cost_cents       integer not null default 0 check (ai_cost_cents >= 0),
  analyst_minutes     integer not null default 0 check (analyst_minutes >= 0),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint test_runs_no_self_baseline check (baseline_run_id is distinct from id)
);

create index test_runs_project on public.test_runs (project_id, created_at desc);
create index test_runs_active on public.test_runs (state)
  where state in ('queued', 'running', 'review_required', 'report_draft');

create trigger test_runs_touch before update on public.test_runs
  for each row execute function app.touch_updated_at();

create table public.test_cases (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  run_id            uuid not null references public.test_runs(id) on delete cascade,
  plan_scenario_id  uuid not null references public.plan_scenarios(id) on delete restrict,
  locale            app.locale_code not null,
  state             text not null default 'pending'
    check (state in ('pending', 'captured', 'evaluated', 'reviewed', 'unscorable', 'failed')),
  capture_mode      app.capture_mode not null,
  started_at        timestamptz,
  completed_at      timestamptz,
  latency_ms        integer check (latency_ms >= 0),
  execution_error   text,
  -- Set by the analyst after review. NULL until reviewed (FR-EVAL-003).
  approved_score    numeric(5,2) check (approved_score between 0 and 100),
  confidence        app.confidence_level,
  reviewed_by       uuid references auth.users(id) on delete set null,
  reviewed_at       timestamptz,
  unscorable_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- PRD 10.4 / 10.6: an unscorable case must say why.
  constraint test_cases_unscorable_needs_reason
    check (state <> 'unscorable' or unscorable_reason is not null),
  constraint test_cases_review_is_complete
    check ((reviewed_by is null) = (reviewed_at is null))
);

create index test_cases_run on public.test_cases (run_id, state);

create trigger test_cases_touch before update on public.test_cases
  for each row execute function app.touch_updated_at();

-- Captured conversation. FR-RUN-005: the original response text is never
-- modified after capture; a correction is a separate annotation.
create table public.conversation_turns (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  test_case_id       uuid not null references public.test_cases(id) on delete cascade,
  sequence           integer not null check (sequence >= 0),
  role               text not null check (role in ('tester', 'system')),
  original_content   text not null,
  -- Normalized/redacted display copy lives beside the original, never over it.
  normalized_content text,
  redaction_state    text not null default 'none'
    check (redaction_state in ('none', 'partial', 'full')),
  pii_detected       boolean not null default false,
  character_count    integer generated always as (length(original_content)) stored,
  token_count        integer check (token_count >= 0),
  checksum_sha256    bytea not null,
  captured_at        timestamptz not null default now(),

  constraint conversation_turns_unique_sequence unique (test_case_id, sequence)
);

create index conversation_turns_case on public.conversation_turns (test_case_id, sequence);

-- The immutability guarantee behind every evidence claim in a report.
create trigger conversation_turns_immutable
  before update or delete on public.conversation_turns
  for each row execute function app.forbid_mutation();

create table public.evidence_objects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  test_case_id     uuid references public.test_cases(id) on delete cascade,
  storage_key      text not null unique,
  media_type       text not null,
  byte_size        bigint not null check (byte_size >= 0),
  checksum_sha256  bytea not null,
  capture_source   text not null,
  classification   app.data_classification not null default 'confidential',
  redaction_state  text not null default 'none'
    check (redaction_state in ('none', 'partial', 'full')),
  -- FR-RUN-005: a replaced object supersedes rather than overwrites.
  supersedes_id    uuid references public.evidence_objects(id) on delete set null,
  replacement_reason text,
  uploaded_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  retention_until  date,

  constraint evidence_replacement_needs_reason
    check ((supersedes_id is null) = (replacement_reason is null))
);

create index evidence_objects_case on public.evidence_objects (test_case_id);
create index evidence_objects_retention on public.evidence_objects (retention_until)
  where retention_until is not null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.projects                   enable row level security;
alter table public.ai_systems                 enable row level security;
alter table public.connection_configs         enable row level security;
alter table public.authorization_attestations enable row level security;
alter table public.knowledge_sources          enable row level security;
alter table public.scenario_templates         enable row level security;
alter table public.audit_plans                enable row level security;
alter table public.plan_scenarios             enable row level security;
alter table public.test_runs                  enable row level security;
alter table public.test_cases                 enable row level security;
alter table public.conversation_turns         enable row level security;
alter table public.evidence_objects           enable row level security;

alter table public.projects           force row level security;
alter table public.test_runs          force row level security;
alter table public.test_cases         force row level security;
alter table public.conversation_turns force row level security;
alter table public.evidence_objects   force row level security;

create policy projects_read on public.projects
  for select to authenticated
  using (app.can_access_project(id));

create policy ai_systems_read on public.ai_systems
  for select to authenticated using (app.can_access_project(project_id));

-- connection_configs: internal staff only. A customer supplies the credential
-- through a write path; nobody reads the row back through the API.
create policy connection_configs_internal_read on public.connection_configs
  for select to authenticated
  using (app.is_internal() and app.can_access_project(
    (select ai.project_id from public.ai_systems ai where ai.id = ai_system_id)
  ));

create policy attestations_read on public.authorization_attestations
  for select to authenticated using (app.can_access_project(project_id));

create policy knowledge_sources_read on public.knowledge_sources
  for select to authenticated using (app.can_access_project(project_id));

-- Library templates are internal IP; a customer never browses them. A custom
-- scenario written for a customer is visible to that customer.
create policy scenario_templates_read on public.scenario_templates
  for select to authenticated
  using (
    app.is_internal()
    or (organization_id is not null and app.is_org_member(organization_id))
  );

create policy scenario_templates_manage on public.scenario_templates
  for all to authenticated
  using (app.is_internal())
  with check (app.is_internal());

create policy audit_plans_read on public.audit_plans
  for select to authenticated using (app.can_access_project(project_id));

create policy plan_scenarios_read on public.plan_scenarios
  for select to authenticated
  using (app.can_access_project(
    (select p.project_id from public.audit_plans p where p.id = plan_id)
  ));

create policy test_runs_read on public.test_runs
  for select to authenticated using (app.can_access_project(project_id));

create policy test_cases_read on public.test_cases
  for select to authenticated
  using (app.can_access_project(
    (select r.project_id from public.test_runs r where r.id = run_id)
  ));

-- Raw transcripts are internal working material until a report is released.
-- A customer reads findings and evidence excerpts through the report, not by
-- querying the turn table (PRD 7.5, FR-RPT-002).
create policy conversation_turns_internal_read on public.conversation_turns
  for select to authenticated
  using (
    app.is_internal()
    and app.can_access_project(
      (select r.project_id
         from public.test_cases c
         join public.test_runs r on r.id = c.run_id
        where c.id = test_case_id)
    )
  );

create policy evidence_objects_internal_read on public.evidence_objects
  for select to authenticated
  using (
    app.is_internal()
    and app.can_access_project(
      (select r.project_id
         from public.test_cases c
         join public.test_runs r on r.id = c.run_id
        where c.id = test_case_id)
    )
  );
