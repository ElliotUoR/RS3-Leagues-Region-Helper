import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getAnalyticsPool } from '../lib/analyticsDb.js';
import { ROLLUP_LAG_DAYS } from '../lib/analyticsRollup.js';
import { utcDateDaysAgo } from '../lib/dates.js';
import {
  requireAdmin,
  createSessionCookieValue,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_MS,
} from '../lib/adminAuth.js';

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

function clampDays(rawValue) {
  const n = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, n));
}

function maxDateStr(a, b) {
  return a > b ? a : b;
}

// Days strictly before ROLLUP_LAG_DAYS ago are read from the compact
// daily_path_stats/daily_sessions rollup tables. More recent days aren't
// guaranteed to have been rolled up yet, so they're queried live from raw
// page_events instead - see lib/analyticsRollup.js for why the lag exists.
async function queryRolledStats(pool, fromInclusive, toExclusive) {
  const [dailyPageviews, dailyUnique, pathTotals, referrerTotals, sessionTotals] = await Promise.all([
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
    pool.query(
      `select coalesce(referrer, '(direct)') as referrer, count(*)::int as count
       from public.daily_sessions
       where day >= $1::date and day < $2::date
       group by referrer
       order by count desc
       limit $3`,
      [fromInclusive, toExclusive, PARTIAL_TOP_N],
    ),
    pool.query(
      `select count(*)::int as total_sessions,
              coalesce(sum(extract(epoch from (ended_at - started_at))), 0)::float8 as total_seconds
       from public.daily_sessions
       where day >= $1::date and day < $2::date`,
      [fromInclusive, toExclusive],
    ),
  ]);

  return {
    dailyPageviews: dailyPageviews.rows,
    dailyUnique: dailyUnique.rows,
    pathTotals: pathTotals.rows,
    referrerTotals: referrerTotals.rows,
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
                (array_agg(referrer order by created_at))[1] as referrer
         from public.page_events
         where created_at >= $1::timestamptz and created_at < $2::timestamptz
         group by session_id
       )
       select
         (select coalesce(json_agg(json_build_object('referrer', coalesce(referrer, '(direct)'), 'count', cnt)), '[]')
          from (
            select referrer, count(*) as cnt from per_session group by referrer order by cnt desc limit $3
          ) top_referrers) as referrer_totals,
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
    });
  } catch (err) {
    console.error('admin summary query failed:', err);
    res.status(502).json({ error: 'could not load analytics right now' });
  }
});
