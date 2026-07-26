import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { insertRow } from '../lib/postgrest.js';
import { fileIssue } from '../lib/github.js';

const MAX_BODY_LENGTH = 5_000;
const MIN_BODY_LENGTH = 10;

export const reportIssueRouter = Router();

// Public anonymous write endpoint - rate-limited per IP on top of whatever
// edge-level protection (e.g. Cloudflare Turnstile) gets added later. This
// alone won't stop a determined attacker, but it's cheap insurance against
// casual spam filling up the issue tracker.
const reportIssueLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/report-issue
// Body: { body: string } - free-text report, no reporter account needed.
// Files it into GitHub Issues on this repo using a server-held token (never
// exposed to the browser), then logs a local copy alongside the GitHub
// issue number for a queryable record independent of GitHub.
reportIssueRouter.post('/api/report-issue', reportIssueLimiter, async (req, res) => {
  const { body } = req.body ?? {};
  if (typeof body !== 'string' || body.trim().length < MIN_BODY_LENGTH || body.length > MAX_BODY_LENGTH) {
    return res.status(400).json({ error: `report must be between ${MIN_BODY_LENGTH} and ${MAX_BODY_LENGTH} characters` });
  }

  try {
    const issue = await fileIssue({
      title: `User report: ${body.slice(0, 80).replace(/\s+/g, ' ').trim()}${body.length > 80 ? '…' : ''}`,
      body,
    });

    await insertRow('issue_reports', { body, github_issue_number: issue.number });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('report-issue failed:', err);
    res.status(502).json({ error: 'could not file the report right now, try again later' });
  }
});
