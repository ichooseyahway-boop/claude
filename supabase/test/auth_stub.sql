-- Minimal stand-in for the Supabase-managed `auth` schema.
--
-- Purpose: let the migrations be applied and the RLS policies exercised against
-- a plain PostgreSQL instance in CI, without a Supabase project. Supabase
-- provides `auth.users`, `auth.uid()` and `auth.jwt()` in a real deployment;
-- this file recreates only the surface the migrations depend on.
--
-- This file is FOR TESTING ONLY. It is never applied to a Supabase project,
-- where it would conflict with the platform-managed schema.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

-- The current user id, driven by a session setting in tests:
--   set local request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
