import { IS_PAGES_BUILD } from './deployTarget';

// A shared tier list has a PATH url - /Leagues/tier-list/blessings/four-word-code -
// for the same reason Build Guides does: everything after "#" is a fragment
// browsers never send, so a hash form is invisible to the server and could
// never get a per-list preview image. See utils/buildGuideRoute.js.
//
// The hash form is accepted too and is what the GitHub Pages mirror uses, since
// its host has no server to route a nested path (and no image renderer either,
// so a path would buy it nothing).
export const USE_PATH_ROUTING = !IS_PAGES_BUILD;

const BASE = import.meta.env.BASE_URL;
const PATH_RE = /\/tier-list\/(blessings|relics)\/([a-z]+(?:-[a-z]+){3})\/?$/i;
const HASH_RE = /^#tier-list\/(blessings|relics)\/([a-z]+(?:-[a-z]+){3})$/i;

// { type, code } for whichever form the current URL uses, or null.
export function tierListFromLocation() {
  const fromPath = PATH_RE.exec(window.location.pathname);
  if (fromPath) return { type: fromPath[1].toLowerCase(), code: fromPath[2].toLowerCase() };
  const fromHash = HASH_RE.exec(window.location.hash);
  if (fromHash) return { type: fromHash[1].toLowerCase(), code: fromHash[2].toLowerCase() };
  return null;
}

export function isTierListPath() {
  return PATH_RE.test(window.location.pathname);
}

// Absolute, because this only ever exists to be copied somewhere else.
export function tierListShareUrl(type, code) {
  const relative = USE_PATH_ROUTING
    ? `${BASE}tier-list/${type}/${code}`
    : `${window.location.pathname}${window.location.search}#tier-list/${type}/${code}`;
  return new URL(relative, window.location.origin).href;
}

// Restores the pathname when leaving a shared list for another tab. Without
// this, a "#home" link would leave the tier-list path in place underneath the
// new hash, and currentRoute() reads the path first - so the app would stay
// stuck on the shared list. Same fix leaveBuildGuidePath makes.
export function leaveTierListPath(hash) {
  if (!USE_PATH_ROUTING || !isTierListPath()) return;
  window.history.replaceState(null, '', `${BASE}${hash}`);
}
