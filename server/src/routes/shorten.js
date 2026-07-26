import { Router } from 'express';
import { insertRow } from '../lib/postgrest.js';
import { generateShortCode } from '../lib/shortCode.js';

const MAX_PAYLOAD_LENGTH = 10_000;
const MAX_ATTEMPTS = 5;

export const shortenRouter = Router();

// POST /api/shorten
// Body: { payload: string } - the already lz-string-compressed build string
// that encodeShareBuild() produces client-side (same format the existing
// `?share=` links use). This route never inspects/decodes it - it's stored
// as opaque text and handed straight back to the client on redirect, so
// this service stays fully decoupled from the app's build data shape.
shortenRouter.post('/api/shorten', async (req, res) => {
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
