-- Simple, ever-incrementing usage counters for product questions that don't
-- fit page_events/daily_path_stats' shape ("how often is each region
-- picked", "how many people used the import-relics API", etc). That
-- pipeline is pageview/session-shaped: bucketed by day, rolled up after
-- ROLLUP_LAG_DAYS, and raw rows hard-deleted after RAW_RETENTION_DAYS (see
-- analyticsRollup.js) - reusing it for these would both corrupt "top pages"
-- with non-page keys (a region id or relic name showing up as if it were a
-- visited path) and silently lose the data a week later, since
-- daily_path_stats only preserves per-day pageview counts, not per-event-type
-- breakdowns. These counters are the opposite: no day bucketing, no rollup,
-- never pruned - just a running total per (category, key), forever.

create table public.usage_counters (
  category    text not null check (category in ('region_pick', 'region_combo', 'league_relic_pick', 'feature')),
  key         text not null check (char_length(key) between 1 and 200),
  count       bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (category, key)
);

alter table public.usage_counters enable row level security;

-- No direct grants to anon at all, not even insert - incrementing is an
-- upsert (insert-or-bump), which a plain RLS insert policy can't express
-- safely (a bare "insert with check (true)" policy would let anyone reset
-- an existing counter back to 1 by inserting a fresh row.. except the
-- primary key would conflict - but there's still no way to express "bump
-- an existing row" as an INSERT-only policy). All access goes through the
-- SECURITY DEFINER function below instead, same pattern as
-- get_short_link_payload (001_init.sql).
create or replace function public.increment_usage_counter(p_category text, p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_counters (category, key, count, updated_at)
  values (p_category, p_key, 1, now())
  on conflict (category, key) do update
  set count = usage_counters.count + 1, updated_at = now();
$$;

revoke all on function public.increment_usage_counter(text, text) from public;
grant execute on function public.increment_usage_counter(text, text) to anon;

-- Reading these (admin dashboard, see routes/admin.js) is done via the
-- low-privilege `analytics` role's direct pg connection, same as
-- page_events/daily_* - never exposed through PostgREST/anon.
--
-- The GRANT alone is not enough - RLS is on with no policy yet, so without
-- a matching policy `analytics` would silently get zero rows back from
-- every select (no error, just empty results). This exact bug already
-- happened once for page_events/daily_* (see
-- 003_analytics_rls_policies.sql's own account of it) and was caught again
-- here by actually running this migration against a real Postgres and
-- querying as `analytics` before it ever shipped, rather than repeating it
-- a third time.
grant select on public.usage_counters to analytics;
create policy analytics_select_usage_counters on public.usage_counters
  for select to analytics using (true);
