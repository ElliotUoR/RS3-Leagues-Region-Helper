import { Router } from 'express';
import { callScalarRpc } from '../lib/postgrest.js';
import { renderShareLinkPage } from '../lib/shareLinkTemplate.js';

export const shareLinkPageRouter = Router();

// GET /s/:code - previously served as a static file straight off the
// frontend container's SPA fallback (see deploy/nginx.conf), with the app
// resolving the code entirely client-side. That meant a per-build og:image
// was impossible: Discord/Twitter/etc. read <meta> tags from the raw HTML
// response and never run JS, so every unfurl fell back to the site's one
// generic default image regardless of what was actually shared.
//
// Now routed here instead (see deploy/Caddyfile.snippet) so the response
// can carry a per-code og:image before any JS runs. The client-side
// resolution in App.jsx is untouched and still runs exactly as before once
// the page loads - this only changes what's in <head> on the way in.
//
// Fails open: any lookup error, or a code that doesn't resolve to anything,
// just serves the ordinary default-tagged page (identical to the old static
// behaviour) rather than a broken response - a visitor should never see a
// worse experience than before this route existed.
shareLinkPageRouter.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  let hasImage = false;

  try {
    const payload = await callScalarRpc('get_short_link_payload', { p_code: code });
    hasImage = Boolean(payload);
  } catch (err) {
    console.error('share-link page lookup failed:', err);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderShareLinkPage(code, { hasImage }));
});
