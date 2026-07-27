// Daily rollup + retention job for analytics ("smart storage" - see
// docs/site-migration-plan.md Phase 5). Aggregates raw public.page_events
// rows into two compact per-day tables (daily_path_stats, daily_sessions)
// and prunes raw events past a fixed retention window, so disk use stays
// roughly flat instead of growing forever with traffic.
//
// Runs inside the long-running Node service (node-cron, no extra
// container) rather than as a separate scheduled job, since this service
// is already up 24/7. Uses the low-privilege `analytics` Postgres role
// (see deploy/migrations/002_analytics_rollup.sql) via a direct `pg`
// connection - this data isn't reachable through PostgREST/anon at all.
import cron from 'node-cron';
import { getAnalyticsPool } from './analyticsDb.js';
import { utcDateDaysAgo } from './dates.js';

// Raw events are rolled up once they're this many days old - well past the
// point new events could still be arriving for that UTC day - and pruned
// once they're this many days old outright, independent of whether the
// rollup for that specific day succeeded (a rollup bug must never turn
// into unbounded disk growth). Exported so routes/admin.js knows exactly
// which recent days aren't in the rollup tables yet and must be queried
// live from page_events instead.
export const ROLLUP_LAG_DAYS = 2;
const RAW_RETENTION_DAYS = 7;

// Ordered path_sequence is capped per session-day so a bot/scraper loop
// can't blow up a single daily_sessions row.
const MAX_PATH_SEQUENCE_LENGTH = 100;

async function rollUpDay(client, day) {
  const { rowCount } = await client.query(
    `
    with ranked as (
      select session_id, path, referrer, created_at,
             row_number() over (partition by session_id order by created_at) as rn
      from public.page_events
      where created_at >= $1::date and created_at < ($1::date + interval '1 day')
    ),
    totals as (
      select session_id, min(created_at) as started_at, max(created_at) as ended_at, count(*) as event_count
      from ranked
      group by session_id
    ),
    entry as (
      select session_id, path as entry_path, referrer
      from ranked
      where rn = 1
    ),
    sequence as (
      select session_id,
             jsonb_agg(jsonb_build_object('path', path, 'at', created_at) order by created_at) as path_sequence
      from ranked
      where rn <= $2
      group by session_id
    )
    insert into public.daily_sessions (day, session_id, started_at, ended_at, event_count, entry_path, referrer, path_sequence)
    select $1::date, t.session_id, t.started_at, t.ended_at, t.event_count, e.entry_path, e.referrer, s.path_sequence
    from totals t
    join entry e using (session_id)
    join sequence s using (session_id)
    on conflict (day, session_id) do update
    set started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        event_count = excluded.event_count,
        entry_path = excluded.entry_path,
        referrer = excluded.referrer,
        path_sequence = excluded.path_sequence
    `,
    [day, MAX_PATH_SEQUENCE_LENGTH],
  );

  await client.query(
    `
    insert into public.daily_path_stats (day, path, pageview_count, unique_sessions)
    select $1::date, path, count(*), count(distinct session_id)
    from public.page_events
    where created_at >= $1::date and created_at < ($1::date + interval '1 day')
    group by path
    on conflict (day, path) do update
    set pageview_count = excluded.pageview_count,
        unique_sessions = excluded.unique_sessions
    `,
    [day],
  );

  return rowCount;
}

async function pruneOldEvents(client) {
  const { rowCount } = await client.query(
    `delete from public.page_events where created_at < now() - make_interval(days => $1::int)`,
    [RAW_RETENTION_DAYS],
  );
  return rowCount;
}

export async function runAnalyticsRollup() {
  const client = await getAnalyticsPool().connect();
  try {
    const day = utcDateDaysAgo(ROLLUP_LAG_DAYS);
    const sessions = await rollUpDay(client, day);
    const pruned = await pruneOldEvents(client);
    console.log(`analytics rollup: day=${day} sessions=${sessions} pruned_events=${pruned}`);
  } finally {
    client.release();
  }
}

// Runs once at startup (so a container restart doesn't wait up to 24h for
// the first rollup) and then daily at 00:15 UTC. Errors are logged, never
// thrown - a failed rollup should never crash the whole service, same
// fire-and-forget-but-log philosophy as routes/track.js.
export function scheduleAnalyticsRollup() {
  runAnalyticsRollup().catch((err) => console.error('analytics rollup failed:', err));
  cron.schedule('15 0 * * *', () => {
    runAnalyticsRollup().catch((err) => console.error('analytics rollup failed:', err));
  }, { timezone: 'UTC' });
}
