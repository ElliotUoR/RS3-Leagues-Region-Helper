import { Router } from 'express';
import { insertRow } from '../lib/postgrest.js';
import { sessionIdFor } from '../lib/session.js';

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

  const sessionId = sessionIdFor(req.ip ?? 'unknown', req.get('user-agent') ?? 'unknown');

  try {
    await insertRow('page_events', {
      session_id: sessionId,
      event_type: eventType,
      path,
      referrer: typeof referrer === 'string' ? referrer.slice(0, MAX_PATH_LENGTH) : null,
    });
  } catch (err) {
    console.error('track insert failed:', err);
  }
  res.status(204).end();
});
