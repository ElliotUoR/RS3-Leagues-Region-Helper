import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { callVoidRpc } from '../lib/postgrest.js';
import { isAdminSession, ADMIN_COOKIE_NAME } from '../lib/adminAuth.js';

export const trackCounterRouter = Router();

// Kept in sync with the CHECK constraint on usage_counters.category (see
// deploy/migrations/008_usage_counters.sql, widened by
// 009_relic_drop_table_usage.sql and 010_build_guide_usage.sql) - validated
// here too so a bad request 400s with a clear error instead of surfacing a
// raw Postgres constraint-violation message.
const VALID_CATEGORIES = new Set([
  'region_pick',
  'region_combo',
  'league_relic_pick',
  'feature',
  'relic_drop_table',
  'build_guide',
]);
const MAX_KEY_LENGTH = 200;
// A single user action can fire several increments at once (locking in a
// 3-region combo is 3 individual region_pick increments + 1 region_combo
// increment - see App.jsx) - capped well above that so one request can't be
// used to hammer the RPC in bulk.
const MAX_INCREMENTS_PER_REQUEST = 10;

const trackCounterLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function isValidIncrement(increment) {
  return (
    increment &&
    VALID_CATEGORIES.has(increment.category) &&
    typeof increment.key === 'string' &&
    increment.key.length > 0 &&
    increment.key.length <= MAX_KEY_LENGTH
  );
}

// POST /api/track-counter
// Body: { increments: [{ category, key }, ...] }
// Simple, ever-incrementing usage counters (see deploy/migrations/008_usage_counters.sql)
// for product questions that don't fit page_events' pageview/session shape -
// "how often is each region picked", "how many people used the
// import-relics API", etc. Batched so one user action is one HTTP request,
// not several. Fire-and-forget from the frontend's perspective, same
// philosophy as routes/track.js - analytics must never break the site.
trackCounterRouter.post('/api/track-counter', trackCounterLimiter, async (req, res) => {
  // Same admin-exclusion as routes/track.js - the site owner's own browsing
  // shouldn't skew "how often is X picked" any more than it should skew
  // pageview counts.
  if (isAdminSession(req.cookies?.[ADMIN_COOKIE_NAME])) {
    return res.status(204).end();
  }

  const { increments } = req.body ?? {};
  if (!Array.isArray(increments) || increments.length === 0 || increments.length > MAX_INCREMENTS_PER_REQUEST) {
    return res.status(400).json({ error: 'invalid increments' });
  }
  if (!increments.every(isValidIncrement)) {
    return res.status(400).json({ error: 'invalid increment entry' });
  }

  try {
    await Promise.all(
      increments.map((increment) =>
        callVoidRpc('increment_usage_counter', { p_category: increment.category, p_key: increment.key }),
      ),
    );
  } catch (err) {
    console.error('track-counter failed:', err);
  }
  res.status(204).end();
});
