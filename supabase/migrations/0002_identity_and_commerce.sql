-- ===========================================================================
-- 0002_identity_and_commerce.sql
-- Identity, tenancy and commerce tables (PRD 12.1, 12.2).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles (PRD 12.1)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null check (length(trim(display_name)) between 1 and 200),
  email_normalized  citext not null unique,
  locale            app.locale_code not null default 'en-CA',
  timezone          text not null default 'America/Toronto',
  -- FR-AUTH-002: MFA is mandatory for internal roles. Enforced in the
  -- application at sign-in; recorded here so the launch gate can be audited.
  mfa_enrolled_at   timestamptz,
  last_active_at    timestamptz,
  status            text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- organizations (PRD 12.1)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (length(trim(name)) between 1 and 200),
  slug                   citext not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  legal_name             text,
  country                text not null default 'CA' check (country ~ '^[A-Z]{2}$'),
  province_region        text,
  billing_email          citext,
  privacy_contact_email  citext,
  default_locale         app.locale_code not null default 'en-CA',
  timezone               text not null default 'America/Toronto',
  data_region_preference text not null default 'ca' check (data_region_preference in ('ca', 'us', 'eu', 'unspecified')),
  status                 app.organization_status not null default 'active',
  -- Marks the service provider's own organization, which carries internal
  -- staff memberships. There is exactly one (enforced by the unique index).
  is_internal            boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create unique index organizations_single_internal
  on public.organizations (is_internal) where is_internal;

create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- memberships (PRD 12.1)
-- ---------------------------------------------------------------------------
create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             app.membership_role not null,
  -- NULL means every project in the organization. A non-empty array restricts
  -- the member to those projects (PRD 7.2).
  project_scope    uuid[],
  invited_by       uuid references auth.users(id) on delete set null,
  accepted_at      timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint memberships_scope_not_empty
    check (project_scope is null or cardinality(project_scope) > 0)
);

-- PRD 12.1: "unique active membership constraint".
create unique index memberships_unique_active
  on public.memberships (organization_id, user_id) where revoked_at is null;

create index memberships_user_active
  on public.memberships (user_id) where revoked_at is null;

create trigger memberships_touch before update on public.memberships
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- invitations (PRD 12.1)
-- ---------------------------------------------------------------------------
create table public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  email            citext not null,
  role             app.membership_role not null,
  -- Only the hash is stored. A database read must not yield a usable invite.
  token_hash       bytea not null unique,
  invited_by       uuid references auth.users(id) on delete set null,
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),

  constraint invitations_expiry_future check (expires_at > created_at)
);

create index invitations_org on public.invitations (organization_id) where accepted_at is null;

-- ---------------------------------------------------------------------------
-- service_packages (PRD 12.2)
--
-- Global configuration, not tenant data. Prices live in the payment provider;
-- this table stores the reference amount for display only (PRD 6).
-- ---------------------------------------------------------------------------
create table public.service_packages (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique check (code ~ '^[a-z][a-z0-9_]{2,49}$'),
  name_en               text not null,
  name_fr               text not null,
  description_en        text not null,
  description_fr        text not null,
  billing_type          text not null check (billing_type in ('one_time', 'subscription', 'quote')),
  is_active             boolean not null default true,
  display_order         integer not null default 0,
  provider_product_id   text,
  provider_price_id     text,
  currency              text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  reference_amount_cents integer check (reference_amount_cents >= 0),
  -- Validated against the Zod entitlement schema in the application layer
  -- before it is written (FR-BILL-004).
  entitlement           jsonb not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger service_packages_touch before update on public.service_packages
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- orders (PRD 12.2)
-- ---------------------------------------------------------------------------
create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete restrict,
  package_id             uuid not null references public.service_packages(id) on delete restrict,
  contact_user_id        uuid references auth.users(id) on delete set null,
  contact_email          citext not null,
  provider_checkout_id   text,
  provider_payment_id    text,
  provider_customer_id   text,
  status                 app.order_status not null default 'pending',
  subtotal_cents         integer not null check (subtotal_cents >= 0),
  tax_cents              integer not null default 0 check (tax_cents >= 0),
  total_cents            integer not null check (total_cents >= 0),
  currency               text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  acquisition_source     text,
  coupon_code            text,
  -- FR-BILL-002 / PRD 13.5: the guard that makes webhook replay harmless.
  idempotency_key        text not null unique,
  -- Frozen copy of the entitlement at purchase time, so a later package edit
  -- never retroactively changes what a customer bought.
  entitlement_snapshot   jsonb not null,
  paid_at                timestamptz,
  refunded_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint orders_total_is_sum check (total_cents = subtotal_cents + tax_cents)
);

create index orders_org on public.orders (organization_id, created_at desc);
create unique index orders_provider_checkout
  on public.orders (provider_checkout_id) where provider_checkout_id is not null;

create trigger orders_touch before update on public.orders
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions (PRD 12.2)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete restrict,
  package_id               uuid not null references public.service_packages(id) on delete restrict,
  provider_subscription_id text unique,
  provider_customer_id     text,
  provider_price_id        text,
  status                   app.subscription_status not null default 'incomplete',
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  cancelled_at             timestamptz,
  entitlement_snapshot     jsonb not null,
  -- FR-BILL-005: a manual entitlement override must carry a reason and an actor.
  override_reason          text,
  override_by              uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint subscriptions_period_ordered
    check (current_period_end is null or current_period_start is null
           or current_period_end > current_period_start),
  constraint subscriptions_override_needs_reason
    check ((override_reason is null) = (override_by is null))
);

create index subscriptions_org on public.subscriptions (organization_id);

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- billing_events (PRD 12.2, FR-BILL-002)
--
-- Not tenant-scoped: an event arrives before the organization is known. Only
-- the platform owner and the service role may read it.
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id                  uuid primary key default gen_random_uuid(),
  -- The unique constraint IS the idempotency guarantee. A replayed webhook
  -- collides here and is rejected before any business effect.
  provider_event_id   text not null unique,
  provider            text not null default 'stripe',
  event_type          text not null,
  organization_id     uuid references public.organizations(id) on delete set null,
  -- A storage reference, never the raw provider payload: payloads carry
  -- billing detail that PRD 16.3 says to keep out of general-purpose tables.
  payload_reference   text,
  processing_status   text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed', 'dead_letter')),
  attempt_count       integer not null default 0 check (attempt_count >= 0),
  error_code          text,
  received_at         timestamptz not null default now(),
  processed_at        timestamptz
);

create index billing_events_unprocessed
  on public.billing_events (received_at)
  where processing_status in ('received', 'processing', 'failed');
