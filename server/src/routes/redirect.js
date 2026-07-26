import { Router } from 'express';
import { callScalarRpc } from '../lib/postgrest.js';

const CODE_RE = /^[a-z0-9-]{1,200}$/;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL;

export const redirectRouter = Router();

// GET /s/:code
// Resolves a short code back to the original compressed build payload and
// 302s to the existing `?share=` URL shape - the rest of the app (App.jsx /
// shareBuild.js) doesn't need to know short links exist at all.
redirectRouter.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) {
    return res.status(404).send('Not found');
  }

  const payload = await callScalarRpc('get_short_link_payload', { p_code: code });
  if (!payload) {
    return res.status(404).send('This short link doesn\'t exist (or was mistyped).');
  }

  res.redirect(302, `${PUBLIC_SITE_URL}/?share=${payload}#gear`);
});
