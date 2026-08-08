import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { callScalarRpc, callTableRpc, insertRow, insertRowReturning, selectRows } from '../lib/postgrest.js';
import { fileIssue } from '../lib/github.js';
import { sessionIdFor } from '../lib/session.js';
import { isReservedSlug, slugCandidate, slugify } from '../lib/userBuildSlug.js';
import { isAdminSession, ADMIN_COOKIE_NAME } from '../lib/adminAuth.js';
import { BLESSING_TIERS } from '../../../src/data/blessings.js';
import { LEAGUE_RELICS } from '../../../src/data/leagueRelics.js';

export const userBuildsRouter = Router();

const MAX_NAME_LENGTH = 100;
const MAX_TAGLINE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 60;
const MAX_PAYLOAD_JSON_LENGTH = 40_000;
// The "opt out" path (see /set-password below) submits the 48-char hex edit
// token itself as the password, so the max has to comfortably clear that -
// a genuinely typed password is realistically never anywhere near this long.
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 200;
const BCRYPT_COST = 10;
const VALID_STYLES = new Set(['melee', 'ranged', 'magic', 'necromancy']);
const LIST_LIMIT = 100;
const FEATURED_LIMIT = 12;
// Absolute, because a GitHub issue is read outside the browser that filed it.
const SITE_ORIGIN = 'https://jellyflow.xyz';
const APP_BASE_PATH = '/Leagues/';
// Columns a plain row read is allowed to return - deliberately excludes
// `edit_token_hash`. Postgres itself already refuses to SELECT that column
// for `anon` (see the column-scoped grant in 012_user_builds.sql), so this
// is belt-and-braces rather than the only thing stopping a leak.
const PUBLIC_COLUMNS = 'id,slug,name,tagline,styles,author_name,payload,hidden,featured,created_at';
// How many "-2", "-3", ... suffixes to try before giving up on a name. Only
// reached when that many builds already share a name, which is a lot.
const SLUG_ATTEMPTS = 25;

// What a collapsed card on the listing shows. The blessings/relics/difficulty
// live inside `payload`, so they are read out as jsonb paths rather than
// shipping the whole payload (up to MAX_PAYLOAD_JSON_LENGTH each) for every
// row just to draw a few pills - the point of keeping `payload` off this
// endpoint in the first place. `->` for the arrays, `->>` for the text fields.
//
// No god tier here: it is not stored. The submitted payload carries only the
// three tier picks and the god power is derived from them on read (see
// sanitizeUserBuildPayload), so the card derives it too rather than reading a
// field that is always null.
const LIST_SELECT = [
  'id,slug,name,tagline,styles,author_name,created_at,featured',
  'blessings:payload->blessings',
  'relics:payload->relics',
  'difficultyLabel:payload->>difficultyLabel',
  'difficultyNote:payload->>difficultyNote',
].join(',');

// `payload` is opaque JSON to this service - it is only ever sanitized in the
// browser (see src/utils/userBuildShape.js), so a hand-crafted POST can put
// anything at all in these fields. The listing clamps them rather than handing
// the frontend a 10,000-character "difficulty label" to try to lay out. Names
// that aren't real blessings/relics are dropped by the components themselves,
// so only length and type need enforcing here.
function shortText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function nameArray(value, max) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string').slice(0, max).map((v) => v.slice(0, 60));
}

// Derived, not hardcoded. These caps were 4 and 8, written when a run picked
// three blessings and a handful of relics. Tiers 4-6 took blessings to six, and
// the listing quietly truncated every build to its first four - so a collapsed
// card showed a one-pill second row and no God Tier Two, while the same build
// opened showed all six. The card was fine; the data reaching it was not.
//
// Reading the real counts means the next tier that gets revealed cannot
// reintroduce this. `+ 2` on relics is headroom over the one-per-tier rule -
// Rejuvenated's bonus pick only needs 1, and the listing should truncate a
// malformed payload rather than a legal build (see data/leagueRelicPicks.js).
const MAX_LISTED_BLESSINGS = BLESSING_TIERS.length;
const MAX_LISTED_RELICS = LEAGUE_RELICS.length + 2;

function shapeListRow(row) {
  return {
    ...row,
    blessings: nameArray(row.blessings, MAX_LISTED_BLESSINGS),
    relics: nameArray(row.relics, MAX_LISTED_RELICS),
    difficultyLabel: shortText(row.difficultyLabel, 40),
    difficultyNote: shortText(row.difficultyNote, 300),
  };
}

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

// Stricter than updateLimiter - this is the one endpoint here an attacker
// gains something from hammering (guessing a password), rather than just
// being generally disruptive, so it gets its own tighter ceiling.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
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
// name/tagline/authorName/styles/payload. Exported because the admin edit
// route (routes/admin.js) has to apply exactly the same limits: an admin
// rewriting a build must not be able to store one a normal submitter couldn't.
export function validateBuildFields(body) {
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
  const base = slugify(validated.name);
  try {
    // Generate-and-retry rather than check-then-insert: the unique index is
    // what actually enforces uniqueness, so two simultaneous "Big Boned Tank"
    // submissions cannot both take the same slug - one loses the insert and
    // tries the next suffix. Same pattern short link codes use.
    let row = null;
    for (let attempt = 0; attempt < SLUG_ATTEMPTS && !row; attempt += 1) {
      const slug = slugCandidate(base, attempt);
      // A curated guide's id wins the /build-guides/<x> lookup, so a user
      // build sitting on one would be unreachable - skip to the next suffix.
      if (isReservedSlug(slug)) continue;
      const inserted = await insertRowReturning(
        'user_builds',
        {
          slug,
          name: validated.name,
          tagline: validated.tagline,
          author_name: validated.authorName,
          styles: validated.styles,
          payload: validated.payload,
          edit_token_hash: hashToken(token),
        },
        // Only these two - anon has no grant on edit_token_hash, and asking for
        // the default `*` makes Postgres refuse the whole insert.
        { select: 'id,slug', signalConflict: true },
      );
      if (!inserted.conflict) row = inserted;
    }
    if (!row) throw new Error(`could not find a free slug for "${base}" in ${SLUG_ATTEMPTS} attempts`);
    res.status(201).json({ id: row.id, slug: row.slug, token });
  } catch (err) {
    console.error('create user build failed:', err);
    // `reason` is a fixed, non-sensitive code the client can put in an
    // auto-filed issue - the real error only ever goes to the server log.
    res.status(502).json({ error: 'could not save this build right now, try again later', reason: 'db_insert_failed' });
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
      p_author_name: validated.authorName,
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

// ─────────────────────────────────────────────────────────────────────────
// Edit password: a second, tokenless way back into a build's edit access -
// see 018_user_build_password.sql for the full reasoning. Every new build
// sets one at publish time (CreateBuildPage's confirmation step), either
// something the author typed or - if they opted out - their own edit token
// used as the password verbatim; either way this route never has to know or
// care which, it just hashes whatever string it's given.
// ─────────────────────────────────────────────────────────────────────────

// POST /api/user-builds/:id/set-password
// Body: { token, password }
// Sets the one-time edit password, proven via the SAME edit token this
// browser already has (from creating the build moments earlier). Refuses if
// a password is already set - see set_user_build_password()'s own WHERE
// clause, which is the actual "cannot change it after being set" gate, not
// just this route declining to offer the form twice.
userBuildsRouter.post('/api/user-builds/:id/set-password', updateLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'missing edit token' });
  }
  if (!isNonEmptyString(password, MAX_PASSWORD_LENGTH) || password.trim().length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters` });
  }
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const updatedId = await callScalarRpc('set_user_build_password', {
      p_id: id,
      p_token_hash: hashToken(token),
      p_password_hash: passwordHash,
    });
    if (updatedId === null) {
      return res.status(403).json({ error: 'invalid edit token, or a password is already set for this build' });
    }
    res.status(200).json({ id: updatedId });
  } catch (err) {
    console.error('set user build password failed:', err);
    res.status(502).json({ error: 'could not set a password right now, try again later' });
  }
});

// POST /api/user-builds/:id/login
// Body: { password }
// Verifies the password (via pgcrypto's crypt() inside login_user_build() -
// see that function's own comment for why the comparison happens in SQL
// rather than here) and, only on a match, rotates the build's edit token to
// a brand new one and returns it - the server never kept the original raw
// token, so this issues a fresh credential rather than trying to recover the
// old one. The caller stores it exactly like one obtained at creation.
userBuildsRouter.post('/api/user-builds/:id/login', loginLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'missing password' });
  }

  const newToken = crypto.randomBytes(24).toString('hex');
  try {
    const updatedId = await callScalarRpc('login_user_build', {
      p_id: id,
      p_password: password,
      p_new_token_hash: hashToken(newToken),
    });
    if (updatedId === null) {
      return res.status(403).json({ error: 'incorrect password, or no password is set for this build' });
    }
    res.status(200).json({ id: updatedId, token: newToken });
  } catch (err) {
    console.error('login user build failed:', err);
    res.status(502).json({ error: 'could not log in right now, try again later' });
  }
});

// GET /api/user-builds
// Listing view: everything the "User made builds" page's cards need before
// one is opened, newest first. Deliberately omits `payload` (the full
// build) - that's only fetched once a specific card is opened, via
// GET /api/user-builds/:id below, so browsing the list doesn't pull down
// every submitted build's entire loadout/prose up front. The handful of
// payload fields a collapsed card DOES need come through as jsonb paths -
// see LIST_SELECT.
userBuildsRouter.get('/api/user-builds', async (_req, res) => {
  try {
    const rows = await selectRows('user_builds', {
      select: LIST_SELECT,
      order: 'created_at.desc',
      limit: String(LIST_LIMIT),
    });
    res.json(rows.map(shapeListRow));
  } catch (err) {
    console.error('list user builds failed:', err);
    res.status(502).json({ error: 'could not load user builds right now' });
  }
});

// MUST be declared before the ':id' route below - Express matches in
// definition order, so '/featured' would otherwise be captured as an id.
// GET /api/user-builds/featured - the builds an admin has promoted onto the
// Build Guides page, most recently featured first. A hidden build never
// appears here even if it is still flagged featured: the `not hidden` RLS
// policy from 012 applies to this read like every other anon read, so hiding
// something is enough on its own to pull it off that page.
userBuildsRouter.get('/api/user-builds/featured', async (_req, res) => {
  try {
    const rows = await selectRows('user_builds', {
      select: LIST_SELECT,
      featured: 'is.true',
      order: 'featured_at.desc',
      limit: String(FEATURED_LIMIT),
    });
    res.json(rows.map(shapeListRow));
  } catch (err) {
    console.error('list featured builds failed:', err);
    res.status(502).json({ error: 'could not load featured builds right now' });
  }
});

// MUST be declared before the ':id' route below - Express matches in
// definition order, so '/votes' would otherwise be captured as an id.
// GET /api/user-builds/votes - every visible build's score plus what THIS
// session already voted, in one call, so the listing paints its buttons in
// the right state instead of flashing un-voted.
userBuildsRouter.get('/api/user-builds/votes', async (req, res) => {
  try {
    const sessionId = sessionIdFor(req.ip ?? 'unknown', req.get('user-agent') ?? 'unknown');
    const rows = await callTableRpc('get_user_build_votes', { p_session_id: sessionId });
    const byId = {};
    for (const row of rows ?? []) {
      byId[row.build_id] = { score: Number(row.score), myVote: Number(row.my_vote) };
    }
    res.json(byId);
  } catch (err) {
    console.error('vote lookup failed:', err);
    // Scores are decoration - a failure here must not stop the list rendering.
    res.json({});
  }
});

// MUST be declared before ':id' below, same reason as /featured and /votes.
// GET /api/user-builds/by-slug/:slug - the full build behind a shared
// /Leagues/build-guides/<slug> link. Separate from the :id route because the
// slug is what a link carries and the id is what the app works in; resolving
// one to the other server-side keeps the frontend from having to fetch the
// whole listing just to translate.
userBuildsRouter.get('/api/user-builds/by-slug/:slug', async (req, res) => {
  const { slug } = req.params;
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }
  try {
    const rows = await selectRows('user_builds', { select: PUBLIC_COLUMNS, slug: `eq.${slug}`, limit: '1' });
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('get user build by slug failed:', err);
    res.status(502).json({ error: 'could not load this build right now' });
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

// ─────────────────────────────────────────────────────────────────────────
// Voting
//
// Identity is the same pseudonymous session id analytics uses - derived
// server-side from IP + User-Agent + a daily-rotating salt (lib/session.js),
// never sent by the client, so a browser cannot claim to be someone else by
// editing a request. "One vote per session" therefore means one vote per
// browser per day: the salt rotates at UTC midnight by design. That is the
// honest ceiling for voting without accounts, and the same trade every other
// count on this site already makes.
//
// The uniqueness itself is a primary key on (build_id, session_id), not
// application logic - two simultaneous requests cannot both insert.
// ─────────────────────────────────────────────────────────────────────────
const voteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/user-builds/:id/vote  body: { vote: 1 | -1 | 0 }
// 0 retracts. Responds with the build's clamped score so the button can
// update from the server's number rather than guessing locally.
userBuildsRouter.post('/api/user-builds/:id/vote', voteLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

  const { vote } = req.body ?? {};
  if (![1, -1, 0].includes(vote)) return res.status(400).json({ error: 'vote must be 1, -1 or 0' });

  // An admin browsing their own site shouldn't be able to move scores, same
  // exclusion analytics already applies to their pageviews.
  if (isAdminSession(req.cookies?.[ADMIN_COOKIE_NAME])) {
    return res.status(200).json({ score: null, myVote: 0, ignored: 'admin' });
  }

  try {
    const sessionId = sessionIdFor(req.ip ?? 'unknown', req.get('user-agent') ?? 'unknown');
    const score = await callScalarRpc('cast_user_build_vote', {
      p_build_id: id,
      p_session_id: sessionId,
      p_vote: vote,
    });
    // null means the build is hidden or gone - the RPC refuses rather than
    // silently recording a vote against something nobody can see.
    if (score === null || score === undefined) return res.status(404).json({ error: 'not found' });
    res.json({ score: Number(score), myVote: vote });
  } catch (err) {
    console.error('vote failed:', err);
    res.status(502).json({ error: 'could not record that vote right now' });
  }
});


// ─────────────────────────────────────────────────────────────────────────
// Reporting a build
//
// Files straight into GitHub Issues with a server-held token, exactly like
// /api/report-issue, and logs the same local copy so both kinds of report sit
// together in triage. Kept as its own route rather than reusing that endpoint
// because it can attach the build id, name and a direct link - which is most
// of what makes a report actionable.
// ─────────────────────────────────────────────────────────────────────────
const REPORT_MIN = 10;
const REPORT_MAX = 1_000;

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

userBuildsRouter.post('/api/user-builds/:id/report', reportLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

  const { reason } = req.body ?? {};
  if (typeof reason !== 'string' || reason.trim().length < REPORT_MIN || reason.length > REPORT_MAX) {
    return res.status(400).json({ error: `reason must be between ${REPORT_MIN} and ${REPORT_MAX} characters` });
  }

  try {
    const rows = await selectRows('user_builds', { select: 'id,name,author_name', id: `eq.${id}`, limit: '1' });
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    const build = rows[0];

    const body = [
      `Reported build: **${build.name}** (id ${build.id})`,
      build.author_name ? `Author: ${build.author_name}` : null,
      `Link: ${SITE_ORIGIN}${APP_BASE_PATH}#user-builds/${build.id}`,
      '',
      '**Reason given:**',
      reason.trim(),
      '',
      `To hide it: the admin dashboard's user-builds panel, or \`select set_user_build_hidden(${build.id}, true);\``,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const issue = await fileIssue({ title: `Reported build: ${build.name}`.slice(0, 100), body });
    await insertRow('issue_reports', { body, github_issue_number: issue.number });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('report build failed:', err);
    res.status(502).json({ error: 'could not file that report right now, try again later' });
  }
});
