-- Splits the analytics pipeline by site. jellyflow.xyz now hosts a second
-- project, Movie Battles (jellyflow.xyz/moviebattles), which reports its
-- pageviews through this same service (POST /api/track with
-- site: 'moviebattles') rather than standing up a second copy of the whole
-- tracking/rollup/admin stack. The admin dashboard shows each site on its own
-- tab, so the two must never be mixed in a single number - hence a `site`
-- column on every analytics table rather than, say, a path prefix convention
-- (Movie Battles' paths could collide with this app's hash routes, and a
-- convention is exactly what a future query forgets to filter on).
--
-- Applied by server/scripts/migrate.js against the LIVE database, BEFORE the
-- new Node code starts (see .github/workflows/deploy-hetzner.yml). So every
-- step below has to be safe with yesterday's code still running against it:
--   - `site` is NOT NULL with a constant default, so the old track.js (which
--     never sends one) keeps inserting, and every existing row reads as
--     'leagues' - which is what all of it is. On Postgres 11+ adding a column
--     with a constant default is a catalogue-only change, no table rewrite.
--   - Old admin queries simply don't filter on site, which until Movie Battles
--     goes live is the same answer.
--   - The one thing the old code can't survive is the rollup's ON CONFLICT
--     (day, path) / (day, session_id): once the primary keys gain `site`
--     there is no unique index matching those targets any more. The rollup
--     only runs at process start and at 00:15 UTC, and the deploy replaces the
--     process within a minute of this migration, so the window is the old
--     container happening to hit 00:15 mid-deploy - logged, not thrown (see
--     scheduleAnalyticsRollup), and re-done by the new process's startup run.
--
-- Columns, the CHECK and the primary keys are not given any grants of their
-- own: anon's INSERT on page_events and analytics' SELECT/INSERT/UPDATE/DELETE
-- are table-level grants, which cover columns added later, and the RLS
-- policies from 001/003 are `using (true)` / `with check (true)` with no
-- column list, so they need no change either. That was verified against a
-- real Postgres (anon insert with and without site, analytics select/upsert/
-- delete) before this shipped, rather than assumed - 003's account of the
-- silent zero-rows bug is why.

-- ─────────────────────────────────────────────────────────────────────────
-- The column, on the raw table and both rollups. The CHECK lives in the
-- database as well as in routes/track.js (lib/sites.js) for the same reason
-- usage_counters.category's does: the route gives a clear 400, the
-- constraint makes a bad value impossible however it arrives. Named
-- explicitly so a later migration widening it can drop it by name.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.page_events
  add column site text not null default 'leagues'
  constraint page_events_site_check check (site in ('leagues', 'moviebattles'));

alter table public.daily_path_stats
  add column site text not null default 'leagues'
  constraint daily_path_stats_site_check check (site in ('leagues', 'moviebattles'));

alter table public.daily_sessions
  add column site text not null default 'leagues'
  constraint daily_sessions_site_check check (site in ('leagues', 'moviebattles'));

-- ─────────────────────────────────────────────────────────────────────────
-- Primary keys gain `site`. daily_path_stats needs it because both sites can
-- have a path called "/" on the same day. daily_sessions needs it because
-- session_id is HMAC(daily salt, ip + user agent) (lib/session.js) with no
-- site in it, so the same visitor on both sites on the same day has the SAME
-- session_id - without `site` in the key the second site's rollup would
-- overwrite the first's row.
--
-- `site` leads, then `day`: every read is "this site, this date range" (see
-- routes/admin.js), and a btree on (site, day, ...) answers that as a prefix
-- scan. That is also why the old daily_sessions_day_idx (on day alone) is
-- dropped rather than replaced with a (site, day) index - the new primary key
-- already is one, and a second copy would only cost writes.
--
-- The existing primary keys are looked up by type rather than assumed to be
-- named "<table>_pkey", for the same reason 009-011 look the category CHECK
-- up by definition: a couple of earlier migrations here have already failed
-- on a naming-convention guess.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  rollup_table text;
  existing_pkey text;
begin
  foreach rollup_table in array array['daily_path_stats', 'daily_sessions'] loop
    select conname into existing_pkey
    from pg_constraint
    where conrelid = format('public.%I', rollup_table)::regclass
      and contype = 'p';

    if existing_pkey is not null then
      execute format('alter table public.%I drop constraint %I', rollup_table, existing_pkey);
    end if;
  end loop;
end $$;

alter table public.daily_path_stats
  add constraint daily_path_stats_pkey primary key (site, day, path);

alter table public.daily_sessions
  add constraint daily_sessions_pkey primary key (site, day, session_id);

drop index if exists public.daily_sessions_day_idx;

-- ─────────────────────────────────────────────────────────────────────────
-- Movie Battles' usage counters (POST /api/track-counter). usage_counters
-- deliberately gets no `site` column: the `mb_` category prefix is the site's
-- namespace, and categories are already a closed, hand-maintained list.
--   mb_run_started  key = difficulty: normal | hard | realistic
--   mb_act_reached  key = <act>:<difficulty>, act one of act2 | pro | black
--                   (act 1 is every run start, so it isn't sent)
--   mb_run_ended    key = <ending>:<difficulty>, ending = the game engine's
--                   RunEnding.kind
-- Kept in sync by hand with routes/trackCounter.js's VALID_CATEGORIES, same
-- as every other category; labelled for the dashboard in routes/admin.js.
--
-- Widened the same way 009-011 did it: Postgres has no ALTER CONSTRAINT for
-- CHECKs, so drop and re-add, looked up by definition text rather than an
-- assumed name.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'public.usage_counters'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category%';

  if existing_constraint is not null then
    execute format('alter table public.usage_counters drop constraint %I', existing_constraint);
  end if;

  alter table public.usage_counters add constraint usage_counters_category_check
    check (category in (
      'region_pick', 'region_combo', 'league_relic_pick', 'feature', 'relic_drop_table', 'build_guide', 'blessing_pick',
      'mb_run_started', 'mb_act_reached', 'mb_run_ended'
    ));
end $$;
