import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getAnalyticsPool } from '../lib/analyticsDb.js';
import { countActiveSessions } from '../lib/activeSessions.js';
import { ROLLUP_LAG_DAYS } from '../lib/analyticsRollup.js';
import { utcDateDaysAgo } from '../lib/dates.js';
import {
  requireAdmin,
  isAdminSession,
  createSessionCookieValue,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_MS,
} from '../lib/adminAuth.js';
import { validateBuildFields } from './userBuilds.js';
import { CODE_RE, TIER_LIST_TYPES } from '../lib/tierListShape.js';
import { summariseTierLists } from '../lib/tierListStats.js';
import { REGIONS } from '../../../src/data/regions.js';
import { userBuildIdFromCounterKey } from '../../../src/utils/usageKeys.js';

export const adminRouter = Router();

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
const TOP_N = 25;
// Fetched from each of the two data sources (rolled-up + raw-recent) before
// merging, so summing two partial lists can't drop an entry that would have
// made the real top N overall. Must stay comfortably above TOP_N for that to
// hold - an entry ranked just outside both partial lists but first overall is
// only recoverable with headroom here.
const PARTIAL_TOP_N = 50;

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
      // Deliberately NOT scoped to `days` like everything else here: this is a
      // live gauge of who is on the site right now, held in this process's
      // memory rather than queried (see lib/activeSessions.js).
      activeUsers: countActiveSessions(),
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

// GET /api/admin/active-users
// The same live gauge /api/admin/summary returns, on its own. The dashboard
// polls this on a 60s timer when "auto-refresh active users" is on, and
// hitting /summary for it would re-run that route's ~8 Postgres aggregations
// every minute to read a number that is a Map scan in this process's memory
// (see lib/activeSessions.js). No date range applies - "right now" is the
// only window this number has.
adminRouter.get('/api/admin/active-users', requireAdmin, (_req, res) => {
  res.json({ activeUsers: countActiveSessions() });
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

// The `build_guide` counter covers this site's own guides AND user-submitted
// builds - same question, one ranked list (see src/utils/usageKeys.js). A
// curated guide's key is its slug id and reads fine as-is; a user build's is
// "user:<numeric id>", which does not, so the ids are resolved to the build's
// CURRENT name here. Deliberately at read time rather than baked into the
// counter key: a build can be renamed by its author or by an admin, and its
// view count has to survive that rather than splitting in two.
//
// A user build with views but no row left (it was deleted) still shows, as an
// explicit "deleted" entry - dropping it would silently change the totals.
async function labelBuildGuideKeys(pool, rows) {
  const ids = rows.map((r) => userBuildIdFromCounterKey(r.key)).filter(Boolean);
  let namesById = new Map();
  if (ids.length > 0) {
    const { rows: nameRows } = await pool.query(
      'select id, name from public.user_builds where id = any($1::bigint[])',
      [ids],
    );
    namesById = new Map(nameRows.map((r) => [String(r.id), r.name]));
  }
  return rows.map((r) => {
    const id = userBuildIdFromCounterKey(r.key);
    if (!id) return { build: r.key, count: r.count };
    const name = namesById.get(id);
    return { build: name ? `${name} (user build)` : `deleted user build #${id}`, count: r.count };
  });
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
        // appear here. Also carries user-submitted builds under a "user:<id>"
        // key (components/UserBuildListItem.jsx), resolved to their names by
        // labelBuildGuideKeys below.
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
      buildGuideViews: await labelBuildGuideKeys(pool, buildGuideViews.rows),
      blessingPicks: blessingPicks.rows.map((r) => ({ blessing: r.key, count: r.count })),
      karamjaToggledOffCount: featureCountFor('karamja_toggled_off'),
      importRelicsUsedCount: featureCountFor('import_relics_used'),
    });
  } catch (err) {
    console.error('admin usage query failed:', err);
    res.status(502).json({ error: 'could not load usage stats right now' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Tier lists
//
// Reads go through the `analytics` role's direct pg connection, not
// PostgREST-as-anon: anon has no select grant on this table at all (resolving
// one is an exact-code RPC), and the dashboard needs to see every row
// including hidden ones. Hiding is a SECURITY DEFINER function granted only to
// that role - see 016_tier_lists.sql.
// ─────────────────────────────────────────────────────────────────────────

// GET /api/admin/tier-lists?type=blessings
// Every stored list of that type, newest first, each with its full payload so
// the dashboard can rebuild the actual ranking - plus the aggregate analysis.
adminRouter.get('/api/admin/tier-lists', requireAdmin, async (req, res) => {
  const type = TIER_LIST_TYPES.includes(req.query.type) ? req.query.type : TIER_LIST_TYPES[0];
  const pool = getAnalyticsPool();
  try {
    const { rows } = await pool.query(
      `select code, type, payload, author_name, angle, hidden, refused, created_at
         from public.tier_lists
        where type = $1
        order by created_at desc`,
      [type],
    );
    res.json({
      type,
      // Refused lists are dropped from the stats and hidden ones are not - see
      // summariseTierLists for why the two flags differ.
      stats: summariseTierLists(type, rows),
      lists: rows.map((row) => ({
        code: row.code,
        authorName: row.author_name,
        angle: row.angle,
        hidden: row.hidden,
        refused: row.refused,
        createdAt: row.created_at,
        rowLabels: row.payload?.rowLabels ?? [],
        placements: row.payload?.placements ?? {},
      })),
    });
  } catch (err) {
    console.error('admin tier-lists query failed:', err);
    res.status(502).json({ error: 'could not load tier lists right now' });
  }
});

// PATCH /api/admin/tier-lists/:code  body: { hidden?: boolean, refused?: boolean }
// Two independent flags - hidden takes a list away from visitors, refused takes
// it out of the community ranking. See 017_tier_list_refused.sql.
adminRouter.patch('/api/admin/tier-lists/:code', requireAdmin, async (req, res) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'invalid code' });

  const { hidden, refused } = req.body ?? {};
  for (const [key, value] of [['hidden', hidden], ['refused', refused]]) {
    if (value !== undefined && typeof value !== 'boolean') {
      return res.status(400).json({ error: `${key} must be a boolean` });
    }
  }
  if (hidden === undefined && refused === undefined) {
    return res.status(400).json({ error: 'nothing to update - pass hidden and/or refused' });
  }

  const pool = getAnalyticsPool();
  try {
    const result = {};
    for (const [value, fn] of [[hidden, 'set_tier_list_hidden'], [refused, 'set_tier_list_refused']]) {
      if (value === undefined) continue;
      const { rows } = await pool.query(`select * from public.${fn}($1, $2)`, [code, value]);
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      Object.assign(result, rows[0]);
    }
    res.json(result);
  } catch (err) {
    console.error('admin moderate tier list failed:', err);
    res.status(502).json({ error: 'could not update that tier list right now' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// User-build moderation
//
// Reads go through the `analytics` role's direct pg connection rather than
// PostgREST-as-anon, because anon's RLS policy hides exactly the rows an admin
// needs to see (see 013_user_build_votes_and_moderation.sql). Hiding is a
// SECURITY DEFINER function granted only to that same role, so it is
// unreachable from a browser even though PostgREST is directly addressable.
// ─────────────────────────────────────────────────────────────────────────

// GET /api/admin/user-builds - every build INCLUDING hidden ones, with scores.
// Carries the same payload-derived summary fields the public listing does
// (see LIST_SELECT in routes/userBuilds.js), because the admin view renders
// the identical cards - an admin should be looking at what everyone else sees,
// plus the moderation controls, not a stripped-down version of it.
adminRouter.get('/api/admin/user-builds', requireAdmin, async (req, res) => {
  const pool = getAnalyticsPool();
  try {
    const { rows } = await pool.query(
      `select b.id, b.slug, b.name, b.tagline, b.author_name, b.styles, b.hidden,
              b.featured, b.featured_at, b.created_at,
              b.payload->'blessings'           as blessings,
              b.payload->'relics'              as relics,
              b.payload->>'difficultyLabel'    as "difficultyLabel",
              b.payload->>'difficultyNote'     as "difficultyNote",
              coalesce(sum(v.vote), 0)::int as raw_score,
              count(v.*) filter (where v.vote = 1)::int as upvotes,
              count(v.*) filter (where v.vote = -1)::int as downvotes
         from public.user_builds b
         left join public.user_build_votes v on v.build_id = b.id
        group by b.id
        order by b.created_at desc`,
    );
    res.json(
      rows.map((row) => ({
        ...row,
        // The public score is floored at 0; the admin view also carries the
        // true total, because "this one is sitting at -14" is the thing worth
        // acting on and the floor would hide it.
        score: Math.max(row.raw_score, 0),
      })),
    );
  } catch (err) {
    console.error('admin user-builds query failed:', err);
    res.status(502).json({ error: 'could not load user builds right now' });
  }
});

// GET /api/admin/user-builds/:id - one full build, `payload` included.
//
// Exists rather than reusing the public GET because that one reads as `anon`,
// whose RLS policy hides exactly the rows an admin most needs to open: a
// hidden build would 404. Editing a build down to something acceptable instead
// of leaving it hidden forever is the whole point of admin editing, so it has
// to be reachable while hidden.
//
// MUST be declared before PUT/PATCH below only for readability - Express keys
// on method as well as path, so these three cannot shadow each other.
adminRouter.get('/api/admin/user-builds/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

  const pool = getAnalyticsPool();
  try {
    const { rows } = await pool.query(
      `select id, name, tagline, author_name, styles, payload, hidden, featured, created_at
         from public.user_builds where id = $1`,
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('admin get build failed:', err);
    res.status(502).json({ error: 'could not load that build right now' });
  }
});

// PATCH /api/admin/user-builds/:id   body: { hidden?: boolean, featured?: boolean }
// The two moderation flags, either or both at once.
//
// Hiding removes it from every public read (the anon RLS policy in 012), and
// from voting too - cast_user_build_vote refuses a hidden build. Featuring
// promotes it onto the Build Guides page (see 014). The two are independent
// flags rather than one state, and hidden wins: the featured listing is an
// ordinary anon read, so the RLS policy pulls a hidden build off that page
// whether or not it is still flagged featured.
adminRouter.patch('/api/admin/user-builds/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

  const { hidden, featured } = req.body ?? {};
  for (const [key, value] of [['hidden', hidden], ['featured', featured]]) {
    if (value !== undefined && typeof value !== 'boolean') {
      return res.status(400).json({ error: `${key} must be a boolean` });
    }
  }
  if (hidden === undefined && featured === undefined) {
    return res.status(400).json({ error: 'nothing to update - pass hidden and/or featured' });
  }

  const pool = getAnalyticsPool();
  try {
    const result = {};
    if (hidden !== undefined) {
      const { rows } = await pool.query('select * from public.set_user_build_hidden($1, $2)', [id, hidden]);
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      Object.assign(result, rows[0]);
    }
    if (featured !== undefined) {
      const { rows } = await pool.query('select * from public.set_user_build_featured($1, $2)', [id, featured]);
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      Object.assign(result, rows[0]);
    }
    res.json(result);
  } catch (err) {
    console.error('admin moderate build failed:', err);
    res.status(502).json({ error: 'could not update that build right now' });
  }
});

// PUT /api/admin/user-builds/:id
// Body: { name, tagline, authorName, styles, payload } - the same envelope
// PATCH /api/user-builds/:id takes, minus the edit token. A full replace, not
// a partial update, because the edit form always submits the whole build.
//
// Runs the same validateBuildFields as the public create/update routes: an
// admin edit must not be able to store a build a normal submitter couldn't,
// or the sanitizer on the read side would start meeting shapes it was never
// written for. The write itself is admin_update_user_build (see 014) - a
// separate function from the token-checked one, granted only to `analytics`,
// so there is no code path where a missing token silently becomes an
// authorised edit.
adminRouter.put('/api/admin/user-builds/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

  const validated = validateBuildFields(req.body);
  if (validated.error) return res.status(400).json(validated);

  const pool = getAnalyticsPool();
  try {
    const { rows } = await pool.query('select * from public.admin_update_user_build($1, $2, $3, $4, $5, $6)', [
      id,
      validated.name,
      validated.tagline,
      validated.authorName,
      validated.styles,
      JSON.stringify(validated.payload),
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error('admin edit build failed:', err);
    res.status(502).json({ error: 'could not save those changes right now' });
  }
});
