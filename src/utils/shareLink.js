import { createShortLink } from './api';
import { IS_PAGES_BUILD } from './deployTarget';
import { buildShareUrl, encodeShareBuild } from './shareBuild';

// One way to turn a build into a link, used by every share button on the site.
//
// On the live deploy that means a short link; on the GitHub Pages mirror there
// is no backend, so it falls back to the long client-side `?share=` URL.
//
// DEDUPLICATION. Re-sharing an unchanged build must return the link that
// already exists rather than minting another code. Three things enforce that,
// outermost first:
//
//   1. This module's in-memory cache, keyed by the exact payload - repeat
//      clicks in one session never reach the network at all.
//   2. encodeShareBuild canonicalises the payload (see shareBuild.js), so the
//      same build always compresses to the same string and therefore the same
//      sha256 - without that, two identical builds whose gear happened to be
//      equipped in a different order would hash differently and each get their
//      own row.
//   3. POST /api/shorten looks the hash up before inserting, and re-checks
//      after a code collision (see server/src/routes/shorten.js and
//      deploy/migrations/004_short_link_dedup.sql).
//
// The cache is deliberately not persisted to localStorage: a code that was
// deleted server-side would then be served from a stale cache forever, and the
// server-side check already makes repeat creation cheap and correct across
// sessions.
const shortLinkCache = new Map();

export async function shareLinkFor(fields) {
  if (IS_PAGES_BUILD) return buildShareUrl(fields);

  const payload = encodeShareBuild(fields);
  const cached = shortLinkCache.get(payload);
  if (cached) return cached;

  const url = await createShortLink(payload);
  shortLinkCache.set(payload, url);
  return url;
}

// Copies `url`, falling back to a prompt where the clipboard API is blocked
// (non-secure origin, or permission denied). Returns the status string the
// share buttons label themselves with.
export async function copyShareLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('Copy this link:', url);
    return 'manual';
  }
}

// Test seam: lets a check confirm the cache is actually being consulted rather
// than inferring it from call counts.
export function __shortLinkCacheSize() {
  return shortLinkCache.size;
}
