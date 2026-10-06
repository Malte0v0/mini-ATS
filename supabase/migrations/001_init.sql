-- 001_init.sql
-- Core schema for mini-ATS: profiles, jobs, candidates + Row Level Security.
-- Run in Supabase dashboard > SQL Editor.

-- ============================================================
-- Types
-- ============================================================
-- Enums instead of text + check: the allowed values live in one named type,
-- Postgres rejects anything else, and Supabase can generate TS union types from them.
create type public.user_role as enum ('admin', 'customer');
create type public.job_status as enum ('open', 'closed');
create type public.candidate_stage as enum (
  'applied', 'screening', 'interview', 'offer', 'hired', 'rejected'
);

-- ============================================================
-- Tables
-- ============================================================

-- One row per login. auth.users is managed by Supabase Auth; profiles holds
-- our own app data about that user (most importantly: their role).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  status public.job_status not null default 'open',
  created_at timestamptz not null default now(),
  -- Needed so candidates can reference (id, owner_id) together, see below.
  unique (id, owner_id)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null,
  full_name text not null,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  stage public.candidate_stage not null default 'applied',
  cv_path text,                                          -- path in the Storage bucket (chunk 5)
  ai_score smallint check (ai_score between 1 and 10),   -- set by the AI assessment (chunk 8)
  ai_assessment jsonb,                                   -- full AI result: summary, strengths, concerns
  created_at timestamptz not null default now(),
  -- Composite foreign key: the candidate's job must belong to the SAME owner.
  -- Without this, customer A could attach a candidate to customer B's job id.
  foreign key (job_id, owner_id) references public.jobs (id, owner_id) on delete cascade
);

-- RLS policies filter on owner_id on every query, so index it.
create index jobs_owner_id_idx on public.jobs (owner_id);
create index candidates_owner_id_idx on public.candidates (owner_id);
create index candidates_job_id_idx on public.candidates (job_id);

-- ============================================================
-- Helper: is the current user an admin?
-- ============================================================
-- security definer = runs with the privileges of the function's owner, so it
-- reads profiles WITHOUT applying RLS. That avoids infinite recursion: the
-- profiles policy calls is_admin(), which would otherwise trigger the profiles
-- policy again, which calls is_admin(), ...
-- set search_path = '' is a standard safety measure for security definer
-- functions: every table name must be schema-qualified (public.profiles), so
-- nobody can trick it into reading a look-alike table from another schema.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
-- With RLS enabled and no matching policy, a query sees zero rows and every
-- write is rejected. Each policy below opens up exactly one kind of access.
-- (select auth.uid()) instead of auth.uid(): Postgres evaluates it once per
-- query instead of once per row. Same result, faster on big tables.

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;

-- Logged-in users may use these tables at all; RLS then decides WHICH rows.
-- anon (not logged in) gets nothing.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.candidates to authenticated;

-- ---------- profiles ----------
-- You can see your own profile; admins see everyone (for the user list and
-- the "acting as" customer picker).
create policy "profiles: read own or admin"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

-- Only admins may update profiles. If customers could update their own row,
-- they could set role = 'admin' on themselves.
create policy "profiles: admin update"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert/delete policies on purpose: accounts are created by the
-- create-user Edge Function (chunk 3) using the secret key, which bypasses RLS.

-- ---------- jobs ----------
-- "for all" = select, insert, update and delete in one policy.
--   using      -> which existing rows you can see / update / delete
--   with check -> which rows you are allowed to write (insert, or the result of an update)
-- The with check stops a customer from inserting a job with someone else's
-- owner_id, or "moving" their job to another owner via update.
create policy "jobs: owner or admin"
on public.jobs for all
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (owner_id = (select auth.uid()) or public.is_admin());

-- ---------- candidates ----------
create policy "candidates: owner or admin"
on public.candidates for all
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (owner_id = (select auth.uid()) or public.is_admin());

-- ============================================================
-- First admin (run manually, once)
-- ============================================================
-- 1. Dashboard > Authentication > Users > Add user (email + password, auto confirm)
-- 2. Then run, with that user's email:
--
-- insert into public.profiles (id, email, full_name, role)
-- select id, email, 'Admin', 'admin' from auth.users where email = 'admin@example.com';
