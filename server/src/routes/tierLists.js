import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { callScalarRpc, callTableRpc, insertRow } from '../lib/postgrest.js';
import { generateTierListCode } from '../lib/shortCode.js';
import { fileIssue } from '../lib/github.js';
import { CODE_RE, TIER_LIST_TYPES, canonicalTierListJson, validateTierList } from '../lib/tierListShape.js';
import { renderTierListImage } from '../lib/tierListImageRender.js';
import { renderTierListPage } from '../lib/shareLinkTemplate.js';
import { tierListTitle } from '../../../src/data/tierListItems.js';

export const tierListsRouter = Router();

const MAX_ATTEMPTS = 5;
const SITE_ORIGIN = 'https://jellyflow.xyz';
const APP_BASE_PATH = '/Leagues/';

const saveLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/tier-lists
// Body: the draft as built on the Tier Lists page - { type, authorName, angle,
// rowLabels[7], placements }. Responds { code, type }.
//
// DEDUPED BY CONTENT. Saving the same list twice returns the code that already
// exists rather than minting a second. That is not just tidiness: Finish,
// Export and Share all save, so one visitor completing a list would otherwise
// write three near-identical rows and drag the analytics averages toward
// whoever fiddled most. Same generate-and-retry-on-conflict shape as
// routes/shorten.js - the unique index is what enforces it, not a prior check,
// so two simultaneous saves cannot both win.
tierListsRouter.post('/api/tier-lists', saveLimiter, async (req, res) => {
  const validated = validateTierList(req.body);
  if (validated.error) return res.status(400).json(validated);

  const payload = canonicalTierListJson(validated);
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

  try {
    const existing = await callScalarRpc('get_tier_list_code_for_hash', { p_hash: payloadHash });
    if (existing) return res.status(200).json({ code: existing, type: validated.type });

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const code = generateTierListCode();
      const { conflict } = await insertRow('tier_lists', {
        code,
        type: validated.type,
        payload: JSON.parse(payload),
        payload_hash: payloadHash,
        author_name: validated.authorName,
        angle: validated.angle,
      });
      if (!conflict) return res.status(201).json({ code, type: validated.type });

      // A conflict is either a code collision or another request having just
      // stored this exact list. Re-check the hash before burning another code.
      const raced = await callScalarRpc('get_tier_list_code_for_hash', { p_hash: payloadHash });
      if (raced) return res.status(200).json({ code: raced, type: validated.type });
    }
    res.status(503).json({ error: 'could not generate a unique code, try again' });
  } catch (err) {
    console.error('save tier list failed:', err);
    res.status(502).json({ error: 'could not save that tier list right now' });
  }
});

// GET /api/tier-lists/:type/:code - one list, for the read-only shared page.
// Both segments are checked: a real code under the wrong type would otherwise
// render a relic list beneath a blessings heading.
tierListsRouter.get('/api/tier-lists/:type/:code', async (req, res) => {
  const { type, code } = req.params;
  if (!TIER_LIST_TYPES.includes(type) || !CODE_RE.test(code)) {
    return res.status(400).json({ error: 'invalid tier list address' });
  }
  try {
    const rows = await callTableRpc('get_tier_list', { p_code: code, p_type: type });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('get tier list failed:', err);
    res.status(502).json({ error: 'could not load that tier list right now' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// The shared list's own page and its preview image.
//
// WHY A PATH AND NOT THE HASH: identical reasoning to /build-guides/:id (see
// routes/buildGuidePage.js). Everything after "#" is a fragment that browsers
// never send, so a server could not know which list to draw. The path form is
// what makes a per-list unfurl possible at all.
//
// Both fail open: an unknown or hidden code serves the ordinary default-tagged
// page rather than a 404, because this same URL is what a real visitor loads
// and the app itself renders a proper "taken down" message client-side.
// ─────────────────────────────────────────────────────────────────────────
async function loadForPage(type, code) {
  if (!TIER_LIST_TYPES.includes(type) || !CODE_RE.test(code)) return null;
  const rows = await callTableRpc('get_tier_list', { p_code: code, p_type: type });
  return rows?.[0] ?? null;
}

tierListsRouter.get('/tier-list/:type/:code', async (req, res) => {
  const { type, code } = req.params;
  let row = null;
  try {
    row = await loadForPage(type, code);
  } catch (err) {
    console.error('tier list page lookup failed:', err);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!row) return res.send(renderTierListPage(null, null, {}));
  const payload = row.payload ?? {};
  res.send(
    renderTierListPage(type, code, {
      title: tierListTitle(payload.authorName, type),
      angle: payload.angle,
    }),
  );
});

// GET /api/og-image/tier-list/:type/:code.png
//
// Also what "Export as image" downloads, so there is one renderer rather than
// a preview and a download that could drift apart. Unlike the page above this
// DOES 404 on an unknown code - an unfurl showing someone else's list, or a
// blank download, is worse than no image.
//
// Cached for an hour: a stored list is immutable (editing mints a new code -
// see the save route), so this could be cached forever, but an hour is enough
// to absorb the crawler burst one shared link causes while leaving room to fix
// a rendering bug without every existing link keeping the broken picture.
const IMAGE_MAX_AGE = 3_600;

tierListsRouter.get('/api/og-image/tier-list/:type/:code.png', async (req, res) => {
  const { type, code } = req.params;
  let row;
  try {
    row = await loadForPage(type, code);
  } catch (err) {
    console.error('tier list image lookup failed:', err);
    return res.status(502).send('lookup failed');
  }
  if (!row) return res.status(404).send('not found');

  try {
    const png = await renderTierListImage({ ...row.payload, type });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', `public, max-age=${IMAGE_MAX_AGE}`);
    res.send(png);
  } catch (err) {
    console.error('tier list image render failed:', err);
    res.status(500).send('render failed');
  }
});

// POST /api/tier-lists/:code/report - same shape as the user-build report:
// the reporter supplies a reason, everything identifying goes on server-side.
const REPORT_MIN = 10;
const REPORT_MAX = 1_000;

tierListsRouter.post('/api/tier-lists/:code/report', reportLimiter, async (req, res) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'invalid code' });

  const { reason, type } = req.body ?? {};
  if (typeof reason !== 'string' || reason.trim().length < REPORT_MIN || reason.length > REPORT_MAX) {
    return res.status(400).json({ error: `reason must be between ${REPORT_MIN} and ${REPORT_MAX} characters` });
  }
  const listType = TIER_LIST_TYPES.includes(type) ? type : TIER_LIST_TYPES[0];

  try {
    const body = [
      `Reported tier list: \`${code}\` (${listType})`,
      `Link: ${SITE_ORIGIN}${APP_BASE_PATH}tier-list/${listType}/${code}`,
      '',
      '**Reason given:**',
      reason.trim(),
      '',
      `To hide it: \`select set_tier_list_hidden('${code}', true);\``,
    ].join('\n');

    const issue = await fileIssue({ title: `Reported tier list: ${code}`.slice(0, 100), body });
    await insertRow('issue_reports', { body, github_issue_number: issue.number });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('report tier list failed:', err);
    res.status(502).json({ error: 'could not file that report right now, try again later' });
  }
});
