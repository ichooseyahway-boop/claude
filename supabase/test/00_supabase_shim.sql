-- ===========================================================================
-- 00_supabase_shim.sql
-- Minimal local stand-in for the Supabase-managed `auth` schema and roles.
--
-- Supabase provides `auth.users`, `auth.uid()` and the `anon`,
-- `authenticated` and `service_role` roles. A plain PostgreSQL instance does
-- not, so the migrations cannot be applied — or tested — without them.
--
-- This file exists ONLY to make `npm run db:test` work against a throwaway
-- local cluster (PRD 20.1: "database tests for constraints and RLS"). It is
-- never applied to a Supabase project, where the real objects already exist.
-- ===========================================================================

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

-- Supabase derives the current user from the request JWT. Locally we read a
-- session GUC that the test harness sets, which lets a test "become" a user
-- with `select test.become('<uuid>')`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Test helper schema. Readable by the role the tests switch into, otherwise
-- the first `test.become()` locks the session out of its own helpers.
create schema if not exists test;
grant usage on schema test to anon, authenticated, service_role;

create or replace function test.become(target_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(target_user::text, ''), false);
  execute 'set local role authenticated';
end;
$$;

create or replace function test.become_anonymous()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'set local role anon';
end;
$$;

grant execute on function test.become(uuid) to anon, authenticated, service_role;
grant execute on function test.become_anonymous() to anon, authenticated, service_role;
