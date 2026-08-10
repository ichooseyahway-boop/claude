-- ===========================================================================
-- 0003_authorization_helpers.sql
-- The authorization helper functions every RLS policy depends on, plus the
-- policies for the identity and commerce tables.
--
-- These live AFTER 0002 rather than beside the enums because PostgreSQL
-- validates a `language sql` function body at creation time: a helper that
-- selects from `public.memberships` cannot be created before that table
-- exists.
--
-- PRD 7.7, 16.1, 16.2.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Authorization helpers
--
-- Every one of these is SECURITY DEFINER and reads `memberships` directly.
-- That is deliberate and necessary: a policy ON memberships that queries
-- memberships through RLS recurses infinitely. SECURITY DEFINER breaks the
-- cycle. Because these bypass RLS, each one is written to answer exactly one
-- narrow question about the CURRENT user and nothing else.
--
-- `search_path` is pinned on all of them so a caller cannot shadow `public`
-- with their own table and change what the function reads.
-- ---------------------------------------------------------------------------

create or replace function app.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid();
$$;

comment on function app.current_user_id() is
  'The authenticated user, or NULL for an anonymous request.';

-- True when the current user holds any active membership in the organization.
create or replace function app.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
  );
$$;

-- True when the current user holds one of the given roles in the organization.
create or replace function app.has_org_role(target_org uuid, roles app.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role = any(roles)
  );
$$;

-- True when the current user holds an internal (service-provider) role
-- anywhere. Internal staff are not members of customer organizations; they
-- reach customer data through assignment, checked by app.can_access_project.
create or replace function app.is_internal()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role in ('platform_owner', 'analyst', 'senior_analyst')
  );
$$;

create or replace function app.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role = 'platform_owner'
  );
$$;


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.organizations     enable row level security;
alter table public.memberships       enable row level security;
alter table public.invitations       enable row level security;
alter table public.service_packages  enable row level security;
alter table public.orders            enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.billing_events    enable row level security;

-- Force RLS even for the table owner, so a mistake in a definer function or a
-- migration cannot quietly read across tenants.
alter table public.organizations  force row level security;
alter table public.memberships    force row level security;
alter table public.orders         force row level security;
alter table public.subscriptions  force row level security;

-- profiles: a user sees and edits only their own row. Internal staff may read
-- profiles to attribute analyst actions.
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = app.current_user_id() or app.is_internal());

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check (id = app.current_user_id());

-- organizations: members read their own; only a client_owner may update it.
create policy organizations_member_read on public.organizations
  for select to authenticated
  using (app.is_org_member(id) or app.is_internal());

create policy organizations_owner_update on public.organizations
  for update to authenticated
  using (app.has_org_role(id, array['client_owner']::app.membership_role[]))
  with check (app.has_org_role(id, array['client_owner']::app.membership_role[]));

-- memberships: a user sees rows for organizations they belong to. Writes go
-- through the application, which checks `membership:change_role` and requires
-- recent authentication (PRD 7.7) — neither is expressible here.
create policy memberships_read on public.memberships
  for select to authenticated
  using (
    user_id = app.current_user_id()
    or app.is_org_member(organization_id)
    or app.is_internal()
  );

create policy invitations_read on public.invitations
  for select to authenticated
  using (
    app.has_org_role(organization_id, array['client_owner']::app.membership_role[])
    or app.is_internal()
  );

-- service_packages: the public pricing page reads active packages.
create policy service_packages_public_read on public.service_packages
  for select to anon, authenticated
  using (is_active);

create policy service_packages_owner_all on public.service_packages
  for all to authenticated
  using (app.is_platform_owner())
  with check (app.is_platform_owner());

-- orders and subscriptions: readable by billing-capable roles only. A
-- client_contributor or client_viewer has no business reading invoices.
create policy orders_read on public.orders
  for select to authenticated
  using (
    app.has_org_role(
      organization_id,
      array['client_owner', 'billing_admin']::app.membership_role[]
    )
    or app.is_internal()
  );

create policy subscriptions_read on public.subscriptions
  for select to authenticated
  using (
    app.has_org_role(
      organization_id,
      array['client_owner', 'billing_admin']::app.membership_role[]
    )
    or app.is_internal()
  );

-- billing_events: platform owner only. No customer-facing read path exists.
create policy billing_events_owner_read on public.billing_events
  for select to authenticated
  using (app.is_platform_owner());
