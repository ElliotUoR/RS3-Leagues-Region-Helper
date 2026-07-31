import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { callScalarRpc, insertRowReturning, selectRows } from '../lib/postgrest.js';

export const userBuildsRouter = Router();

const MAX_NAME_LENGTH = 100;
const MAX_TAGLINE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 60;
const MAX_PAYLOAD_JSON_LENGTH = 40_000;
const VALID_STYLES = new Set(['melee', 'ranged', 'magic', 'necromancy']);
const LIST_LIMIT = 100;
// Columns a plain row read is allowed to return - deliberately excludes
// `edit_token_hash`. Postgres itself already refuses to SELECT that column
// for `anon` (see the column-scoped grant in 012_user_builds.sql), so this
// is belt-and-braces rather than the only thing stopping a leak.
const PUBLIC_COLUMNS = 'id,name,tagline,styles,author_name,payload,hidden,created_at';

// Same insurance level as report-issue - cheap protection against casual
// spam, not a defence against a determined attacker.
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const updateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Shared by create and update - both need the same envelope checks on
// name/tagline/authorName/styles/payload.
function validateBuildFields(body) {
  const { name, tagline = '', authorName = '', styles, payload } = body ?? {};
  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
    return { error: `name must be 1-${MAX_NAME_LENGTH} characters` };
  }
  if (typeof tagline !== 'string' || tagline.length > MAX_TAGLINE_LENGTH) {
    return { error: `tagline must be at most ${MAX_TAGLINE_LENGTH} characters` };
  }
  if (typeof authorName !== 'string' || authorName.length > MAX_AUTHOR_LENGTH) {
    return { error: `author name must be at most ${MAX_AUTHOR_LENGTH} characters` };
  }
  if (!Array.isArray(styles) || styles.length === 0 || !styles.every((s) => VALID_STYLES.has(s))) {
    return { error: 'styles must be a non-empty array of valid combat styles' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'payload must be an object' };
  }
  if (JSON.stringify(payload).length > MAX_PAYLOAD_JSON_LENGTH) {
    return { error: `payload too large (max ${MAX_PAYLOAD_JSON_LENGTH} bytes)` };
  }
  return { name: name.trim(), tagline: tagline.trim(), authorName: authorName.trim(), styles, payload };
}

// POST /api/user-builds
// Body: { name, tagline, authorName, styles, payload }
// `payload` is the whole build (regions/relics/blessings/stages/prose) as
// built by src/utils/userBuildShape.js - stored as opaque JSON, same
// philosophy as short_links.payload: this route validates its envelope
// (size, that it's an object) but not its internal shape, so the app's build
// data model is free to evolve without a matching migration every time.
//
// Generates a random edit token, returned to the caller EXACTLY ONCE (never
// re-derivable from the response of any later GET) - only its sha256 hash is
// stored. The frontend keeps the raw token in localStorage as the sole proof
// of authorship (see src/utils/myBuilds.js) - there are no accounts, so this
// token IS the account for as long as that browser/device keeps it.
userBuildsRouter.post('/api/user-builds', createLimiter, async (req, res) => {
  const validated = validateBuildFields(req.body);
  if (validated.error) return res.status(400).json(validated);

  const token = crypto.randomBytes(24).toString('hex');
  try {
    const row = await insertRowReturning('user_builds', {
      name: validated.name,
      tagline: validated.tagline,
      author_name: validated.authorName,
      styles: validated.styles,
      payload: validated.payload,
      edit_token_hash: hashToken(token),
    });
    res.status(201).json({ id: row.id, token });
  } catch (err) {
    console.error('create user build failed:', err);
    res.status(502).json({ error: 'could not save this build right now, try again later' });
  }
});

// PATCH /api/user-builds/:id
// Body: { token, name, tagline, authorName, styles, payload }
// Re-validates the same fields as create, then calls update_user_build() -
// a SECURITY DEFINER Postgres function (see 012_user_builds.sql) that only
// updates the row if the hash of `token` matches the one stored at creation.
// `anon` has no plain UPDATE grant on the table at all, so this RPC is the
// only path to an edit - a wrong/missing token 403s rather than 404ing,
// since the id might be real but the token still be invalid.
userBuildsRouter.patch('/api/user-builds/:id', updateLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { token } = req.body ?? {};
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'missing edit token' });
  }
  const validated = validateBuildFields(req.body);
  if (validated.error) return res.status(400).json(validated);

  try {
    const updatedId = await callScalarRpc('update_user_build', {
      p_id: id,
      p_token_hash: hashToken(token),
      p_name: validated.name,
      p_tagline: validated.tagline,
      p_styles: validated.styles,
      p_payload: validated.payload,
    });
    if (updatedId === null) {
      return res.status(403).json({ error: 'invalid edit token for this build' });
    }
    res.status(200).json({ id: updatedId });
  } catch (err) {
    console.error('update user build failed:', err);
    res.status(502).json({ error: 'could not save these changes right now, try again later' });
  }
});

// GET /api/user-builds
// Listing view: everything the "User made builds" page's cards need before
// one is opened, newest first. Deliberately omits `payload` (the full
// build) - that's only fetched once a specific card is opened, via
// GET /api/user-builds/:id below, so browsing the list doesn't pull down
// every submitted build's entire loadout/prose up front.
userBuildsRouter.get('/api/user-builds', async (_req, res) => {
  try {
    const rows = await selectRows('user_builds', {
      select: 'id,name,tagline,styles,author_name,created_at',
      order: 'created_at.desc',
      limit: String(LIST_LIMIT),
    });
    res.json(rows);
  } catch (err) {
    console.error('list user builds failed:', err);
    res.status(502).json({ error: 'could not load user builds right now' });
  }
});

// GET /api/user-builds/:id - the full build for one card.
userBuildsRouter.get('/api/user-builds/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    const rows = await selectRows('user_builds', { select: PUBLIC_COLUMNS, id: `eq.${id}`, limit: '1' });
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('get user build failed:', err);
    res.status(502).json({ error: 'could not load this build right now' });
  }
});
