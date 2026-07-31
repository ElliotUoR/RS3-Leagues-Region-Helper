import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { sanitizeGatewaySelection, sanitizeRegionSelection } from '../hooks/useRegionSelection';
import { sanitizeRelicSelection } from '../hooks/useRelicSelection';
import { sanitizeLeagueRelicSelection } from '../hooks/useLeagueRelicSelection';
import { sanitizeBlessingSelection } from '../hooks/useBlessingSelection';
import { sanitizeEofWeaponNames, sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';

// Bumped from 7 to 8 to add blessing picks (see hooks/useBlessingSelection.js)
// and the landing hash - v2-v7 links still decode fine, missing blessings
// simply sanitizes to "none picked" and a missing hash falls back to #gear,
// which is where every pre-v8 link was always meant to land.
const SHARE_VERSION = 8;
const SHARE_PARAM = 'share';

// Routes a share link is allowed to open on. An allow-list rather than a free
// string: the value ends up in history.replaceState (see App.jsx's short-link
// resolution), so a crafted payload must not be able to steer that anywhere
// this app didn't choose.
const LANDING_HASHES = new Set(['#gear', '#blessings', '#league-relics', '#home', '#character']);
const DEFAULT_LANDING_HASH = '#gear';

function sanitizeLandingHash(raw) {
  return LANDING_HASHES.has(raw) ? raw : DEFAULT_LANDING_HASH;
}

// Encodes the current build (all 4 styles' loadouts + EOF weapon picks +
// default style + region picks + gateway region picks + Arch relic picks +
// league relic picks) into a URL-safe, LZ-compressed string suitable for
// the `share` query param. lz-string's dictionary-based compression does
// well on this JSON shape (lots of repeated keys - style names, region ids,
// slot names) - typically 40-60% smaller than plain base64 for a realistic
// loadout.
// Sorts object keys and string-array members so the same build always produces
// the same bytes. Short links are deduplicated by sha256(payload) server-side
// (see deploy/migrations/004_short_link_dedup.sql), and without this the hash
// depended on incidental ordering: `equippedNamesByStyle`'s keys follow the
// order slots were equipped in, and `regions`/`relics`/`blessings` follow click
// order. Two identical builds could differ byte-for-byte and each mint their
// own code.
//
// Every array here is a set (regions, gateway picks, relic and blessing names),
// so ordering carries no meaning and sorting cannot change how the payload
// decodes. Objects are maps for the same reason.
//
// Both sorts are deliberately the DEFAULT comparator, not localeCompare. The
// point of this function is that two browsers encoding the same build produce
// identical bytes; localeCompare orders by the visitor's locale, so a French
// and an English visitor could sort the same names differently and defeat the
// deduplication. Default sort is UTF-16 code-unit order - ugly for display,
// but identical everywhere, which is the only property that matters here.
function canonicalise(value) {
  if (Array.isArray(value)) {
    const items = value.map(canonicalise);
    return items.every((item) => typeof item === 'string') ? items.sort() : items;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalise(value[key])]),
    );
  }
  return value;
}

export function encodeShareBuild({
  regions,
  gatewaySelected,
  equippedNamesByStyle,
  eofWeaponNamesByStyle,
  relics,
  leagueRelics,
  blessings,
  defaultStyle,
  landingHash,
}) {
  // The outer keys are written in a fixed literal order already; canonicalise
  // is what normalises everything nested inside them.
  const payload = {
    v: SHARE_VERSION,
    r: canonicalise(regions),
    t: canonicalise(gatewaySelected),
    g: canonicalise(equippedNamesByStyle),
    f: canonicalise(eofWeaponNamesByStyle),
    k: canonicalise(relics),
    l: canonicalise(leagueRelics),
    b: canonicalise(blessings),
    d: defaultStyle,
    h: landingHash,
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
    if (![2, 3, 4, 5, 6, 7, SHARE_VERSION].includes(parsed?.v)) return null;
    return {
      regions: sanitizeRegionSelection(parsed.r),
      gatewaySelected: sanitizeGatewaySelection(parsed.t),
      equippedNamesByStyle: sanitizeEquippedNames(parsed.g),
      eofWeaponNamesByStyle: sanitizeEofWeaponNames(parsed.f),
      relics: sanitizeRelicSelection(parsed.k),
      leagueRelics: sanitizeLeagueRelicSelection(parsed.l),
      blessings: sanitizeBlessingSelection(parsed.b),
      defaultStyle: sanitizeStyle(parsed.d),
      landingHash: sanitizeLandingHash(parsed.h),
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

// Builds the full shareable URL for the current build. `landingHash` picks the
// tab the recipient opens on - a link shared from the Blessings page should
// land there, not dump them in the Gear Planner - and is baked into the payload
// as well as the URL so short links (which resolve to a payload with no URL
// hash of their own) can honour it too. See App.jsx's short-link effect.
export function buildShareUrl({
  regions,
  gatewaySelected,
  equippedNamesByStyle,
  eofWeaponNamesByStyle,
  relics,
  leagueRelics,
  blessings,
  defaultStyle,
  landingHash = DEFAULT_LANDING_HASH,
}) {
  const hash = sanitizeLandingHash(landingHash);
  const encoded = encodeShareBuild({
    regions,
    gatewaySelected,
    equippedNamesByStyle,
    eofWeaponNamesByStyle,
    relics,
    leagueRelics,
    blessings,
    defaultStyle,
    landingHash: hash,
  });
  return `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encoded}${hash}`;
}
