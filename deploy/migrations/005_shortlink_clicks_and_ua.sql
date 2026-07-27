-- Two additions to the admin dashboard:
--   1. Short-link click tracking - who's actually using a shared loadout,
--      not just who created it.
--   2. Browser/OS/device breakdown on pageviews.

-- ─────────────────────────────────────────────────────────────────────────
-- Short-link clicks. Resolution happens entirely client-side, straight from
-- the browser to PostgREST's get_short_link_payload() RPC (see App.jsx /
-- utils/api.js's resolveShortCode) - there's no Node-service request to
-- hook into, so the click is counted inside the RPC itself instead.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.short_links
  add column click_count integer not null default 0,
  add column last_clicked_at timestamptz;

-- Replaces the read-only version from 001_init.sql with one that also
-- records the click - CREATE OR REPLACE keeps the existing grants (anon
-- still can't UPDATE short_links directly, only through this
-- SECURITY DEFINER function). Semantics for an unknown code are unchanged:
-- the UPDATE matches zero rows, RETURNING produces zero rows, and a
-- zero-row result from a scalar SQL function is NULL - same as the old
-- SELECT-only version.
create or replace function public.get_short_link_payload(p_code text)
returns text
language sql
security definer
set search_path = public
as $$
  update public.short_links
  set click_count = click_count + 1,
      last_clicked_at = now()
  where code = p_code
  returning payload;
$$;

-- Lets the admin dashboard list short links (see routes/admin.js) - never
-- exposed through PostgREST/anon, only via the `analytics` role's direct
-- pg connection (see deploy/migrations/002_analytics_rollup.sql for why
-- that role exists).
grant select on public.short_links to analytics;

-- ─────────────────────────────────────────────────────────────────────────
-- Browser/OS/device on raw pageviews, and the session-level equivalent
-- (first event's values, same idea as entry_path/referrer) on the daily
-- rollup - see lib/userAgent.js for how these are derived.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.page_events
  add column browser text,
  add column os text,
  add column device_type text;

alter table public.daily_sessions
  add column browser text,
  add column os text,
  add column device_type text;
