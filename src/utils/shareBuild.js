import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { sanitizeRegionSelection } from '../hooks/useRegionSelection';
import { sanitizeRelicSelection } from '../hooks/useRelicSelection';
import { sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';

// Bumped from 3 to 4 to add the gear planner's default style — v2/v3 links
// still decode fine (defaultStyle just comes back as 'melee'), so no need to
// bump further or invalidate old links.
const SHARE_VERSION = 4;
const SHARE_PARAM = 'share';

// Encodes the current build (all 4 styles' loadouts + default style + region
// picks + relic picks) into a URL-safe, LZ-compressed string suitable for
// the `share` query param. lz-string's dictionary-based compression does
// well on this JSON shape (lots of repeated keys — style names, region ids,
// slot names) — typically 40-60% smaller than plain base64 for a realistic
// loadout.
export function encodeShareBuild({ regions, equippedNamesByStyle, relics, defaultStyle }) {
  const payload = { v: SHARE_VERSION, r: regions, g: equippedNamesByStyle, k: relics, d: defaultStyle };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

// Decodes a `share` param value back into
// `{ regions, equippedNamesByStyle, relics, defaultStyle }`. Returns null on
// any failure (corrupt/truncated/unrecognised-version payload) — callers
// should treat that identically to "no share param at all". Accepts v2/v3
// payloads (missing relics/defaultStyle fields) for backward compatibility —
// missing fields simply sanitize down to their empty/default value.
export function decodeShareBuild(param) {
  if (!param) return null;
  try {
    const json = decompressFromEncodedURIComponent(param);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (![2, 3, SHARE_VERSION].includes(parsed?.v)) return null;
    return {
      regions: sanitizeRegionSelection(parsed.r),
      equippedNamesByStyle: sanitizeEquippedNames(parsed.g),
      relics: sanitizeRelicSelection(parsed.k),
      defaultStyle: sanitizeStyle(parsed.d),
    };
  } catch {
    return null;
  }
}

// Reads the `share` param from the current URL and decodes it, if present.
export function parseShareParam() {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  return decodeShareBuild(param);
}

// Removes the `share` param from the address bar without touching the hash
// route or triggering a navigation/reload.
export function stripShareParam() {
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
}

// Builds the full shareable URL for the current build.
export function buildShareUrl({ regions, equippedNamesByStyle, relics, defaultStyle }) {
  const encoded = encodeShareBuild({ regions, equippedNamesByStyle, relics, defaultStyle });
  return `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encoded}#gear`;
}
