import { Router } from 'express';
import { insertRow } from '../lib/postgrest.js';
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateShortCode();
    const { conflict } = await insertRow('short_links', { code, payload });
    if (!conflict) {
      return res.status(201).json({ code });
    }
  }

  res.status(503).json({ error: 'could not generate a unique short code, try again' });
});
