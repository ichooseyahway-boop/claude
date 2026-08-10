-- ===========================================================================
-- 0004_evaluation_findings_reports.sql
-- Evaluation, findings and reports (PRD 12.5).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- evaluation_versions (PRD 12.5, FR-EVAL-004)
--
-- A released report must be able to say which evaluator produced its numbers.
-- Rows are append-only for that reason.
-- ---------------------------------------------------------------------------
create table public.evaluation_versions (
  id                  uuid primary key default gen_random_uuid(),
  rubric_version      text not null,
  prompt_version      text not null,
  provider            text not null,
  model_identifier    text not null,
  json_schema_version text not null,
  parameters          jsonb not null default '{}'::jsonb,
  effective_from      timestamptz not null default now(),
  retired_at          timestamptz,
  -- PRD 15.6: changing the production evaluator requires owner approval.
  approved_by         uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),

  constraint evaluation_versions_unique
    unique (rubric_version, prompt_version, model_identifier, json_schema_version)
);

create trigger evaluation_versions_immutable
  before update on public.evaluation_versions
  for each row
  when (old.retired_at is not distinct from new.retired_at)
  execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- evaluations (PRD 12.5)
-- ---------------------------------------------------------------------------
create table public.evaluations (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  test_case_id          uuid not null references public.test_cases(id) on delete cascade,
  evaluation_version_id uuid not null references public.evaluation_versions(id) on delete restrict,
  -- The raw, schema-validated model proposal. FR-EVAL-001: never directly
  -- client-visible.
  proposed_output       jsonb,
  validation_status     text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'schema_violation', 'not_json', 'span_out_of_range', 'provider_error')),
  validation_issues     text[],
  attempt_count         integer not null default 0 check (attempt_count >= 0),
  cost_cents            integer not null default 0 check (cost_cents >= 0),
  latency_ms            integer check (latency_ms >= 0),
  -- FR-EVAL-005: routing reasons that force explicit analyst confirmation.
  requires_confirmation_reasons text[] not null default '{}',
  human_review_status   text not null default 'pending'
    check (human_review_status in ('pending', 'in_review', 'confirmed', 'overridden', 'rejected')),
  reviewed_by           uuid references auth.users(id) on delete set null,
  reviewed_at           timestamptz,
  override_reason       text,
  created_at            timestamptz not null default now(),

  -- FR-EVAL-003: an override must carry a reason and an actor.
  constraint evaluations_override_needs_reason
    check (human_review_status <> 'overridden' or (override_reason is not null and reviewed_by is not null))
);

create index evaluations_case on public.evaluations (test_case_id, created_at desc);
create index evaluations_awaiting_review on public.evaluations (human_review_status)
  where human_review_status in ('pending', 'in_review');

-- ---------------------------------------------------------------------------
-- dimension_scores (PRD 12.5)
--
-- Proposed and approved values live side by side so the internal history
-- survives an override (FR-EVAL-003).
-- ---------------------------------------------------------------------------
create table public.dimension_scores (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  test_case_id     uuid not null references public.test_cases(id) on delete cascade,
  evaluation_id    uuid references public.evaluations(id) on delete set null,
  dimension        app.score_dimension not null,
  weight           numeric(5,2) not null check (weight >= 0),
  proposed_score   smallint check (proposed_score between 0 and 5),
  approved_score   smallint check (approved_score between 0 and 5),
  -- PRD 10.3: N/A is allowed, but only with a documented reason.
  not_applicable   boolean not null default false,
  not_applicable_reason text,
  confidence       app.confidence_level,
  rationale        text,
  evidence_refs    jsonb not null default '[]'::jsonb,
  approved_by      uuid references auth.users(id) on delete set null,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),

  constraint dimension_scores_one_per_case unique (test_case_id, dimension),
  constraint dimension_scores_na_needs_reason
    check (not not_applicable or not_applicable_reason is not null),
  constraint dimension_scores_na_has_no_score
    check (not not_applicable or approved_score is null)
);

create index dimension_scores_case on public.dimension_scores (test_case_id);

-- ---------------------------------------------------------------------------
-- findings (PRD 12.5, FR-FND-001)
-- ---------------------------------------------------------------------------
create table public.findings (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  project_id           uuid not null references public.projects(id) on delete cascade,
  run_id               uuid not null references public.test_runs(id) on delete cascade,
  -- Human-facing reference, e.g. "BA-2026-0001".
  reference            text not null unique,
  severity             app.finding_severity not null,
  status               app.finding_status not null default 'open',
  category             text not null,
  dimension            app.score_dimension,
  locale               app.locale_code,
  title                text not null check (length(trim(title)) between 1 and 200),
  summary              text not null,
  expected_behaviour   text not null,
  observed_behaviour   text not null,
  customer_impact      text not null,
  business_risk_category text,
  -- FR-FND-001 requires this to be labelled a hypothesis, which is why the
  -- column name says so.
  root_cause_hypothesis text,
  recommended_remediation text not null,
  verification_method  text,
  confidence           app.confidence_level not null,
  -- PRD 10.8: low confidence + Critical requires senior confirmation.
  senior_confirmed_by  uuid references auth.users(id) on delete set null,
  senior_confirmed_at  timestamptz,
  -- FR-FND-001: internal and customer-visible notes are separate columns, so
  -- a customer query cannot accidentally select the internal one.
  internal_notes       text,
  customer_notes       text,
  owner_user_id        uuid references auth.users(id) on delete set null,
  due_date             date,
  risk_accepted_by     uuid references auth.users(id) on delete set null,
  risk_accepted_reason text,
  risk_review_date     date,
  created_by           uuid references auth.users(id) on delete set null,
  approved_by          uuid references auth.users(id) on delete set null,
  approved_at          timestamptz,
  released_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint findings_low_confidence_critical_needs_senior
    check (
      not (severity = 'critical' and confidence = 'low')
      or senior_confirmed_by is not null
    ),
  -- FR-FND-004: risk acceptance requires an identified Client Owner and reason.
  constraint findings_risk_acceptance_is_documented
    check (
      status <> 'risk_accepted'
      or (risk_accepted_by is not null and risk_accepted_reason is not null)
    )
);

create index findings_project on public.findings (project_id, severity, status);
create index findings_run on public.findings (run_id);

create trigger findings_touch before update on public.findings
  for each row execute function app.touch_updated_at();

create table public.finding_evidence (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  finding_id        uuid not null references public.findings(id) on delete cascade,
  test_case_id      uuid references public.test_cases(id) on delete set null,
  evidence_object_id uuid references public.evidence_objects(id) on delete set null,
  knowledge_source_id uuid references public.knowledge_sources(id) on delete set null,
  -- Character spans into a conversation turn, so a finding points at exact text.
  turn_sequence     integer,
  span_start        integer check (span_start >= 0),
  span_end          integer check (span_end >= 0),
  excerpt           text,
  created_at        timestamptz not null default now(),

  constraint finding_evidence_span_ordered
    check (span_end is null or span_start is null or span_end > span_start),
  constraint finding_evidence_points_at_something
    check (
      test_case_id is not null
      or evidence_object_id is not null
      or knowledge_source_id is not null
    )
);

create index finding_evidence_finding on public.finding_evidence (finding_id);

-- FR-FND-004 status history. Append-only: this is the record of who changed
-- what and why.
create table public.finding_status_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  finding_id       uuid not null references public.findings(id) on delete cascade,
  old_status       app.finding_status,
  new_status       app.finding_status not null,
  actor_user_id    uuid references auth.users(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now()
);

create index finding_status_history_finding
  on public.finding_status_history (finding_id, created_at desc);

create trigger finding_status_history_immutable
  before update or delete on public.finding_status_history
  for each row execute function app.forbid_mutation();

-- Records every status change automatically, so history cannot be skipped by
-- a caller that forgets to write it.
create or replace function app.record_finding_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.finding_status_history
    (organization_id, finding_id, old_status, new_status, actor_user_id)
  values
    (new.organization_id, new.id,
     case when tg_op = 'UPDATE' then old.status else null end,
     new.status, auth.uid());

  return new;
end;
$$;

create trigger findings_status_history
  after insert or update of status on public.findings
  for each row execute function app.record_finding_status_change();

-- ---------------------------------------------------------------------------
-- reports (PRD 12.5, FR-RPT-001..004)
-- ---------------------------------------------------------------------------
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  run_id            uuid not null references public.test_runs(id) on delete restrict,
  -- Stable across corrections; version increments (FR-RPT-004).
  family_id         uuid not null,
  version           integer not null check (version >= 1),
  locale_mode       text not null check (locale_mode in ('en', 'fr', 'bilingual')),
  status            app.report_status not null default 'draft',
  overall_score     numeric(5,2) check (overall_score between 0 and 100),
  grade             text check (grade in ('A', 'B', 'C', 'D', 'F')),
  parity_index      numeric(5,2) check (parity_index between 0 and 100),
  -- PRD 10.6: when a cap applies, the report must show it and why.
  score_cap_reason  text,
  raw_score         numeric(5,2) check (raw_score between 0 and 100),
  completeness      text not null default 'complete'
    check (completeness in ('complete', 'incomplete')),
  -- Frozen rendering of the released report. A released report must read the
  -- same in a year even if the underlying rows change shape.
  content_snapshot  jsonb,
  pdf_storage_key   text,
  correction_reason text,
  supersedes_id     uuid references public.reports(id) on delete set null,
  approved_by       uuid references auth.users(id) on delete set null,
  approved_at       timestamptz,
  released_by       uuid references auth.users(id) on delete set null,
  released_at       timestamptz,
  superseded_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint reports_family_version unique (family_id, version),
  constraint reports_release_is_complete
    check ((released_by is null) = (released_at is null)),
  constraint reports_released_needs_snapshot
    check (status <> 'released' or (content_snapshot is not null and released_by is not null)),
  -- FR-RPT-004: a correction must say why.
  constraint reports_correction_needs_reason
    check (version = 1 or correction_reason is not null),
  -- PRD 10.7: a parity index is only ever present on a bilingual report.
  constraint reports_parity_only_when_bilingual
    check (parity_index is null or locale_mode = 'bilingual')
);

create index reports_project on public.reports (project_id, created_at desc);
create index reports_released on public.reports (organization_id, released_at desc)
  where status = 'released';

create trigger reports_touch before update on public.reports
  for each row execute function app.touch_updated_at();

-- FR-RPT-004: released reports are immutable. Only the supersession fields
-- may change, which is how version 2 retires version 1.
create trigger reports_immutable_once_released
  before update on public.reports
  for each row
  when (
    old.status = 'released'
    and (
      old.content_snapshot is distinct from new.content_snapshot
      or old.overall_score is distinct from new.overall_score
      or old.grade is distinct from new.grade
      or old.parity_index is distinct from new.parity_index
      or old.pdf_storage_key is distinct from new.pdf_storage_key
      or old.released_by is distinct from new.released_by
      or old.released_at is distinct from new.released_at
    )
  )
  execute function app.forbid_mutation();

-- FR-RPT-002: client download events are logged.
create table public.report_access_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  report_id        uuid not null references public.reports(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  share_link_id    uuid,
  action           text not null check (action in ('viewed', 'downloaded', 'exported', 'shared')),
  -- Coarse metadata only. PRD 16.3 keeps raw IPs and user agents out.
  coarse_region    text,
  client_kind      text check (client_kind in ('web', 'mobile', 'api', 'unknown')),
  created_at       timestamptz not null default now()
);

create index report_access_events_report
  on public.report_access_events (report_id, created_at desc);

create trigger report_access_events_immutable
  before update or delete on public.report_access_events
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.evaluation_versions    enable row level security;
alter table public.evaluations            enable row level security;
alter table public.dimension_scores       enable row level security;
alter table public.findings               enable row level security;
alter table public.finding_evidence       enable row level security;
alter table public.finding_status_history enable row level security;
alter table public.reports                enable row level security;
alter table public.report_access_events   enable row level security;

alter table public.evaluations      force row level security;
alter table public.findings         force row level security;
alter table public.reports          force row level security;

create policy evaluation_versions_internal_read on public.evaluation_versions
  for select to authenticated using (app.is_internal());

-- FR-EVAL-001: an AI proposal is never client-visible. Internal only.
create policy evaluations_internal_read on public.evaluations
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

-- Customers see approved dimension scores (they appear in the scorecard);
-- internal staff additionally see the proposals.
create policy dimension_scores_read on public.dimension_scores
  for select to authenticated
  using (
    app.can_access_project(
      (select r.project_id
         from public.test_cases c
         join public.test_runs r on r.id = c.run_id
        where c.id = test_case_id)
    )
  );

-- A customer sees a finding once it has been released; internal staff see
-- drafts. `internal_notes` is filtered by the application's column selection,
-- and the client API never selects it.
create policy findings_read on public.findings
  for select to authenticated
  using (
    app.can_access_project(project_id)
    and (app.is_internal() or released_at is not null)
  );

create policy finding_evidence_read on public.finding_evidence
  for select to authenticated
  using (
    app.can_access_project(
      (select f.project_id from public.findings f where f.id = finding_id)
    )
  );

create policy finding_status_history_read on public.finding_status_history
  for select to authenticated
  using (
    app.can_access_project(
      (select f.project_id from public.findings f where f.id = finding_id)
    )
  );

-- FR-RPT-003: a customer never sees a draft report.
create policy reports_read on public.reports
  for select to authenticated
  using (
    app.can_access_project(project_id)
    and (app.is_internal() or status in ('released', 'superseded'))
  );

create policy report_access_events_read on public.report_access_events
  for select to authenticated
  using (app.is_internal() or app.is_org_member(organization_id));
