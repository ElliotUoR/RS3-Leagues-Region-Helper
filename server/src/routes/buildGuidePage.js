import { Router } from 'express';
import { buildGuideImageInput, findBuildGuide } from '../lib/buildGuideShare.js';
import { renderShareImage } from '../lib/ogImageRender.js';
import { renderBuildGuidePage } from '../lib/shareLinkTemplate.js';

export const buildGuidePageRouter = Router();

// Per-build link previews for the Build Guides page.
//
// WHY A PATH AND NOT THE HASH. The app is hash-routed, so a build guide's
// natural URL is /Leagues/#build-guides/<id>. Everything after "#" is a
// fragment: browsers and crawlers never put it in the HTTP request, so a
// server sees only a request for /Leagues/ and cannot possibly know which
// build was meant - every unfurl gets the site default. Moving the id into the
// path is the only way to make it visible server-side, exactly as /s/:code
// already does for short links (see routes/shareLinkPage.js).
//
// The hash form still works and is never broken: the frontend accepts both and
// only writes this path form into the address bar so that copying it is enough
// to get a real preview.
//
// Fails open throughout - an unknown id serves the ordinary default-tagged page
// rather than a 404, because this same URL is what a real visitor loads.
buildGuidePageRouter.get('/build-guides/:id', (req, res) => {
  const build = findBuildGuide(req.params.id);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBuildGuidePage(build?.id ?? null, { name: build?.name }));
});

// Bare /build-guides with no id - the tab itself. Served so a reload of that
// URL is not a 404; it just gets the default tags.
buildGuidePageRouter.get('/build-guides', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBuildGuidePage(null, {}));
});

// GET /api/og-image/build/:id.png - the image the tags above point at.
// Rendered from static data with no database lookup (see lib/buildGuideShare.js),
// so unlike the short-link image this cannot 404 for a valid id. Cacheable
// indefinitely-ish: a build's content only changes on deploy, so a day is long
// enough to serve every unfurl of a given link while still letting an edited
// guide's preview refresh without a cache-busting rename.
buildGuidePageRouter.get('/api/og-image/build/:id.png', async (req, res) => {
  const build = findBuildGuide(req.params.id);
  if (!build) return res.status(404).send('not found');

  try {
    const png = await renderShareImage(buildGuideImageInput(build));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (err) {
    console.error('build guide og-image render failed:', err);
    res.status(500).send('render failed');
  }
});
