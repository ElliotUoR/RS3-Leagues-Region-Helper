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
  return withShareTags(shareUrl, imageUrl);
}

// Same swap for a Build Guide's own path URL (see routes/buildGuidePage.js).
// `buildId` is null for an unknown id or the bare /build-guides tab, which just
// gets the ordinary page.
export function renderBuildGuidePage(buildId, { name }) {
  if (!buildId) return template;

  const shareUrl = `${SITE_ORIGIN}${APP_BASE_PATH}build-guides/${buildId}`;
  const imageUrl = `${SITE_ORIGIN}${APP_BASE_PATH}api/og-image/build/${buildId}.png`;
  let html = withShareTags(shareUrl, imageUrl);
  // Unlike a short link, a build guide has a name worth putting in the unfurl -
  // "The Ironclad" beats the generic site title in a Discord embed.
  if (name) {
    html = html.replace(
      /(<meta property="og:title" content=")([^"]*)(")/,
      (_match, open, current, close) => `${open}${escapeAttribute(name)} - ${current}${close}`,
    );
  }
  return html;
}

// Same swap for a shared tier list (see routes/tierLists.js). `title` is
// "<author>'s blessing tier list" and the description line is their angle -
// between them an unfurl says whose ranking it is and what it is for, which is
// most of what makes one worth clicking.
export function renderTierListPage(type, code, { title, angle }) {
  if (!type || !code) return template;

  const shareUrl = `${SITE_ORIGIN}${APP_BASE_PATH}tier-list/${type}/${code}`;
  const imageUrl = `${SITE_ORIGIN}${APP_BASE_PATH}api/og-image/tier-list/${type}/${code}.png`;
  let html = withShareTags(shareUrl, imageUrl);
  if (title) html = setMetaContent(html, 'og:title', (current) => `${escapeAttribute(title)} - ${current}`);
  if (angle) html = setMetaContent(html, 'og:description', () => escapeAttribute(angle));
  return html;
}

// Rewrites one <meta property="..."> tag's content.
//
// `[^>]*` between the attributes on purpose: og:description is written across
// THREE lines in index.html while og:title is on one, and a pattern that
// assumed `property` and `content` were adjacent silently matched neither -
// which is exactly how an unfurl ends up quietly showing the generic site
// blurb instead of this list's angle.
//
// Throws rather than returning the html unchanged, for the same reason
// replaceMetaContent above does: a template edit that breaks this should fail
// the request loudly, not degrade to a wrong-looking preview nobody notices.
function setMetaContent(html, property, nextValue) {
  const pattern = new RegExp(`(<meta[^>]*property="${property}"[^>]*content=")([^"]*)(")`);
  const match = pattern.exec(html);
  if (!match) throw new Error(`shareLinkTemplate: no ${property} meta tag in dist/index.html`);
  return html.slice(0, match.index) + match[1] + nextValue(match[2]) + match[3] + html.slice(match.index + match[0].length);
}

// HTML-escapes a value being interpolated into a double-quoted attribute.
// Build names are authored in-repo rather than user input, but a stray quote
// would silently break the tag, and this is the kind of thing that should never
// depend on the data staying well-behaved.
function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function withShareTags(shareUrl, imageUrl) {
  let html = template;
  html = replaceMetaContent(html, 'property="og:image" content', DEFAULT_IMAGE, imageUrl);
  html = replaceMetaContent(html, 'name="twitter:image" content', DEFAULT_IMAGE, imageUrl);
  html = replaceMetaContent(html, 'property="og:url" content', DEFAULT_URL, shareUrl);
  return html;
}
