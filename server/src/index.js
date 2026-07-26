import express from 'express';
import { shortenRouter } from './routes/shorten.js';
import { redirectRouter } from './routes/redirect.js';
import { reportIssueRouter } from './routes/reportIssue.js';
import { trackRouter } from './routes/track.js';

const PORT = process.env.PORT ?? 3000;

const app = express();
app.disable('x-powered-by');
// Caddy is the only reverse proxy in front of this service - trust exactly
// one hop of X-Forwarded-For so req.ip reflects the real visitor IP (used
// only transiently to derive the analytics session hash, see lib/session.js).
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.use(redirectRouter);
app.use(shortenRouter);
app.use(reportIssueRouter);
app.use(trackRouter);

app.listen(PORT, () => {
  console.log(`rs3-leagues-server listening on :${PORT}`);
});
