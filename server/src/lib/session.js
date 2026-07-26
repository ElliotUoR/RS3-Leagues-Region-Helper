// Derives a per-visitor pseudonymous session id for analytics, without ever
// storing a raw IP address or a persistent client-side identifier (cookie,
// localStorage id, etc).
//
// This MUST run server-side: computing a real client IP requires seeing the
// actual request (the browser can't reliably learn its own public-facing
// IP), and the daily salt must never reach the browser or it stops being a
// secret. That's why analytics events go through POST /api/track (this
// service) instead of straight to PostgREST like the other public inserts.
//
// The daily salt is derived deterministically from a static server secret
// plus today's UTC date, so it rotates automatically at midnight without
// needing to persist/rotate anything in the database.
import crypto from 'node:crypto';

const SALT_SECRET = process.env.ANALYTICS_SALT_SECRET;

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function sessionIdFor(ip, userAgent) {
  if (!SALT_SECRET) {
    throw new Error('ANALYTICS_SALT_SECRET environment variable is required');
  }
  const dailySalt = crypto.createHmac('sha256', SALT_SECRET).update(todayUTC()).digest('hex');
  return crypto.createHmac('sha256', dailySalt).update(`${ip}|${userAgent}`).digest('hex');
}
