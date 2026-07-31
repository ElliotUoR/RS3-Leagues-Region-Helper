import { Router } from 'express';
import { insertRow } from '../lib/postgrest.js';
import { sessionIdFor } from '../lib/session.js';
import { parseUserAgent } from '../lib/userAgent.js';
import { isAdminSession, ADMIN_COOKIE_NAME } from '../lib/adminAuth.js';
import { markSessionActive } from '../lib/activeSessions.js';

export const trackRouter = Router();

const MAX_PATH_LENGTH = 500;
const EVENT_TYPE_RE = /^[a-z0-9_-]{1,50}$/;

// Sent periodically by an open tab (see src/hooks/useHeartbeat.js). Handled
// like any other event for validation and admin exclusion, then dropped before
// the insert - see the comment at that point for why it must not be stored.
const HEARTBEAT_EVENT_TYPE = 'heartbeat';

// POST /api/track
// Body: { event_type: string, path: string, referrer?: string }
// Fire-and-forget from the frontend's perspective - always resolves fast
// and never surfaces a failure to the visitor (analytics should never break
// the site). session_id is derived here, server-side, from the request's
// real IP + User-Agent - see lib/session.js for why that can't happen in
// the browser.
trackRouter.post('/api/track', async (req, res) => {
  const { event_type: eventType, path, referrer } = req.body ?? {};
  if (typeof eventType !== 'string' || !EVENT_TYPE_RE.test(eventType)) {
    return res.status(400).json({ error: 'invalid event_type' });
  }
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_PATH_LENGTH) {
    return res.status(400).json({ error: 'invalid path' });
  }

  // Don't record the admin's own browsing - the admin session cookie
  // (httpOnly, sent automatically) is the signal, checked the same way
  // requireAdmin does (see lib/adminAuth.js). Still returns 204 either way
  // so this is invisible from the frontend's perspective.
  if (isAdminSession(req.cookies?.[ADMIN_COOKIE_NAME])) {
    return res.status(204).end();
  }

  const userAgent = req.get('user-agent') ?? 'unknown';
  const sessionId = sessionIdFor(req.ip ?? 'unknown', userAgent);
  const { browser, os, deviceType } = parseUserAgent(userAgent);

  // Every tracked request counts as activity, heartbeat or not - someone
  // clicking between tabs is obviously active and should not depend on a
  // heartbeat landing. In-memory only; see lib/activeSessions.js.
  markSessionActive(sessionId);

  // Heartbeats stop here. They exist purely to keep a reading visitor inside
  // the active window (a pageview only fires on tab change, so someone reading
  // one page emits nothing for minutes), and they must never reach page_events:
  // the summary queries in routes/admin.js count rows without filtering on
  // event_type, so a stored heartbeat would inflate Pageviews and appear in Top
  // pages. Keeping them out of the table entirely is what makes this change
  // impossible to get wrong later, rather than relying on every future query
  // remembering to filter.
  if (eventType === HEARTBEAT_EVENT_TYPE) {
    return res.status(204).end();
  }

  try {
    await insertRow('page_events', {
      session_id: sessionId,
      event_type: eventType,
      path,
      referrer: typeof referrer === 'string' ? referrer.slice(0, MAX_PATH_LENGTH) : null,
      browser,
      os,
      device_type: deviceType,
    });
  } catch (err) {
    console.error('track insert failed:', err);
  }
  res.status(204).end();
});
