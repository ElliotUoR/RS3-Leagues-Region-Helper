-- Adds compact daily rollups for analytics ("smart storage") and a
-- dedicated low-privilege role for the always-on Node service to read/write
-- them. Applied automatically by server/scripts/migrate.js (see
-- docs/deployment.md) - unlike 001_init.sql this does NOT run via
-- postgres's /docker-entrypoint-initdb.d, since that only fires on an empty
-- data volume and this server already has one.
--
-- IMPORTANT: replace CHANGE_ME_ANALYTICS_PASSWORD below with a real
-- generated password before this runs against the live server (e.g.
-- `openssl rand -hex 24`), and put the same value in deploy/.env as
-- ANALYTICS_DB_PASSWORD.

-- ─────────────────────────────────────────────────────────────────────────
-- Role - distinct from anon/authenticator (which PostgREST uses). This one
-- is only ever used via a direct `pg` connection from the Node service
-- (server/src/lib/analyticsRollup.js and server/src/routes/admin.js),
-- never reachable through PostgREST/the browser.
-- ─────────────────────────────────────────────────────────────────────────
create role analytics login password 'CHANGE_ME_ANALYTICS_PASSWORD' noinherit;

grant usage on schema public to analytics;
grant select, delete on public.page_events to analytics;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollup tables - one row per (day, path) / (day, session) instead of one
-- row per pageview. A daily job aggregates page_events into these and then
-- prunes the raw rows (see analyticsRollup.js), so disk use stays roughly
-- flat instead of growing forever with traffic.
-- ─────────────────────────────────────────────────────────────────────────
create table public.daily_path_stats (
  day              date not null,
  path             text not null,
  pageview_count   integer not null,
  unique_sessions  integer not null,
  primary key (day, path)
);

create table public.daily_sessions (
  day            date not null,
  session_id     text not null,
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  event_count    integer not null,
  entry_path     text not null,
  referrer       text,
  -- [{"path": "...", "at": "..."}, ...] in visit order, capped at 100
  -- entries per session-day (see analyticsRollup.js) so a bot/scraper loop
  -- can't blow this row up unboundedly.
  path_sequence  jsonb not null,
  primary key (day, session_id)
);

create index daily_sessions_day_idx on public.daily_sessions (day);

grant select, insert on public.daily_path_stats to analytics;
grant select, insert on public.daily_sessions to analytics;

-- Rollup writes are upserts (a re-run after a crash must be safe), so the
-- analytics role also needs UPDATE on conflict targets.
grant update on public.daily_path_stats to analytics;
grant update on public.daily_sessions to analytics;
