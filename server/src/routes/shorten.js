import { Router } from 'express';
import crypto from 'node:crypto';
import { callScalarRpc, insertRow } from '../lib/postgrest.js';
import { generateShortCode } from '../lib/shortCode.js';

const MAX_PAYLOAD_LENGTH = 10_000;
const MAX_ATTEMPTS = 5;

// Cross-origin access is only needed from the static GitHub Pages mirror,
// which has no backend of its own - it calls this endpoint directly to turn
// a visitor's locally-saved loadout into a live-site short link when they
// follow a "visit the live site" link (see src/hooks/useLiveSiteUrl.js).
// Every other route in this service is same-origin only (reached through
// Caddy on jellyflow.xyz itself), so CORS is scoped to just this one route
// rather than applied service-wide.
const PAGES_ORIGIN = process.env.PAGES_ORIGIN;

export const shortenRouter = Router();

function allowPagesOrigin(req, res) {
  if (PAGES_ORIGIN && req.headers.origin === PAGES_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', PAGES_ORIGIN);
  }
}

shortenRouter.options('/api/shorten', (req, res) => {
  allowPagesOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
});

// POST /api/shorten
// Body: { payload: string } - the already lz-string-compressed build string
// that encodeShareBuild() produces client-side (same format the existing
// `?share=` links use). This route never inspects/decodes it - it's stored
// as opaque text and handed straight back to the client on redirect, so
// this service stays fully decoupled from the app's build data shape.
shortenRouter.post('/api/shorten', async (req, res) => {
  allowPagesOrigin(req, res);
  const { payload } = req.body ?? {};
  if (typeof payload !== 'string' || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  // Everything below talks to PostgREST - wrapped in one try/catch (same
  // pattern as reportIssue.js) so a PostgREST/network failure (e.g. a
  // migration not applied yet, so an RPC function doesn't exist) becomes a
  // normal error response instead of an unhandled promise rejection, which
  // crashes this entire Node process on modern Node by default and takes
  // every route down with it - not just this one.
  try {
    // Re-sharing the exact same build (no changes) shouldn't mint a new
    // code every time - look up by a hash of the payload first (see
    // deploy/migrations/004_short_link_dedup.sql for why it's hashed
    // rather than matched on the raw payload) and hand back the existing
    // link if one's already there.
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const existingCode = await callScalarRpc('get_short_code_for_payload_hash', { p_hash: payloadHash });
    if (existingCode) {
      return res.status(200).json({ code: existingCode });
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const code = generateShortCode();
      const { conflict } = await insertRow('short_links', { code, payload, payload_hash: payloadHash });
      if (!conflict) {
        return res.status(201).json({ code });
      }

      // payload_hash isn't a unique index (see 004_short_link_dedup.sql
      // for why - some pre-existing rows already share a payload), so a
      // conflict here can only be a plain `code` collision. Re-checking
      // for a raced duplicate is technically no longer reachable via a
      // genuine race on this exact payload (nothing would 409 on
      // payload_hash alone), but it's a cheap no-op in the common case
      // and still correct, so it stays.
      const racedCode = await callScalarRpc('get_short_code_for_payload_hash', { p_hash: payloadHash });
      if (racedCode) {
        return res.status(200).json({ code: racedCode });
      }
    }

    res.status(503).json({ error: 'could not generate a unique short code, try again' });
  } catch (err) {
    console.error('shorten failed:', err);
    res.status(502).json({ error: 'could not create a short link right now, try again later' });
  }
});
