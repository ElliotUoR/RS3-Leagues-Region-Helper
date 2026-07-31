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
//
// IMPORTANT: SUPPORTED_VERSIONS has to be bumped in lockstep with
// SHARE_VERSION over in src/utils/shareBuild.js every time that changes -
// there's no shared constant between the two copies to keep this in sync
// automatically. Falling behind doesn't error loudly: it just makes
// decodeShareBuildForImage silently return null for every new share link,
// which routes/ogImage.js treats as "unknown code" (404) - this is exactly
// what happened when SHARE_VERSION bumped to 7 for league relics but this
// Set was never updated to match.
import LZString from 'lz-string';
import { COMBAT_STYLES, ESSENCE_OF_FINALITY_NAMES, GEAR_SLOTS } from '../../../src/data/gear.js';
import { GATEWAY_REGIONS, OPTIONAL_REGIONS, REGIONS } from '../../../src/data/regions.js';
import { BLESSINGS, GOD_TIER_BLESSINGS, resolveGodTier } from '../../../src/data/blessings.js';
import { LEAGUE_RELICS } from '../../../src/data/leagueRelics.js';

// The planner allows at most this many optional regions; a payload claiming
// more is either stale or hand-edited. The image renders the first three
// rather than growing an unbounded column.
const MAX_OPTIONAL_REGIONS = 3;
// A run can hold one league relic per tier. Seven is the announced ceiling once
// every tier is released, and is what the image's two-column block is sized for.
const MAX_LEAGUE_RELICS = 7;

const SUPPORTED_VERSIONS = new Set([2, 3, 4, 5, 6, 7, 8]);

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

// Blessing picks, capped at one per tier, resolved to the icon paths the
// renderer draws. The God Tier One power is appended when the picks settle it
// (a colour with two or more, or all three tiers picked) - it is derived rather
// than stored, exactly as on the Blessings page, so it never appears in the
// payload itself. Arch relics are not rendered.
function sanitizeBlessingsForImage(raw) {
  if (!Array.isArray(raw)) return [];
  const seenTiers = new Set();
  const picks = [];
  for (const name of raw) {
    const blessing = BLESSINGS.find((b) => b.name === name);
    if (!blessing || seenTiers.has(blessing.tier)) continue;
    seenTiers.add(blessing.tier);
    picks.push(blessing);
  }
  const colours = picks.map((b) => b.colour);
  const majority = ['red', 'green', 'blue'].find(
    (colour) => colours.filter((c) => c === colour).length >= 2,
  );
  const settled = Boolean(majority) || picks.length === 3;
  const god = settled ? resolveGodTier(colours) : null;
  const all = god ? [...picks, GOD_TIER_BLESSINGS.find((p) => p.name === god.name)] : picks;
  return all.filter(Boolean).map((b) => ({ icon: b.icon, colour: b.colour, name: b.name }));
}

// A relic with no artwork is skipped rather than drawn as an empty box, so a
// share image would show fewer relics than the build picked. Every relic has an
// icon today; this guard exists for the gap between a relic being announced and
// its icon being cropped, which has happened for every set so far.
function sanitizeLeagueRelicsForImage(raw) {
  if (!Array.isArray(raw)) return [];
  const seenTiers = new Set();
  const picks = [];
  for (const name of raw) {
    const relic = LEAGUE_RELICS.find((r) => r.name === name);
    if (!relic?.icon) continue;
    if (relic.tier != null) {
      if (seenTiers.has(relic.tier)) continue;
      seenTiers.add(relic.tier);
    }
    picks.push({ icon: relic.icon, name: relic.name });
    if (picks.length === MAX_LEAGUE_RELICS) break;
  }
  return picks;
}

// Decodes a `share`/short-link payload string down to just what the og-image
// renderer needs: regions + gateway picks, the default style's equipped items
// (including its EOF-slotted weapon if any), blessings, and league relics.
// Arch relics are deliberately not carried through - they are not drawn.
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
      // Capped: a run only ever gets three optional regions, and a payload
      // carrying more (stale, or hand-edited) previously grew the image's
      // region column without limit. Which three is not meaningful here - any
      // three is as good as any other - so it takes them in payload order.
      ...OPTIONAL_REGIONS.filter((id) => regions.includes(id)).slice(0, MAX_OPTIONAL_REGIONS),
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
      blessings: sanitizeBlessingsForImage(parsed.b),
      leagueRelics: sanitizeLeagueRelicsForImage(parsed.l),
    };
  } catch {
    return null;
  }
}
