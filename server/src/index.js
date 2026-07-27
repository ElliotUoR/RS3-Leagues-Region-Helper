import express from 'express';
import cookieParser from 'cookie-parser';
import { shortenRouter } from './routes/shorten.js';
import { reportIssueRouter } from './routes/reportIssue.js';
import { trackRouter } from './routes/track.js';
import { adminRouter } from './routes/admin.js';
import { scheduleAnalyticsRollup } from './lib/analyticsRollup.js';

const PORT = process.env.PORT ?? 3000;

const app = express();
app.disable('x-powered-by');
// Caddy is the only reverse proxy in front of this service - trust exactly
// one hop of X-Forwarded-For so req.ip reflects the real visitor IP (used
// only transiently to derive the analytics session hash, see lib/session.js).
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.use(shortenRouter);
app.use(reportIssueRouter);
app.use(trackRouter);
app.use(adminRouter);

app.listen(PORT, () => {
  console.log(`rs3-leagues-server listening on :${PORT}`);
});

// Daily rollup + retention for page_events - see lib/analyticsRollup.js.
// Runs inside this same long-running process rather than a separate cron
// container.
scheduleAnalyticsRollup();
