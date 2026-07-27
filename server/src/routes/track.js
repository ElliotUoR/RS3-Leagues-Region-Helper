import { Router } from 'express';
import { insertRow } from '../lib/postgrest.js';
import { sessionIdFor } from '../lib/session.js';
import { parseUserAgent } from '../lib/userAgent.js';
import { isAdminSession, ADMIN_COOKIE_NAME } from '../lib/adminAuth.js';

export const trackRouter = Router();

const MAX_PATH_LENGTH = 500;
const EVENT_TYPE_RE = /^[a-z0-9_-]{1,50}$/;

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
