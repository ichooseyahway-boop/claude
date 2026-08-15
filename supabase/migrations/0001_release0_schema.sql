-- ============================================================================
-- School Inbox — Release 0 schema (PRD §13 subset)
-- PostgreSQL / Supabase. UUID primary keys, UTC timestamps.
-- Idempotency is enforced at the database layer via UNIQUE constraints.
-- Row Level Security is enabled on every table; Release 0 has no browser DB
-- access, so the default (deny to anon/authenticated, service role bypasses) is
-- the correct posture. Customer-facing SELECT policies arrive with the portal
-- in Release 1.
-- ============================================================================

create extension if not exists pgcrypto;

-- --- updated_at helper --------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- orders -------------------------------------------------------------------
create table if not exists orders (
  id                          uuid primary key default gen_random_uuid(),
  offer_id                    text not null,
  stripe_checkout_session_id  text not null unique,
  stripe_customer_id          text,
  stripe_payment_intent_id    text,
  amount_total                integer,               -- minor units (cents)
  currency                    text,
  customer_email              text,
  status                      text not null default 'paid'
                                check (status in ('pending_payment','paid','refunded','cancelled')),
  onboarding_status           text not null default 'not_started'
                                check (onboarding_status in ('not_started','in_progress','completed')),
  onboarding_token            text not null unique,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status, onboarding_status);
create index if not exists orders_created_idx on orders (created_at desc);

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

-- --- families -----------------------------------------------------------------
create table if not exists families (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references orders(id) on delete cascade,
  name                  text not null default '',
  email                 text not null default '',
  timezone              text not null default 'America/Toronto',
  status                text not null default 'onboarding'
                          check (status in ('onboarding','active','closed')),
  service_tier          text not null default 'rescue',
  retention_days        integer not null default 30,
  calendar_preference   text,
  reminder_preference   text,
  coparent_email        text,
  known_senders         text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists families_order_idx on families (order_id);

drop trigger if exists families_set_updated_at on families;
create trigger families_set_updated_at before update on families
  for each row execute function set_updated_at();

-- --- children -----------------------------------------------------------------
-- Full legal name is never required — nickname or initials only (PRD §16.1).
create table if not exists children (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  display_name  text not null,
  school_label  text,
  grade_label   text,
  color_token   text not null default '--sage',
  created_at    timestamptz not null default now()
);
create index if not exists children_family_idx on children (family_id);

-- --- consents -----------------------------------------------------------------
create table if not exists consents (
  order_id            uuid primary key references orders(id) on delete cascade,
  terms_accepted_at   timestamptz,
  privacy_accepted_at timestamptz,
  prohibited_ack_at   timestamptz,
  created_at          timestamptz not null default now()
);

-- --- onboarding_drafts (save-and-resume) -------------------------------------
create table if not exists onboarding_drafts (
  order_id    uuid primary key references orders(id) on delete cascade,
  step        integer not null default 0,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- --- webhook_events (idempotency guard) --------------------------------------
create table if not exists webhook_events (
  id            text primary key,   -- Stripe event id
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- --- notifications (idempotency + delivery log) ------------------------------
create table if not exists notifications (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  type            text not null,
  recipient       text not null,
  status          text not null default 'sent'
                    check (status in ('sent','failed','skipped')),
  created_at      timestamptz not null default now()
);

-- --- audit_events (append-only from the app's perspective) -------------------
create table if not exists audit_events (
  id            uuid primary key default gen_random_uuid(),
  actor         text not null,
  action        text not null,
  resource_type text not null,
  resource_id   text not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_events (created_at desc);

-- ============================================================================
-- Row Level Security — enabled everywhere. No permissive policies are created
-- for anon/authenticated in Release 0, so those roles are denied by default.
-- The server uses the service role, which bypasses RLS. Release 1 adds explicit
-- family-scoped SELECT policies for the customer portal.
-- ============================================================================
alter table orders            enable row level security;
alter table families          enable row level security;
alter table children          enable row level security;
alter table consents          enable row level security;
alter table onboarding_drafts enable row level security;
alter table webhook_events    enable row level security;
alter table notifications     enable row level security;
alter table audit_events      enable row level security;

-- Force RLS even for the table owner, so a mistaken non-service connection can
-- never read family data.
alter table orders            force row level security;
alter table families          force row level security;
alter table children          force row level security;
alter table consents          force row level security;
alter table onboarding_drafts force row level security;
