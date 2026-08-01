import { Router } from 'express';
import { buildGuideImageInput, findBuildGuide, userBuildImageInput } from '../lib/buildGuideShare.js';
import { renderShareImage } from '../lib/ogImageRender.js';
import { renderBuildGuidePage } from '../lib/shareLinkTemplate.js';
import { selectRows } from '../lib/postgrest.js';

export const buildGuidePageRouter = Router();

// Slugs come straight off the URL. Anything that cannot be one is rejected
// before it reaches the database rather than sent as a filter that matches
// nothing - PostgREST would happily accept it, but there is no reason to ask.
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

// /build-guides/<x> is ONE namespace covering this site's curated guides and
// user-submitted builds. Curated wins, which is why the slug generator treats
// their ids as reserved (see lib/userBuildSlug.js).
//
// The user-build lookup reads as `anon`, so 012's RLS policy applies: a hidden
// build resolves to nothing here and its link falls back to the default-tagged
// page, which is exactly right - hiding a build should take its preview with it.
async function findByPathSegment(segment) {
  const guide = findBuildGuide(segment);
  if (guide) return { kind: 'guide', name: guide.name, build: guide };
  if (!SLUG_RE.test(segment)) return null;

  const rows = await selectRows('user_builds', {
    select: 'slug,name,author_name,payload',
    slug: `eq.${segment}`,
    limit: '1',
  });
  if (rows.length === 0) return null;
  return { kind: 'user', name: rows[0].name, build: rows[0] };
}

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
buildGuidePageRouter.get('/build-guides/:id', async (req, res) => {
  let found = null;
  try {
    found = await findByPathSegment(req.params.id);
  } catch (err) {
    // Fails open, like everything else here: a database blip must serve the
    // ordinary page to the real visitor behind this request, not an error.
    console.error('build guide page lookup failed:', err);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBuildGuidePage(found ? req.params.id : null, { name: found?.name }));
});

// Bare /build-guides with no id - the tab itself. Served so a reload of that
// URL is not a 404; it just gets the default tags.
buildGuidePageRouter.get('/build-guides', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBuildGuidePage(null, {}));
});

// GET /api/og-image/build/:id.png - the image the tags above point at.
//
// A curated guide renders from static data with no database lookup, so it
// cannot 404 for a valid id. A user build needs its stored payload, so it can -
// and should, since the alternative is an unfurl showing someone else's gear.
//
// Cache lifetimes differ for the same reason. A guide only changes on deploy,
// so a day is long enough to serve every unfurl of a link while still letting
// an edited guide's preview refresh. A user build can be edited at any moment
// (by its author or by an admin), so an hour - long enough to absorb the burst
// of crawler requests one shared link causes, short enough that a fixed build
// does not keep showing its old loadout for a day.
const GUIDE_IMAGE_MAX_AGE = 86_400;
const USER_BUILD_IMAGE_MAX_AGE = 3_600;

buildGuidePageRouter.get('/api/og-image/build/:id.png', async (req, res) => {
  let found;
  try {
    found = await findByPathSegment(req.params.id);
  } catch (err) {
    console.error('build guide og-image lookup failed:', err);
    return res.status(502).send('lookup failed');
  }
  if (!found) return res.status(404).send('not found');

  try {
    const input =
      found.kind === 'guide' ? buildGuideImageInput(found.build) : userBuildImageInput(found.build.payload);
    const png = await renderShareImage(input);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Cache-Control',
      `public, max-age=${found.kind === 'guide' ? GUIDE_IMAGE_MAX_AGE : USER_BUILD_IMAGE_MAX_AGE}`,
    );
    res.send(png);
  } catch (err) {
    console.error('build guide og-image render failed:', err);
    res.status(500).send('render failed');
  }
});
