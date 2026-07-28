// Server-side twin of src/utils/shareBuild.js's decodeShareBuild - same
// payload shape/version handling, reimplemented here (rather than imported
// directly) because the frontend file pulls in its sanitize helpers from
// hooks that import 'react', which this service has no reason to depend on
// for a few lines of array/object filtering.
// lz-string's CJS build doesn't expose named exports under Node's own
// (non-bundler) ESM interop - `import { decompressFromEncodedURIComponent }`
// resolves to undefined here even though it works fine on the frontend
// (Vite/Rollup does its own, more lenient CJS interop). This service runs
// as plain `node src/index.js`, so it needs the default-import + destructure
// form instead.
import LZString from 'lz-string';
import { COMBAT_STYLES, ESSENCE_OF_FINALITY_NAMES, GEAR_SLOTS } from '../../../src/data/gear.js';
import { GATEWAY_REGIONS, OPTIONAL_REGIONS, REGIONS } from '../../../src/data/regions.js';

const SUPPORTED_VERSIONS = new Set([2, 3, 4, 5, 6]);

function sanitizeRegionSelection(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => OPTIONAL_REGIONS.includes(id));
}

function sanitizeGatewaySelection(raw) {
  if (!Array.isArray(raw)) return [...GATEWAY_REGIONS];
  return GATEWAY_REGIONS.filter((id) => raw.includes(id));
}

function sanitizeEquippedNames(raw) {
  const equippedNames = Object.fromEntries(COMBAT_STYLES.map((style) => [style, {}]));
  if (!raw || typeof raw !== 'object') return equippedNames;
  for (const style of COMBAT_STYLES) {
    const bySlot = raw[style];
    if (!bySlot) continue;
    for (const slot of GEAR_SLOTS) {
      if (typeof bySlot[slot] === 'string') equippedNames[style][slot] = bySlot[slot];
    }
  }
  return equippedNames;
}

function sanitizeStyle(style) {
  return COMBAT_STYLES.includes(style) ? style : 'melee';
}

function sanitizeEofWeaponNames(raw) {
  const names = Object.fromEntries(COMBAT_STYLES.map((style) => [style, null]));
  if (!raw || typeof raw !== 'object') return names;
  for (const style of COMBAT_STYLES) {
    if (typeof raw[style] === 'string') names[style] = raw[style];
  }
  return names;
}

// Decodes a `share`/short-link payload string down to just what the og-image
// renderer needs (regions + gateway picks + the default style's equipped
// items, including its EOF-slotted weapon if any) - relics aren't part of
// the thumbnail, so they're not carried through here.
export function decodeShareBuildForImage(payload) {
  if (!payload) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!SUPPORTED_VERSIONS.has(parsed?.v)) return null;

    const defaultStyle = sanitizeStyle(parsed.d);
    const regions = sanitizeRegionSelection(parsed.r);
    const gatewaySelected = sanitizeGatewaySelection(parsed.t);
    const equippedNamesByStyle = sanitizeEquippedNames(parsed.g);
    const eofWeaponNamesByStyle = sanitizeEofWeaponNames(parsed.f);

    const unlockedRegionIds = [
      ...Object.keys(REGIONS).filter((id) => REGIONS[id].fixed),
      ...GATEWAY_REGIONS.filter((id) => gatewaySelected.includes(id)),
      ...OPTIONAL_REGIONS.filter((id) => regions.includes(id)),
    ];

    const equippedNames = equippedNamesByStyle[defaultStyle];
    // Mirrors useGearLoadout.js's eofVisible/eofWeapon: the EOF slot only
    // exists (and only ever renders) while an Essence of Finality necklace
    // is actually worn in 'neck' - a remembered eof weapon name from before
    // the necklace was unequipped shouldn't render as if it were still on.
    const eofWeaponName = ESSENCE_OF_FINALITY_NAMES.includes(equippedNames.neck)
      ? eofWeaponNamesByStyle[defaultStyle]
      : null;

    return {
      unlockedRegionIds,
      equippedNames,
      eofWeaponName,
      defaultStyle,
    };
  } catch {
    return null;
  }
}
