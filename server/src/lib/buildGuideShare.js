// Turns a Build Guide id into the same shape decodeShareBuildForImage produces
// for a short link, so both feed one renderer (lib/ogImageRender.js).
//
// Unlike a short link there is no payload and no database lookup: a build guide
// is static reference data, so /build-guides/<id> can be rendered from
// src/data/blessingBuilds.js alone. That is what makes a per-build og:image
// possible for a plain shareable URL - see routes/buildGuidePage.js for why the
// hash form (#build-guides/<id>) cannot work.
import { BLESSING_BUILDS_EXAMPLES } from '../../../src/data/blessingBuilds.js';
import { BLESSINGS, GOD_TIER_BLESSINGS, resolveGodTier } from '../../../src/data/blessings.js';
import { LEAGUE_RELICS } from '../../../src/data/leagueRelics.js';
import { GATEWAY_REGIONS, OPTIONAL_REGIONS, REGIONS } from '../../../src/data/regions.js';
import { COMBAT_STYLES, ESSENCE_OF_FINALITY_NAMES } from '../../../src/data/gear.js';

const MAX_OPTIONAL_REGIONS = 3;
const MAX_LEAGUE_RELICS = 7;

// Ids come straight off the URL, so they are matched against this rather than
// used to index anything. Builds flagged `hidden` are excluded for the same
// reason the page hides them - they are unfinished, and a link to one should
// behave exactly like a link to an id that does not exist.
const BUILD_BY_ID = new Map(
  BLESSING_BUILDS_EXAMPLES.filter((build) => !build.hidden).map((build) => [build.id, build]),
);

export function findBuildGuide(id) {
  return BUILD_BY_ID.get(id) ?? null;
}

// Same "settled or nothing" rule the Blessings page uses: the God Tier One
// power only joins the icons once a colour has two picks or all three tiers are
// in, because resolveGodTier falls back to green whenever no colour has two.
function blessingIconsFor(blessingNames) {
  const picks = (blessingNames ?? [])
    .map((name) => BLESSINGS.find((b) => b.name === name))
    .filter(Boolean);
  const colours = picks.map((b) => b.colour);
  const majority = ['red', 'green', 'blue'].find(
    (colour) => colours.filter((c) => c === colour).length >= 2,
  );
  const settled = Boolean(majority) || picks.length === 3;
  const god = settled ? resolveGodTier(colours) : null;
  const all = god ? [...picks, GOD_TIER_BLESSINGS.find((p) => p.name === god.name)] : picks;
  return all.filter(Boolean).map((b) => ({ icon: b.icon, colour: b.colour, name: b.name }));
}

function leagueRelicIconsFor(relicNames) {
  return (relicNames ?? [])
    .map((name) => LEAGUE_RELICS.find((r) => r.name === name))
    .filter((relic) => relic?.icon)
    .slice(0, MAX_LEAGUE_RELICS)
    .map((relic) => ({ icon: relic.icon, name: relic.name }));
}

// Guides and user builds both store only their OPTIONAL region picks; the
// fixed three and the gateway are implied.
function unlockedRegionIdsFor(optionalPicks) {
  return [
    ...Object.keys(REGIONS).filter((id) => REGIONS[id].fixed),
    ...GATEWAY_REGIONS,
    ...OPTIONAL_REGIONS.filter((id) => (optionalPicks ?? []).includes(id)).slice(0, MAX_OPTIONAL_REGIONS),
  ];
}

export function buildGuideImageInput(build) {
  // The card defaults to the build's first style, so the image shows the same
  // loadout a visitor sees first rather than an arbitrary one.
  const style = COMBAT_STYLES.includes(build.styles?.[0]) ? build.styles[0] : 'melee';
  const loadout = build.loadouts?.late?.[style] ?? {};

  return {
    unlockedRegionIds: unlockedRegionIdsFor(build.regions),
    equippedNames: loadout.slots ?? {},
    // Rendered in the grid's top-left EOF cell, same as on the card. No
    // necklace check needed the way the short-link decoder does one: a guide's
    // loadout is authored data, so an `eof` here always has its amulet.
    eofWeaponName: loadout.eof ?? null,
    defaultStyle: style,
    blessings: blessingIconsFor(build.blessings),
    leagueRelics: leagueRelicIconsFor(build.relics),
  };
}

// The same, for a user-submitted build's stored payload (see
// src/utils/userBuildShape.js). Kept separate rather than folded into the
// above because the two shapes genuinely differ: a guide has a fixed
// midLate/late split with `loadouts.late`, a user build has up to two
// author-named `stages`, each with its own per-style loadouts.
//
// Everything here is defensive. The payload is opaque JSON server-side -
// validated only for size on the way in and sanitized only in the browser on
// the way out - so this renders whatever it can recognise and drops the rest,
// rather than trusting a shape a crafted POST could break.
export function userBuildImageInput(payload) {
  const styles = Array.isArray(payload?.styles) ? payload.styles.filter((s) => COMBAT_STYLES.includes(s)) : [];
  const stages = Array.isArray(payload?.stages) ? payload.stages : [];

  // The author can nominate ONE loadout for the thumbnail (the "Use this gear
  // loadout for thumbnail" tickbox - see pages/CreateBuildPage.jsx). Without a
  // pick, stage 0 and the first style: exactly what UserBuildCard opens on, so
  // the preview matches the first thing a visitor following the link sees.
  //
  // Re-validated rather than trusted. The payload is opaque JSON to this
  // service, and even an honest one can go stale - a build edited after the
  // pick was made can lose that stage or that style.
  const pick = payload?.thumbnail;
  const pickIsUsable =
    Number.isInteger(pick?.stage) &&
    styles.includes(pick?.style) &&
    Boolean(stages[pick.stage]?.loadouts?.[pick.style]);

  const style = pickIsUsable ? pick.style : styles[0] ?? 'melee';
  const stageIndex = pickIsUsable ? pick.stage : 0;
  const loadout = stages[stageIndex]?.loadouts?.[style] ?? {};
  const slots = loadout.slots && typeof loadout.slots === 'object' ? loadout.slots : {};

  return {
    unlockedRegionIds: unlockedRegionIdsFor(payload?.regions),
    equippedNames: slots,
    // Unlike a curated guide, this IS user input, so the EOF cell only fills
    // when the amulet that reveals it is actually worn - the same check
    // ReadOnlyLoadout makes on the page. Without it a payload could show a
    // weapon in a slot the card itself would not render.
    eofWeaponName: ESSENCE_OF_FINALITY_NAMES.includes(slots.neck) ? loadout.eof ?? null : null,
    defaultStyle: style,
    blessings: blessingIconsFor(payload?.blessings),
    leagueRelics: leagueRelicIconsFor(payload?.relics),
  };
}
