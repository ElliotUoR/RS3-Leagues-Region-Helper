// Loads the frontend's built index.html once at startup and produces a
// per-share-link variant with the og:image/twitter:image/og:url tags
// swapped to point at that specific build - everything else (script tags,
// title, description) stays byte-identical to what a normal visitor gets,
// so the SPA boots exactly as it always has once a real browser loads this.
//
// Read from a static copy baked into this image at build time (see
// Dockerfile) rather than proxied from the frontend container at request
// time - this route now handles every single /s/:code hit (both real
// visitors and crawlers, see deploy/Caddyfile.snippet), so it can't afford
// a runtime dependency on another container being up and fast. Rebuilt
// fresh on every deploy since the frontend build always runs first (see
// docs/deployment.md steps 7/10), and this container is always rebuilt
// right after.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../../../dist/index.html');
const SITE_ORIGIN = 'https://jellyflow.xyz';
const APP_BASE_PATH = '/Leagues/';

const template = readFileSync(TEMPLATE_PATH, 'utf8');

const DEFAULT_IMAGE = `${SITE_ORIGIN}${APP_BASE_PATH}LeaguesSiteImage.png`;
const DEFAULT_URL = `${SITE_ORIGIN}${APP_BASE_PATH}`;

function replaceMetaContent(html, matchAttr, oldValue, newValue) {
  const needle = `${matchAttr}="${oldValue}"`;
  if (!html.includes(needle)) {
    throw new Error(`shareLinkTemplate: expected to find ${needle} in dist/index.html`);
  }
  return html.split(needle).join(`${matchAttr}="${newValue}"`);
}

// Returns the HTML to serve for GET /s/:code. `hasImage` is whether the
// code resolved to a real build (callers already had to look that up to
// know what to render) - an unknown/expired code just gets the ordinary
// default-tagged page, identical to what static hosting served before.
export function renderShareLinkPage(code, { hasImage }) {
  if (!hasImage) return template;

  const shareUrl = `${SITE_ORIGIN}${APP_BASE_PATH}s/${code}`;
  const imageUrl = `${SITE_ORIGIN}${APP_BASE_PATH}api/og-image/${code}.png`;

  let html = template;
  html = replaceMetaContent(html, 'property="og:image" content', DEFAULT_IMAGE, imageUrl);
  html = replaceMetaContent(html, 'name="twitter:image" content', DEFAULT_IMAGE, imageUrl);
  html = replaceMetaContent(html, 'property="og:url" content', DEFAULT_URL, shareUrl);
  return html;
}
