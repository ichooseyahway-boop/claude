-- ===========================================================================
-- 0007_grants.sql
-- Table and function privileges for the PostgREST roles.
--
-- Two independent gates protect every row, and both are required:
--
--   GRANT  decides whether a role may touch a table at all.
--   RLS    decides which rows it sees once it may.
--
-- Supabase's bootstrap sets permissive default privileges on `public`, which
-- makes it easy to forget this layer entirely and then discover that a
-- freshly created table is readable by `anon`. Every grant here is therefore
-- written out explicitly, and the defaults are revoked first.
--
-- PRD 7.7 ("deny by default"), 16.1 ("least privilege").
-- ===========================================================================

-- Start from nothing, including for tables created by earlier migrations.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Anonymous
--
-- A signed-out visitor needs exactly one thing: the public price list for the
-- marketing pricing page. The `service_packages_public_read` policy narrows
-- that to active packages.
-- ---------------------------------------------------------------------------
grant select on public.service_packages to anon;

-- ---------------------------------------------------------------------------
-- Authenticated
--
-- Read access is granted on the tables the application reads through the
-- user's own connection. RLS decides which rows come back. Tables absent from
-- this list are unreachable for a signed-in user by any query, which is the
-- intended posture for billing_events and evaluation internals.
-- ---------------------------------------------------------------------------
grant select on
  public.profiles,
  public.organizations,
  public.memberships,
  public.invitations,
  public.service_packages,
  public.orders,
  public.subscriptions,
  public.projects,
  public.ai_systems,
  public.connection_configs,
  public.authorization_attestations,
  public.knowledge_sources,
  public.scenario_templates,
  public.audit_plans,
  public.plan_scenarios,
  public.test_runs,
  public.test_cases,
  public.conversation_turns,
  public.evidence_objects,
  public.evaluation_versions,
  public.evaluations,
  public.dimension_scores,
  public.findings,
  public.finding_evidence,
  public.finding_status_history,
  public.reports,
  public.report_access_events,
  public.comments,
  public.notifications,
  public.support_tickets,
  public.consent_records,
  public.privacy_requests,
  public.audit_events,
  public.feature_flags,
  public.usage_counters
to authenticated;

-- ---------------------------------------------------------------------------
-- Writes
--
-- Deliberately narrow. Everything commercially or evidentially significant —
-- orders, runs, evaluations, findings, reports, audit events — is written by
-- server-side code holding the service role, after the application-layer
-- authorization check in `src/domain/authz/permissions.ts`. A user's own
-- connection can only write the handful of things they genuinely own.
-- ---------------------------------------------------------------------------
grant insert, update on public.profiles to authenticated;
grant update on public.organizations to authenticated;
grant insert on public.comments to authenticated;
grant update on public.notifications to authenticated;
grant insert on public.support_tickets to authenticated;
grant insert on public.privacy_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions used inside RLS policies
--
-- These are SECURITY DEFINER, so EXECUTE is the only thing standing between a
-- caller and the function. They each answer one boolean question about the
-- current user and leak nothing else.
-- ---------------------------------------------------------------------------
grant execute on function
  app.current_user_id(),
  app.is_org_member(uuid),
  app.has_org_role(uuid, app.membership_role[]),
  app.is_internal(),
  app.is_platform_owner(),
  app.can_access_project(uuid),
  app.project_authorization_active(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Future tables
--
-- A table added by a later migration inherits NO privilege. That is the point:
-- adding a table should require a deliberate decision about who may read it,
-- rather than defaulting to "everyone signed in".
-- ---------------------------------------------------------------------------
alter default privileges in schema public grant select on tables to service_role;
