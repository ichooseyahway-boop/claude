-- BotAssure CX - initial schema
--
-- PRD ref: section 12 (data model), 12.7 (data integrity requirements).
--
-- Conventions enforced throughout:
--   * Every tenant-owned table carries `organization_id` and has RLS enabled.
--   * Enums are database enums or CHECK constraints, never free text.
--   * Timestamps are `timestamptz` and stored in UTC (section 12 preamble).
--   * No ON DELETE CASCADE reaches billing or audit evidence (12.7).
--
-- Policies live in a separate migration so that the schema can be reviewed
-- independently of the authorization rules that protect it.

create extension if not exists "pgcrypto";
-- Case-insensitive text for emails and slugs, so "A@example.ca" and
-- "a@example.ca" cannot become two different accounts.
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

create type membership_role as enum (
  'platform_owner',
  'analyst',
  'senior_analyst',
  'client_owner',
  'client_contributor',
  'client_viewer',
  'billing_admin'
);

create type organization_status as enum ('active', 'suspended', 'closed');

create type billing_type as enum ('one_time', 'recurring', 'quote');

create type order_status as enum (
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
  'disputed',
  'cancelled'
);

create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'incomplete'
);

create type project_status as enum (
  'onboarding',
  'scope_review',
  'scope_declined',
  'planning',
  'executing',
  'analyst_review',
  'release_review',
  'released',
  'blocked',
  'closed'
);

create type run_state as enum (
  'draft',
  'approved',
  'queued',
  'running',
  'review_required',
  'report_draft',
  'released',
  'paused',
  'failed',
  'cancelled',
  'superseded'
);

create type capture_mode as enum (
  'manual',
  'customer_upload',
  'api_adapter',
  'browser_runner'
);

create type locale_code as enum ('en-CA', 'fr-CA');

create type severity_level as enum (
  'critical',
  'high',
  'medium',
  'low',
  'observation'
);

create type confidence_level as enum ('high', 'medium', 'low');

create type finding_status as enum (
  'open',
  'accepted',
  'in_progress',
  'ready_for_retest',
  'resolved',
  'partially_resolved',
  'risk_accepted',
  'not_applicable',
  'regressed'
);

create type score_dimension as enum (
  'factual_policy_accuracy',
  'resolution_effectiveness',
  'safety_and_privacy',
  'escalation_and_handoff',
  'context_and_memory',
  'empathy_and_tone',
  'language_and_cultural_fit'
);

create type comment_visibility as enum ('internal', 'customer');

create type report_status as enum (
  'draft',
  'in_review',
  'approved',
  'released',
  'superseded'
);

-- ---------------------------------------------------------------------------
-- 12.1 Identity and tenancy
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 160),
  email_normalized citext,
  locale locale_code not null default 'en-CA',
  timezone text not null default 'America/Toronto',
  mfa_enrolled_at timestamptz,
  last_active_at timestamptz,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is
  'Application profile for an authenticated user. Internal roles must have mfa_enrolled_at set (FR-AUTH-002).';

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug citext not null unique,
  legal_name text,
  country text not null default 'CA',
  province_region text,
  billing_email citext,
  privacy_contact_email citext,
  default_locale locale_code not null default 'en-CA',
  timezone text not null default 'America/Toronto',
  data_region_preference text,
  status organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  user_id uuid not null references profiles (id) on delete restrict,
  role membership_role not null,
  -- Null means access to every project in the organization; a non-null array
  -- restricts an analyst to assigned projects (7.2).
  project_scope uuid[],
  invited_by uuid references profiles (id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One active membership per user per organization.
create unique index memberships_active_unique
  on memberships (organization_id, user_id)
  where revoked_at is null;

create index memberships_user_idx on memberships (user_id) where revoked_at is null;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email citext not null,
  role membership_role not null,
  -- Only the hash is stored; the raw token exists only in the emailed link.
  token_hash text not null unique,
  invited_by uuid references profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_expiry_future check (expires_at > created_at)
);

-- ---------------------------------------------------------------------------
-- 12.2 Commerce
-- ---------------------------------------------------------------------------

create table service_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_fr text not null,
  description_en text,
  description_fr text,
  billing_type billing_type not null,
  currency text not null default 'CAD' check (char_length(currency) = 3),
  -- Reference amount for display only. The provider price record is
  -- authoritative for what is actually charged (section 6).
  reference_amount_minor integer not null check (reference_amount_minor >= 0),
  provider_product_id text,
  provider_price_id text,
  entitlement jsonb not null,
  self_serve_checkout boolean not null default true,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  service_package_id uuid not null references service_packages (id) on delete restrict,
  contact_user_id uuid references profiles (id),
  status order_status not null default 'pending',
  currency text not null default 'CAD',
  subtotal_minor integer not null default 0 check (subtotal_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  total_minor integer not null default 0 check (total_minor >= 0),
  provider_checkout_id text,
  provider_payment_id text,
  provider_customer_id text,
  acquisition_source text,
  coupon_code text,
  -- Guarantees one order per checkout even under webhook replay (FR-BILL-002).
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_org_idx on orders (organization_id, created_at desc);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  service_package_id uuid not null references service_packages (id) on delete restrict,
  provider_subscription_id text unique,
  provider_customer_id text,
  provider_price_id text,
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  usage_limits jsonb,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing_events (
  id uuid primary key default gen_random_uuid(),
  -- Unique provider event ID is what makes webhook processing idempotent.
  provider_event_id text not null unique,
  event_type text not null,
  organization_id uuid references organizations (id) on delete set null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'failed', 'ignored')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_code text,
  -- Reference to the provider payload in object storage, never the raw payload
  -- (it can contain billing personal information).
  payload_reference text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index billing_events_status_idx
  on billing_events (processing_status, received_at desc);

create table usage_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  subscription_id uuid references subscriptions (id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metric text not null check (metric in ('scenarios', 'reports', 'retests', 'systems', 'seats')),
  quantity integer not null default 0 check (quantity >= 0),
  source text,
  updated_at timestamptz not null default now(),
  unique (organization_id, subscription_id, period_start, metric)
);

-- ---------------------------------------------------------------------------
-- 12.3 Projects and systems
-- ---------------------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  order_id uuid references orders (id) on delete set null,
  subscription_id uuid references subscriptions (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  -- Snapshot of the package at purchase time, so a later price or entitlement
  -- change never rewrites what a customer bought.
  package_snapshot jsonb not null,
  locales locale_code[] not null default array['en-CA']::locale_code[],
  status project_status not null default 'onboarding',
  priority integer not null default 3 check (priority between 1 and 5),
  due_date date,
  assigned_analyst_id uuid references profiles (id),
  scope_summary text,
  blocked_reason text,
  onboarding_completed_at timestamptz,
  onboarding_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_locales_not_empty check (array_length(locales, 1) >= 1)
);

create index projects_org_idx on projects (organization_id, status);
create index projects_analyst_idx on projects (assigned_analyst_id) where assigned_analyst_id is not null;

create table ai_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  display_name text not null,
  internal_identifier text,
  system_owner_name text,
  environment text not null default 'staging'
    check (environment in ('production', 'staging', 'sandbox')),
  channel text not null default 'web_chat'
    check (channel in ('web_chat', 'help_centre', 'email', 'messaging', 'api')),
  vendor_model text,
  supported_locales locale_code[] not null default array['en-CA']::locale_code[],
  disclosure_text text,
  escalation_rules jsonb,
  service_hours text,
  known_limitations text,
  data_categories text[],
  -- Hosts the customer authorized. The SSRF guard checks against this list.
  authorized_hosts text[] not null default '{}',
  rate_limit_per_minute integer check (rate_limit_per_minute > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table connection_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  ai_system_id uuid not null references ai_systems (id) on delete cascade,
  adapter_type capture_mode not null,
  -- Non-secret configuration only.
  config jsonb not null default '{}',
  -- A reference into the managed secret store. NEVER the secret itself
  -- (FR-ONB-005).
  secret_reference text,
  status text not null default 'unconfigured'
    check (status in ('unconfigured', 'untested', 'ok', 'failing', 'revoked')),
  last_tested_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_configs_no_inline_secret
    check (secret_reference is null or secret_reference !~ '^(sk_|pk_|whsec_|Bearer )')
);

comment on column connection_configs.secret_reference is
  'Opaque handle into the secret store. The check constraint is a backstop against writing a raw credential here (FR-ONB-005).';

create table authorization_attestations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  signer_user_id uuid not null references profiles (id) on delete restrict,
  document_version text not null,
  scope jsonb not null,
  accepted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  evidence_object_id uuid,
  created_at timestamptz not null default now()
);

create index authorization_active_idx
  on authorization_attestations (project_id)
  where revoked_at is null;

create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  title text not null,
  source_type text not null check (source_type in ('pdf', 'docx', 'txt', 'csv', 'url')),
  storage_key text,
  source_url text,
  effective_date date,
  authority_rank integer not null default 1 check (authority_rank between 1 and 5),
  version text,
  checksum text,
  scan_status text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'infected', 'failed')),
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracted', 'failed', 'skipped')),
  customer_visible boolean not null default true,
  analyst_reviewed boolean not null default false,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  constraint knowledge_sources_location
    check (storage_key is not null or source_url is not null)
);

-- ---------------------------------------------------------------------------
-- 12.4 Scenarios and execution
-- ---------------------------------------------------------------------------

create table scenario_templates (
  id uuid primary key default gen_random_uuid(),
  -- Stable family ID shared by every version of a scenario.
  family_id uuid not null,
  version integer not null check (version >= 1),
  locale locale_code not null,
  title text not null,
  objective text not null,
  category text not null,
  industry text,
  channel text,
  risk_weight numeric(3, 2) not null default 1.00
    check (risk_weight in (1.00, 1.50, 2.00)),
  body jsonb not null,
  evaluation_rules jsonb not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  -- Pairs an English scenario with its French counterpart (10.7).
  bilingual_pair_key text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (family_id, version, locale)
);

create index scenario_templates_published_idx
  on scenario_templates (category, locale)
  where status = 'published';

create table audit_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  version integer not null check (version >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'superseded')),
  scenario_limit integer not null check (scenario_limit > 0),
  coverage_summary jsonb,
  change_reason text,
  created_by uuid references profiles (id),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table plan_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  audit_plan_id uuid not null references audit_plans (id) on delete cascade,
  scenario_template_id uuid references scenario_templates (id) on delete restrict,
  custom_scenario jsonb,
  locale locale_code not null,
  sequence integer not null,
  risk_weight numeric(3, 2) not null default 1.00
    check (risk_weight in (1.00, 1.50, 2.00)),
  bilingual_pair_id uuid,
  customer_facts jsonb,
  expected_outcomes jsonb,
  created_at timestamptz not null default now(),
  unique (audit_plan_id, sequence),
  constraint plan_scenarios_source
    check (scenario_template_id is not null or custom_scenario is not null)
);

create table test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  audit_plan_id uuid not null references audit_plans (id) on delete restrict,
  run_type text not null default 'initial'
    check (run_type in ('initial', 'retest', 'monitoring')),
  state run_state not null default 'draft',
  baseline_run_id uuid references test_runs (id) on delete set null,
  scheduled_window_start timestamptz,
  scheduled_window_end timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  rubric_version text,
  evaluator_version text,
  ai_cost_minor integer not null default 0 check (ai_cost_minor >= 0),
  analyst_minutes integer not null default 0 check (analyst_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index test_runs_state_idx on test_runs (state, created_at desc);

create table test_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  test_run_id uuid not null references test_runs (id) on delete restrict,
  plan_scenario_id uuid not null references plan_scenarios (id) on delete restrict,
  locale locale_code not null,
  state text not null default 'pending'
    check (state in ('pending', 'captured', 'evaluated', 'reviewed', 'unscorable')),
  capture_mode capture_mode not null,
  started_at timestamptz,
  completed_at timestamptz,
  latency_ms integer check (latency_ms >= 0),
  execution_error text,
  -- Approved final values only. AI proposals live on `evaluations`.
  approved_score numeric(5, 2) check (approved_score between 0 and 100),
  approved_confidence confidence_level,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index test_cases_run_idx on test_cases (test_run_id);

create table conversation_turns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  test_case_id uuid not null references test_cases (id) on delete restrict,
  sequence integer not null check (sequence >= 1),
  role text not null check (role in ('tester', 'system')),
  -- Immutable as captured. A correction is a separate annotation, never an
  -- edit to this column (FR-RUN-005).
  original_content text not null,
  normalized_content text,
  checksum text not null,
  character_count integer,
  token_count integer,
  pii_detected boolean not null default false,
  redaction_state text not null default 'none'
    check (redaction_state in ('none', 'partial', 'full')),
  captured_at timestamptz not null default now(),
  unique (test_case_id, sequence)
);

comment on column conversation_turns.original_content is
  'Immutable captured content. An UPDATE trigger rejects modification (FR-RUN-005).';

create table evidence_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  test_case_id uuid references test_cases (id) on delete restrict,
  storage_key text not null,
  media_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text not null,
  capture_source text not null,
  uploaded_by uuid references profiles (id),
  redaction_state text not null default 'none'
    check (redaction_state in ('none', 'partial', 'full')),
  -- Drives the retention worker (16.5).
  retention_date date,
  superseded_by uuid references evidence_objects (id),
  supersede_reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12.5 Evaluation, findings and reports
-- ---------------------------------------------------------------------------

create table evaluation_versions (
  id uuid primary key default gen_random_uuid(),
  rubric_version text not null,
  prompt_version text not null,
  provider text not null,
  model_identifier text not null,
  json_schema_version text not null,
  parameters jsonb not null default '{}',
  effective_from timestamptz not null default now(),
  retired_at timestamptz,
  approved_by uuid references profiles (id),
  unique (rubric_version, prompt_version, model_identifier)
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  test_case_id uuid not null references test_cases (id) on delete restrict,
  evaluation_version_id uuid not null references evaluation_versions (id) on delete restrict,
  -- Structured proposal from the evaluator. Never client-visible
  -- (FR-EVAL-001).
  proposed_output jsonb,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'invalid', 'manual_review')),
  retry_count integer not null default 0 check (retry_count <= 2),
  cost_minor integer not null default 0 check (cost_minor >= 0),
  latency_ms integer check (latency_ms >= 0),
  human_review_status text not null default 'required'
    check (human_review_status in ('required', 'in_review', 'approved', 'overridden')),
  override_reason text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table dimension_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  test_case_id uuid not null references test_cases (id) on delete restrict,
  evaluation_id uuid references evaluations (id) on delete set null,
  dimension score_dimension not null,
  weight numeric(5, 2) not null check (weight >= 0),
  -- 0-5, or NULL for a documented N/A (10.3).
  proposed_score smallint check (proposed_score between 0 and 5),
  approved_score smallint check (approved_score between 0 and 5),
  not_applicable_reason text,
  rationale text,
  evidence_refs jsonb,
  confidence confidence_level,
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (test_case_id, dimension),
  -- 10.3: an N/A dimension must carry a documented reason.
  constraint dimension_scores_na_reason
    check (approved_score is not null or not_applicable_reason is not null
           or approved_by is null)
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  test_run_id uuid not null references test_runs (id) on delete restrict,
  reference text not null,
  severity severity_level not null,
  dimension score_dimension not null,
  locale locale_code,
  status finding_status not null default 'open',
  title text not null,
  summary text not null,
  expected_behaviour text not null,
  observed_behaviour text not null,
  customer_impact text not null,
  business_risk_category text,
  -- Explicitly labelled a hypothesis in the report (FR-FND-001).
  root_cause_hypothesis text,
  recommended_remediation text not null,
  verification_method text,
  confidence confidence_level not null,
  -- Separated so an internal note can never be rendered in a client view.
  internal_notes text,
  customer_visible_notes text,
  owner_user_id uuid references profiles (id),
  due_date date,
  risk_accepted_by uuid references profiles (id),
  risk_accepted_reason text,
  risk_review_date date,
  human_confirmed_by uuid references profiles (id),
  senior_confirmed_by uuid references profiles (id),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reference)
);

create index findings_run_idx on findings (test_run_id, severity);

create table finding_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  finding_id uuid not null references findings (id) on delete cascade,
  test_case_id uuid references test_cases (id) on delete restrict,
  evidence_object_id uuid references evidence_objects (id) on delete restrict,
  knowledge_source_id uuid references knowledge_sources (id) on delete restrict,
  spans jsonb,
  created_at timestamptz not null default now()
);

create table finding_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  finding_id uuid not null references findings (id) on delete cascade,
  old_status finding_status,
  new_status finding_status not null,
  actor_id uuid references profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  project_id uuid not null references projects (id) on delete restrict,
  test_run_id uuid not null references test_runs (id) on delete restrict,
  family_id uuid not null,
  version integer not null check (version >= 1),
  locale_mode text not null default 'en'
    check (locale_mode in ('en', 'fr', 'bilingual')),
  status report_status not null default 'draft',
  score numeric(5, 2) check (score between 0 and 100),
  grade char(1) check (grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  parity_index numeric(5, 2) check (parity_index between 0 and 100),
  cap_applied text,
  incomplete boolean not null default false,
  content_snapshot jsonb,
  pdf_storage_key text,
  correction_reason text,
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  released_by uuid references profiles (id),
  released_at timestamptz,
  superseded_by uuid references reports (id),
  created_at timestamptz not null default now(),
  unique (family_id, version)
);

create table report_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  report_id uuid not null references reports (id) on delete restrict,
  user_id uuid references profiles (id),
  share_link_id uuid,
  action text not null check (action in ('viewed', 'downloaded', 'exported')),
  -- Coarse metadata only: no IP address, no user agent string (16.3).
  client_region text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12.6 Governance and operations
-- ---------------------------------------------------------------------------

create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  object_type text not null check (object_type in ('finding', 'project', 'report', 'test_case')),
  object_id uuid not null,
  author_id uuid not null references profiles (id) on delete restrict,
  visibility comment_visibility not null,
  content text not null check (char_length(content) <= 10000),
  mentions uuid[],
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index comments_object_idx on comments (object_type, object_id, created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  category text not null,
  -- A message KEY plus safe parameters, never rendered content. Keeps the
  -- notification localizable and free of transcript text (FR-NOT-003).
  content_key text not null,
  content_params jsonb not null default '{}',
  target_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete restrict,
  requester_id uuid not null references profiles (id) on delete restrict,
  category text not null check (category in ('access', 'billing', 'onboarding', 'report', 'privacy', 'security')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assignee_id uuid references profiles (id),
  subject text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete set null,
  user_id uuid references profiles (id) on delete set null,
  lead_email citext,
  consent_type text not null
    check (consent_type in ('terms', 'privacy', 'authorization', 'acceptable_use', 'marketing', 'contact_reply')),
  document_version text not null,
  source text not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  constraint consent_records_subject
    check (user_id is not null or lead_email is not null)
);

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete restrict,
  requester_id uuid references profiles (id),
  request_type text not null check (request_type in ('access', 'correction', 'export', 'deletion')),
  identity_verified boolean not null default false,
  status text not null default 'received'
    check (status in ('received', 'verifying', 'in_progress', 'completed', 'refused')),
  due_date date,
  completion_evidence text,
  refusal_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_type text not null check (actor_type in ('user', 'system', 'provider')),
  actor_id uuid,
  organization_id uuid references organizations (id) on delete set null,
  action text not null,
  object_type text,
  object_id uuid,
  outcome text not null check (outcome in ('success', 'denied', 'error')),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  correlation_id text,
  -- Redacted metadata only. Never transcript, policy or credential content.
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_events_org_idx on audit_events (organization_id, created_at desc);
create index audit_events_action_idx on audit_events (action, created_at desc);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  environment text not null,
  enabled boolean not null default false,
  organization_allowlist uuid[],
  changed_by uuid references profiles (id),
  change_reason text,
  updated_at timestamptz not null default now(),
  unique (key, environment)
);

-- ---------------------------------------------------------------------------
-- Immutability triggers
--
-- 12.7: "Immutable response and released-report content enforced by
-- application and database permissions."
-- ---------------------------------------------------------------------------

create or replace function reject_captured_content_change()
returns trigger
language plpgsql
as $$
begin
  if new.original_content is distinct from old.original_content
     or new.checksum is distinct from old.checksum then
    raise exception
      'Captured conversation content is immutable. Record a correction as a separate annotation (FR-RUN-005).'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger conversation_turns_immutable
  before update on conversation_turns
  for each row execute function reject_captured_content_change();

create or replace function reject_released_report_change()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'released' then
    -- Only the supersede pointer and status may change after release; a
    -- correction is published as a NEW version (FR-RPT-004).
    if new.content_snapshot is distinct from old.content_snapshot
       or new.score is distinct from old.score
       or new.grade is distinct from old.grade
       or new.parity_index is distinct from old.parity_index
       or new.pdf_storage_key is distinct from old.pdf_storage_key then
      raise exception
        'A released report is immutable. Issue a correction as a new report version (FR-RPT-004).'
        using errcode = 'restrict_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_released_immutable
  before update on reports
  for each row execute function reject_released_report_change();

-- Audit events are append-only.
create or replace function reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'This table is append-only.' using errcode = 'restrict_violation';
end;
$$;

create trigger audit_events_append_only
  before update or delete on audit_events
  for each row execute function reject_mutation();

create trigger finding_status_history_append_only
  before update or delete on finding_status_history
  for each row execute function reject_mutation();
