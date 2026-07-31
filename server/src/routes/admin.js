import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getAnalyticsPool } from '../lib/analyticsDb.js';
import { ROLLUP_LAG_DAYS } from '../lib/analyticsRollup.js';
import { utcDateDaysAgo } from '../lib/dates.js';
import {
  requireAdmin,
  isAdminSession,
  createSessionCookieValue,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_MS,
} from '../lib/adminAuth.js';
import { REGIONS } from '../../../src/data/regions.js';

export const adminRouter = Router();

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
const TOP_N = 10;
// Fetched from each of the two data sources (rolled-up + raw-recent) before
// merging, so summing two partial top-10 lists can't drop an entry that
// would have made the real top 10 overall.
const PARTIAL_TOP_N = 20;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: ADMIN_COOKIE_MAX_AGE_MS,
};

// Only 5 attempts per 15 minutes - this guards a single shared password, so
// the usual per-IP report-issue-style limit (see reportIssue.js) would be
// far too generous here.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/admin/login
// Body: { password: string } - the single shared JellyFlow admin password,
// stored server-side only as a bcrypt hash (ADMIN_PASSWORD_HASH). No
// username/account system exists anywhere in this app.
adminRouter.post('/api/admin/login', loginLimiter, async (req, res) => {
  if (!ADMIN_PASSWORD_HASH) {
    console.error('ADMIN_PASSWORD_HASH environment variable is required');
    return res.status(503).json({ error: 'admin login not configured' });
  }
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || !(await bcrypt.compare(password, ADMIN_PASSWORD_HASH))) {
    return res.status(401).json({ error: 'invalid password' });
  }
  res.cookie(ADMIN_COOKIE_NAME, createSessionCookieValue(), COOKIE_OPTIONS);
  res.status(204).end();
});

adminRouter.post('/api/admin/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
  res.status(204).end();
});

// GET /api/admin/whoami
// Deliberately public (no requireAdmin) - the entire point is a cheap yes/no
// check anyone can make. Powers the "logged in as admin" badge on both
// JellyFlow and the RS3 Leagues app (see JellyFlow's public/adminBadge.js
// and src/hooks/useIsAdmin.js here) - both read the httpOnly session cookie
// indirectly through this, since neither can read it directly from JS.
adminRouter.get('/api/admin/whoami', (req, res) => {
  res.json({ isAdmin: isAdminSession(req.cookies?.[ADMIN_COOKIE_NAME]) });
});

function clampDays(rawValue) {
  const n = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, n));
}

function maxDateStr(a, b) {
  return a > b ? a : b;
}

// Dimensions summarized per session (one row per (day, session_id) in
// daily_sessions, first-event value - see lib/analyticsRollup.js) rather
// than per pageview, so "top browsers" etc counts distinct sessions the
// same way "top referrers" already did. `column`/`outputKey` are always one
// of the hardcoded values below, never user input.
const SESSION_DIMENSIONS = [
  { column: 'referrer', outputKey: 'referrer', defaultLabel: '(direct)' },
  { column: 'browser', outputKey: 'browser', defaultLabel: 'Unknown' },
  { column: 'os', outputKey: 'os', defaultLabel: 'Unknown' },
  { column: 'device_type', outputKey: 'deviceType', defaultLabel: 'Unknown' },
];

async function queryTopSessionDimension(pool, { column, outputKey, defaultLabel }, fromInclusive, toExclusive) {
  const { rows } = await pool.query(
    `select coalesce(${column}, $3) as "${outputKey}", count(*)::int as count
     from public.daily_sessions
     where day >= $1::date and day < $2::date
     group by ${column}
     order by count desc
     limit $4`,
    [fromInclusive, toExclusive, defaultLabel, PARTIAL_TOP_N],
  );
  return rows;
}

// Days strictly before ROLLUP_LAG_DAYS ago are read from the compact
// daily_path_stats/daily_sessions rollup tables. More recent days aren't
// guaranteed to have been rolled up yet, so they're queried live from raw
// page_events instead - see lib/analyticsRollup.js for why the lag exists.
async function queryRolledStats(pool, fromInclusive, toExclusive) {
  const [dailyPageviews, dailyUnique, pathTotals, dimensionTotals, sessionTotals] = await Promise.all([
    pool.query(
      `select day::text as day, sum(pageview_count)::int as pageviews
       from public.daily_path_stats
       where day >= $1::date and day < $2::date
       group by day`,
      [fromInclusive, toExclusive],
    ),
    pool.query(
      `select day::text as day, count(*)::int as unique_sessions
       from public.daily_sessions
       where day >= $1::date and day < $2::date
       group by day`,
      [fromInclusive, toExclusive],
    ),
    pool.query(
      `select path, sum(pageview_count)::int as count
       from public.daily_path_stats
       where day >= $1::date and day < $2::date
       group by path
       order by count desc
       limit $3`,
      [fromInclusive, toExclusive, PARTIAL_TOP_N],
    ),
    Promise.all(SESSION_DIMENSIONS.map((dim) => queryTopSessionDimension(pool, dim, fromInclusive, toExclusive))),
    pool.query(
      `select count(*)::int as total_sessions,
              coalesce(sum(extract(epoch from (ended_at - started_at))), 0)::float8 as total_seconds
       from public.daily_sessions
       where day >= $1::date and day < $2::date`,
      [fromInclusive, toExclusive],
    ),
  ]);

  const [referrerTotals, browserTotals, osTotals, deviceTypeTotals] = dimensionTotals;

  return {
    dailyPageviews: dailyPageviews.rows,
    dailyUnique: dailyUnique.rows,
    pathTotals: pathTotals.rows,
    referrerTotals,
    browserTotals,
    osTotals,
    deviceTypeTotals,
    totalSessions: sessionTotals.rows[0].total_sessions,
    totalSeconds: sessionTotals.rows[0].total_seconds,
  };
}

// fromTs/toTs are full ISO timestamps (UTC) - raw page_events has no `day`
// column, so day boundaries are derived here explicitly at query time
// rather than relying on Postgres's session timezone.
async function queryRawStats(pool, fromTs, toTs) {
  const [daily, pathTotals, perSessionAgg] = await Promise.all([
    pool.query(
      `select (created_at at time zone 'UTC')::date::text as day,
              count(*)::int as pageviews,
              count(distinct session_id)::int as unique_sessions
       from public.page_events
       where created_at >= $1::timestamptz and created_at < $2::timestamptz
       group by day`,
      [fromTs, toTs],
    ),
    pool.query(
      `select path, count(*)::int as count
       from public.page_events
       where created_at >= $1::timestamptz and created_at < $2::timestamptz
       group by path
       order by count desc
       limit $3`,
      [fromTs, toTs, PARTIAL_TOP_N],
    ),
    pool.query(
      `with per_session as (
         select session_id,
                min(created_at) as started_at,
                max(created_at) as ended_at,
                (array_agg(referrer order by created_at))[1] as referrer,
                (array_agg(browser order by created_at))[1] as browser,
                (array_agg(os order by created_at))[1] as os,
                (array_agg(device_type order by created_at))[1] as device_type
         from public.page_events
         where created_at >= $1::timestamptz and created_at < $2::timestamptz
         group by session_id
       )
       select
         (select coalesce(json_agg(json_build_object('referrer', coalesce(referrer, '(direct)'), 'count', cnt)), '[]')
          from (select referrer, count(*) as cnt from per_session group by referrer order by cnt desc limit $3) t) as referrer_totals,
         (select coalesce(json_agg(json_build_object('browser', coalesce(browser, 'Unknown'), 'count', cnt)), '[]')
          from (select browser, count(*) as cnt from per_session group by browser order by cnt desc limit $3) t) as browser_totals,
         (select coalesce(json_agg(json_build_object('os', coalesce(os, 'Unknown'), 'count', cnt)), '[]')
          from (select os, count(*) as cnt from per_session group by os order by cnt desc limit $3) t) as os_totals,
         (select coalesce(json_agg(json_build_object('deviceType', coalesce(device_type, 'Unknown'), 'count', cnt)), '[]')
          from (select device_type, count(*) as cnt from per_session group by device_type order by cnt desc limit $3) t) as device_type_totals,
         count(*)::int as total_sessions,
         coalesce(sum(extract(epoch from (ended_at - started_at))), 0)::float8 as total_seconds
       from per_session`,
      [fromTs, toTs, PARTIAL_TOP_N],
    ),
  ]);

  const aggRow = perSessionAgg.rows[0];
  return {
    dailyPageviews: daily.rows.map((r) => ({ day: r.day, pageviews: r.pageviews })),
    dailyUnique: daily.rows.map((r) => ({ day: r.day, unique_sessions: r.unique_sessions })),
    pathTotals: pathTotals.rows,
    referrerTotals: aggRow.referrer_totals,
    browserTotals: aggRow.browser_totals,
    osTotals: aggRow.os_totals,
    deviceTypeTotals: aggRow.device_type_totals,
    totalSessions: aggRow.total_sessions,
    totalSeconds: aggRow.total_seconds,
  };
}

function mergeDailySeries(rolled, raw) {
  const byDay = new Map();
  for (const { day, pageviews } of [...rolled.dailyPageviews, ...raw.dailyPageviews]) {
    const entry = byDay.get(day) ?? { day, pageviews: 0, uniqueVisitors: 0 };
    entry.pageviews += pageviews;
    byDay.set(day, entry);
  }
  for (const { day, unique_sessions: uniqueSessions } of [...rolled.dailyUnique, ...raw.dailyUnique]) {
    const entry = byDay.get(day) ?? { day, pageviews: 0, uniqueVisitors: 0 };
    entry.uniqueVisitors += uniqueSessions;
    byDay.set(day, entry);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function mergeTotals(rolledRows, rawRows, keyField) {
  const totals = new Map();
  for (const row of [...rolledRows, ...rawRows]) {
    const key = row[keyField];
    totals.set(key, (totals.get(key) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([key, count]) => ({ [keyField]: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

// GET /api/admin/summary?days=30
// Unique visitors / session length are inherently daily-scoped concepts
// here (session_id is derived from a salt that rotates every UTC day - see
// lib/session.js), so "unique visitors" over a multi-day window is a sum
// of daily approximate-unique counts, not a true window-wide dedup. That
// matches the cookie-less-analytics tradeoff already documented in
// docs/site-migration-plan.md Phase 5.
adminRouter.get('/api/admin/summary', requireAdmin, async (req, res) => {
  const days = clampDays(req.query.days);
  const pool = getAnalyticsPool();

  const windowStart = utcDateDaysAgo(days - 1);
  const rolledUpTo = utcDateDaysAgo(ROLLUP_LAG_DAYS);
  const rawFrom = maxDateStr(windowStart, rolledUpTo);
  const rawToExclusive = utcDateDaysAgo(-1); // tomorrow

  try {
    const [rolled, raw] = await Promise.all([
      queryRolledStats(pool, windowStart, rolledUpTo),
      queryRawStats(pool, `${rawFrom}T00:00:00Z`, `${rawToExclusive}T00:00:00Z`),
    ]);

    const dailySeries = mergeDailySeries(rolled, raw);
    const topPaths = mergeTotals(rolled.pathTotals, raw.pathTotals, 'path');
    const topReferrers = mergeTotals(rolled.referrerTotals, raw.referrerTotals, 'referrer');
    const topBrowsers = mergeTotals(rolled.browserTotals, raw.browserTotals, 'browser');
    const topOperatingSystems = mergeTotals(rolled.osTotals, raw.osTotals, 'os');
    const topDeviceTypes = mergeTotals(rolled.deviceTypeTotals, raw.deviceTypeTotals, 'deviceType');
    const totalSessions = rolled.totalSessions + raw.totalSessions;
    const totalSeconds = rolled.totalSeconds + raw.totalSeconds;
    const totalPageviews = dailySeries.reduce((sum, d) => sum + d.pageviews, 0);

    res.json({
      days,
      totalPageviews,
      uniqueVisitors: totalSessions,
      avgSessionSeconds: totalSessions > 0 ? Math.round(totalSeconds / totalSessions) : 0,
      dailySeries,
      topPaths,
      topReferrers,
      topBrowsers,
      topOperatingSystems,
      topDeviceTypes,
    });
  } catch (err) {
    console.error('admin summary query failed:', err);
    res.status(502).json({ error: 'could not load analytics right now' });
  }
});

const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function clampPage(rawValue) {
  const n = Number.parseInt(rawValue, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function clampPageSize(rawValue) {
  const n = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, n));
}

// GET /api/admin/shortlinks?page=1&pageSize=25
// Newest-created first - every loadout that's been turned into a share
// link (see routes/shorten.js), with how much it's actually being clicked
// (click_count/last_clicked_at, incremented inside get_short_link_payload -
// see deploy/migrations/005_shortlink_clicks_and_ua.sql). No payload/build
// details here - the admin dashboard links each code out to the live share
// URL to inspect it, rather than duplicating the frontend's decode logic
// server-side.
adminRouter.get('/api/admin/shortlinks', requireAdmin, async (req, res) => {
  const page = clampPage(req.query.page);
  const pageSize = clampPageSize(req.query.pageSize);
  const pool = getAnalyticsPool();

  try {
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `select code, created_at, click_count, last_clicked_at
         from public.short_links
         order by created_at desc
         limit $1 offset $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      pool.query('select count(*)::int as total from public.short_links'),
    ]);

    res.json({
      page,
      pageSize,
      total: countRows[0].total,
      items: rows.map((r) => ({
        code: r.code,
        createdAt: r.created_at,
        clickCount: r.click_count,
        lastClickedAt: r.last_clicked_at,
      })),
    });
  } catch (err) {
    console.error('admin shortlinks query failed:', err);
    res.status(502).json({ error: 'could not load short links right now' });
  }
});

function regionLabel(id) {
  return REGIONS[id]?.name ?? id;
}

// "asgarnia,kandarin,morytania" (see App.jsx's region-combo tracking, sorted
// so the same 3 regions always produce the same key regardless of pick
// order) -> "Asgarnia + Kandarin + Morytania".
function comboLabel(key) {
  return key.split(',').map(regionLabel).join(' + ');
}

// GET /api/admin/usage
// Ever-incrementing product-usage counters (see deploy/migrations/008_usage_counters.sql
// and routes/trackCounter.js) - distinct from /api/admin/summary's
// pageview/session stats, which are day-bucketed, rolled up, and pruned
// after a week. These have no time dimension at all, just a running total
// per (category, key) since the counter was first hit.
adminRouter.get('/api/admin/usage', requireAdmin, async (req, res) => {
  const pool = getAnalyticsPool();

  try {
    const [
      regionPicks,
      regionCombos,
      leagueRelicPicks,
      dropTableViews,
      buildGuideViews,
      blessingPicks,
      featureCounters,
    ] = await Promise.all([
        pool.query(
          `select key, count from public.usage_counters where category = 'region_pick' order by count desc`,
        ),
        pool.query(
          `select key, count from public.usage_counters where category = 'region_combo' order by count desc limit $1`,
          [TOP_N],
        ),
        pool.query(
          `select key, count from public.usage_counters where category = 'league_relic_pick' order by count desc`,
        ),
        // See deploy/migrations/009_relic_drop_table_usage.sql /
        // components/RelicDropTablePanel.jsx - keyed by relic name, one row
        // per relic that HAS a dropTable and has actually been opened at
        // least once (a relic with a dropTable nobody's clicked yet just
        // doesn't appear here - no need to pre-seed rows for it).
        pool.query(
          `select key, count from public.usage_counters where category = 'relic_drop_table' order by count desc`,
        ),
        // See deploy/migrations/010_build_guide_usage.sql /
        // pages/BuildGuidesPage.jsx - keyed by the build's id, counting both
        // clicking a card open and landing directly on a
        // "#build-guides/<id>" link. Same "opened at least once" caveat as
        // dropTableViews above - a build nobody's clicked yet just doesn't
        // appear here.
        pool.query(
          `select key, count from public.usage_counters where category = 'build_guide' order by count desc`,
        ),
        // See deploy/migrations/011_blessing_usage.sql /
        // hooks/useBlessingSelection.js - keyed by blessing name, one row per
        // blessing that has been picked at least once. Only the three tier
        // picks appear: the God Tier One power is derived from them rather
        // than chosen, so it is never counted.
        pool.query(
          `select key, count from public.usage_counters where category = 'blessing_pick' order by count desc`,
        ),
        pool.query(`select key, count from public.usage_counters where category = 'feature'`),
      ]);

    const featureCountFor = (key) => featureCounters.rows.find((r) => r.key === key)?.count ?? 0;

    res.json({
      regionPicks: regionPicks.rows.map((r) => ({ region: regionLabel(r.key), count: r.count })),
      regionCombos: regionCombos.rows.map((r) => ({ combo: comboLabel(r.key), count: r.count })),
      leagueRelicPicks: leagueRelicPicks.rows.map((r) => ({ relic: r.key, count: r.count })),
      dropTableViews: dropTableViews.rows.map((r) => ({ relic: r.key, count: r.count })),
      buildGuideViews: buildGuideViews.rows.map((r) => ({ build: r.key, count: r.count })),
      blessingPicks: blessingPicks.rows.map((r) => ({ blessing: r.key, count: r.count })),
      karamjaToggledOffCount: featureCountFor('karamja_toggled_off'),
      importRelicsUsedCount: featureCountFor('import_relics_used'),
    });
  } catch (err) {
    console.error('admin usage query failed:', err);
    res.status(502).json({ error: 'could not load usage stats right now' });
  }
});
