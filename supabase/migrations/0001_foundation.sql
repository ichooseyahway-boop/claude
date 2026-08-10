-- ===========================================================================
-- 0001_foundation.sql
-- Extensions, enumerated types and shared triggers. Table-independent only:
-- the membership-based authorization helpers live in 0003, after their tables.
--
-- PRD 12, 16.1, 16.2.
-- ===========================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid, digest
create extension if not exists "citext";        -- case-insensitive email

-- Application-owned helper schema. Kept out of `public` so nothing here is
-- exposed through PostgREST.
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enumerated types (PRD 12.7: "check constraints for enums")
-- ---------------------------------------------------------------------------

create type app.membership_role as enum (
  'platform_owner',
  'analyst',
  'senior_analyst',
  'client_owner',
  'client_contributor',
  'client_viewer',
  'billing_admin'
);

create type app.locale_code as enum ('en-CA', 'fr-CA');

create type app.organization_status as enum ('active', 'suspended', 'closed');

create type app.order_status as enum (
  'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'cancelled'
);

create type app.subscription_status as enum (
  'trialing', 'active', 'past_due', 'paused', 'cancelled', 'incomplete'
);

create type app.project_status as enum (
  'awaiting_onboarding',
  'onboarding_in_progress',
  'onboarding_submitted',
  'scope_changes_requested',
  'scope_approved',
  'scope_declined',
  'in_execution',
  'in_review',
  'report_released',
  'closed'
);

create type app.run_state as enum (
  'draft', 'approved', 'queued', 'running', 'review_required',
  'report_draft', 'released', 'paused', 'failed', 'cancelled', 'superseded'
);

create type app.capture_mode as enum (
  'manual', 'customer_upload', 'api_adapter', 'browser_runner'
);

create type app.score_dimension as enum (
  'factual_policy_accuracy',
  'resolution_effectiveness',
  'safety_privacy',
  'escalation_handoff',
  'context_memory',
  'empathy_tone',
  'language_cultural_fit'
);

create type app.finding_severity as enum ('critical', 'high', 'medium', 'low', 'observation');

create type app.finding_status as enum (
  'open', 'accepted', 'in_progress', 'ready_for_retest',
  'resolved', 'partially_resolved', 'risk_accepted', 'not_applicable', 'regressed'
);

create type app.confidence_level as enum ('low', 'medium', 'high');

create type app.report_status as enum ('draft', 'in_review', 'approved', 'released', 'superseded');

create type app.comment_visibility as enum ('internal', 'customer');

create type app.data_classification as enum ('public', 'internal', 'confidential', 'restricted');

create type app.privacy_request_type as enum ('access', 'correction', 'export', 'deletion');

create type app.risk_level as enum ('low', 'medium', 'high', 'critical');

-- ---------------------------------------------------------------------------
-- Shared triggers
-- ---------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Blocks UPDATE and DELETE outright. Attached to tables whose rows must be
-- immutable once written (PRD 12.7, FR-RUN-005, FR-RPT-004).
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Rows in % are immutable (PRD 12.7). Write a new version instead.', tg_table_name
    using errcode = 'restrict_violation';
end;
$$;
