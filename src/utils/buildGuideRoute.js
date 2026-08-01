import { IS_PAGES_BUILD } from './deployTarget';

// Build Guides is the one route with a path form as well as a hash form.
//
// WHY. Link previews are generated server-side, and everything after "#" is a
// fragment that browsers never send in the HTTP request - so
// /Leagues/#build-guides/<id> is indistinguishable from /Leagues/ to any
// crawler, and always unfurls with the site's default image. Moving the id into
// the path is the only way a per-build preview can exist. See
// server/src/routes/buildGuidePage.js and deploy/Caddyfile.snippet.
//
// Both forms always WORK - the hash form is what every link shared before this
// existed uses, and those must never break. Only which one gets written into
// the address bar differs, and only so that copying the address bar is enough
// to get a real preview.
//
// The GitHub Pages mirror has no server to serve the path form (its host would
// 404), so it keeps the hash form. That costs nothing there: with no backend it
// has no image renderer either, so its previews are the default image
// regardless.
export const USE_PATH_ROUTING = !IS_PAGES_BUILD;

// Ids are the kebab-case keys in data/blessingBuilds.js.
const BUILD_GUIDE_PATH_RE = /\/build-guides(?:\/([a-z0-9-]+))?\/?$/i;

const BASE = import.meta.env.BASE_URL;

// Whether the current pathname is the Build Guides route at all - used by
// App.jsx's currentRoute(), which otherwise only looks at the hash.
export function isBuildGuidePath() {
  return BUILD_GUIDE_PATH_RE.test(window.location.pathname);
}

// The open build's id from either form, path first. Returns null when the
// route is Build Guides but no specific build is addressed.
export function buildIdFromLocation() {
  const fromPath = BUILD_GUIDE_PATH_RE.exec(window.location.pathname);
  if (fromPath) return fromPath[1] ?? null;
  const fromHash = window.location.hash.split('/')[1];
  return fromHash || null;
}

// The URL to put in the address bar for a given open build (null = none open).
// Always absolute-from-origin so it can go straight into history.replaceState.
export function buildGuideUrl(buildId) {
  if (!USE_PATH_ROUTING) {
    return `${window.location.pathname}${window.location.search}${
      buildId ? `#build-guides/${buildId}` : '#build-guides'
    }`;
  }
  // No hash at all on the path form: two sources of truth for the same thing
  // would let them disagree (e.g. #build-guides/a alongside /build-guides/b).
  return buildId ? `${BASE}build-guides/${buildId}` : `${BASE}build-guides`;
}

// The same URL, absolute, for a Share button to put on the clipboard - a
// relative one is useless the moment it leaves the page. Works for both forms
// because buildGuideUrl always returns something resolvable against the origin.
export function absoluteBuildGuideUrl(buildId) {
  return new URL(buildGuideUrl(buildId), window.location.origin).href;
}

// Restores the pathname when leaving Build Guides for another tab. Without
// this, navigating away via a "#home" link would leave the build-guides path in
// place underneath the new hash, and currentRoute() reads the path first - so
// the app would stay stuck on Build Guides.
export function leaveBuildGuidePath(hash) {
  // An EMPTY hash is not a navigation. Removing the hash is exactly what
  // entering the path form does, and Chrome fires `hashchange` for that - so
  // without this guard the rewrite immediately looks like "the visitor left"
  // and bounces them to the site root. Verified: replaceState('/build-guides')
  // was followed straight away by replaceState('/').
  if (!hash) return;
  if (!USE_PATH_ROUTING || !isBuildGuidePath()) return;
  window.history.replaceState(null, '', `${BASE}${hash}`);
}
