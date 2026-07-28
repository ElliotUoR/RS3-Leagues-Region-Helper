import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { sanitizeGatewaySelection, sanitizeRegionSelection } from '../hooks/useRegionSelection';
import { sanitizeRelicSelection } from '../hooks/useRelicSelection';
import { sanitizeLeagueRelicSelection } from '../hooks/useLeagueRelicSelection';
import { sanitizeEofWeaponNames, sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';

// Bumped from 6 to 7 to add league relic picks (see
// hooks/useLeagueRelicSelection.js) - v2-v6 links still decode fine,
// missing league relics simply sanitizes to "none picked".
const SHARE_VERSION = 7;
const SHARE_PARAM = 'share';

// Encodes the current build (all 4 styles' loadouts + EOF weapon picks +
// default style + region picks + gateway region picks + Arch relic picks +
// league relic picks) into a URL-safe, LZ-compressed string suitable for
// the `share` query param. lz-string's dictionary-based compression does
// well on this JSON shape (lots of repeated keys - style names, region ids,
// slot names) - typically 40-60% smaller than plain base64 for a realistic
// loadout.
export function encodeShareBuild({
  regions,
  gatewaySelected,
  equippedNamesByStyle,
  eofWeaponNamesByStyle,
  relics,
  leagueRelics,
  defaultStyle,
}) {
  const payload = {
    v: SHARE_VERSION,
    r: regions,
    t: gatewaySelected,
    g: equippedNamesByStyle,
    f: eofWeaponNamesByStyle,
    k: relics,
    l: leagueRelics,
    d: defaultStyle,
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

// Decodes a `share` param value back into
// `{ regions, gatewaySelected, equippedNamesByStyle, eofWeaponNamesByStyle, relics, leagueRelics, defaultStyle }`.
// Returns null on any failure (corrupt/truncated/unrecognised-version
// payload) - callers should treat that identically to "no share param at
// all". Accepts v2-v6 payloads (missing relics/leagueRelics/defaultStyle/
// eof/gateway fields) for backward compatibility - missing fields simply
// sanitize down to their empty/default value.
export function decodeShareBuild(param) {
  if (!param) return null;
  try {
    const json = decompressFromEncodedURIComponent(param);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (![2, 3, 4, 5, 6, SHARE_VERSION].includes(parsed?.v)) return null;
    return {
      regions: sanitizeRegionSelection(parsed.r),
      gatewaySelected: sanitizeGatewaySelection(parsed.t),
      equippedNamesByStyle: sanitizeEquippedNames(parsed.g),
      eofWeaponNamesByStyle: sanitizeEofWeaponNames(parsed.f),
      relics: sanitizeRelicSelection(parsed.k),
      leagueRelics: sanitizeLeagueRelicSelection(parsed.l),
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
export function buildShareUrl({
  regions,
  gatewaySelected,
  equippedNamesByStyle,
  eofWeaponNamesByStyle,
  relics,
  leagueRelics,
  defaultStyle,
}) {
  const encoded = encodeShareBuild({
    regions,
    gatewaySelected,
    equippedNamesByStyle,
    eofWeaponNamesByStyle,
    relics,
    leagueRelics,
    defaultStyle,
  });
  return `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encoded}#gear`;
}
