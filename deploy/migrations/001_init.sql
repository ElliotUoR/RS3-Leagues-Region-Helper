-- Initial schema for the RS3 Leagues Region Helper backend (short links,
-- issue reports, analytics events). Runs automatically on first container
-- boot via postgres's /docker-entrypoint-initdb.d mechanism (see
-- deploy/docker-compose.yml) - only executes once, against an empty data
-- volume, so edits after first boot need a real migration file instead.
--
-- IMPORTANT: replace CHANGE_ME_AUTHENTICATOR_PASSWORD below with a real
-- generated password before first boot (e.g. `openssl rand -hex 24`), and
-- put the same value in deploy/.env as POSTGRES_AUTHENTICATOR_PASSWORD so
-- PostgREST's PGRST_DB_URI can connect with it.

-- ─────────────────────────────────────────────────────────────────────────
-- Roles
--   authenticator - the only role PostgREST itself connects as; cannot
--                   touch any table directly, its one job is switching to..
--   anon          - ..the role every unauthenticated PostgREST request
--                   actually runs as (PGRST_DB_ANON_ROLE=anon). This app
--                   has no user accounts, so anon is the *only* role that
--                   ever queries through PostgREST - everything it can do
--                   is spelled out explicitly below via GRANT + RLS policy.
-- ─────────────────────────────────────────────────────────────────────────
create role anon nologin;
create role authenticator login password 'CHANGE_ME_AUTHENTICATOR_PASSWORD' noinherit;
grant anon to authenticator;

grant usage on schema public to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────
create table public.short_links (
  code        text primary key,
  payload     text not null,
  created_at  timestamptz not null default now()
);

create table public.issue_reports (
  id                   bigint generated always as identity primary key,
  body                 text not null,
  github_issue_number  integer,
  created_at           timestamptz not null default now()
);

create table public.page_events (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  event_type  text not null,
  path        text not null,
  referrer    text,
  created_at  timestamptz not null default now()
);

create index page_events_session_id_idx on public.page_events (session_id, created_at);

alter table public.short_links   enable row level security;
alter table public.issue_reports enable row level security;
alter table public.page_events   enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Grants + RLS policies - anon can INSERT into all three tables and nothing
-- else. In particular, anon has NO select grant on short_links: a blanket
-- "select your own row" RLS policy can't actually prevent someone from
-- issuing an unfiltered `GET /short_links` and enumerating every stored
-- payload, because RLS filters *rows*, not query shape. Resolving a code is
-- instead done exclusively through get_short_link_payload() below, a
-- SECURITY DEFINER function that only ever returns the single row matching
-- an exact code - there is no path to listing/enumerating the table via
-- PostgREST at all.
-- ─────────────────────────────────────────────────────────────────────────
grant insert on public.short_links to anon;
create policy short_links_insert on public.short_links
  for insert to anon with check (true);

grant insert on public.issue_reports to anon;
create policy issue_reports_insert on public.issue_reports
  for insert to anon with check (true);

grant insert on public.page_events to anon;
create policy page_events_insert on public.page_events
  for insert to anon with check (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Exact-code short link lookup, exposed by PostgREST as
-- POST /rpc/get_short_link_payload  body: {"p_code": "torva-seismic-vengeance"}
--
-- SECURITY DEFINER: runs with the privileges of the function's owner (the
-- migration-running superuser), not the calling `anon` role - which is what
-- lets it read short_links despite anon having no SELECT grant on that
-- table. It only ever returns the payload for one exact code, so it can't
-- be used to browse/list the table.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.get_short_link_payload(p_code text)
returns text
language sql
security definer
set search_path = public
as $$
  select payload from public.short_links where code = p_code;
$$;

revoke all on function public.get_short_link_payload(text) from public;
grant execute on function public.get_short_link_payload(text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Reading the tables (issue triage, analytics queries) is done via a direct
-- Postgres client (psql/TablePlus/DBeaver) connected as the `postgres`
-- superuser - deliberately not exposed through PostgREST/anon at all.
-- ─────────────────────────────────────────────────────────────────────────
