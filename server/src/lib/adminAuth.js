// Signed-cookie session for the single JellyFlow admin user - same HMAC
// style as lib/session.js's daily salt, deliberately avoiding a JWT
// dependency for what's just "one password, one role".
//
// Cookie value shape: `<base64url(JSON payload)>.<hex hmac-sha256 signature>`.
// The payload carries its own expiry (`exp`), so a stolen-but-expired
// cookie is worthless without needing server-side session storage.
import crypto from 'node:crypto';

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export const ADMIN_COOKIE_NAME = 'rs3_admin_session';
export const ADMIN_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;

function secret() {
  if (!SESSION_SECRET) {
    throw new Error('ADMIN_SESSION_SECRET environment variable is required');
  }
  return SESSION_SECRET;
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('hex');
}

export function createSessionCookieValue() {
  const payload = { exp: Date.now() + SESSION_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

function isValidSession(cookieValue) {
  if (typeof cookieValue !== 'string') return false;
  const [payloadB64, signature] = cookieValue.split('.');
  if (!payloadB64 || !signature) return false;

  const expected = sign(payloadB64);
  const actual = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (actual.length !== expectedBuf.length || !crypto.timingSafeEqual(actual, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Express middleware - 401s unless a valid, unexpired session cookie is
// present. Mount only on /api/admin/* routes that need it (not login).
export function requireAdmin(req, res, next) {
  if (!isValidSession(req.cookies?.[ADMIN_COOKIE_NAME])) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
