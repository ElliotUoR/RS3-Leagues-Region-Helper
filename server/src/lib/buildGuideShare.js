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
import { COMBAT_STYLES } from '../../../src/data/gear.js';

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
function blessingIconsFor(build) {
  const picks = (build.blessings ?? [])
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

function leagueRelicIconsFor(build) {
  return (build.relics ?? [])
    .map((name) => LEAGUE_RELICS.find((r) => r.name === name))
    .filter((relic) => relic?.icon)
    .slice(0, MAX_LEAGUE_RELICS)
    .map((relic) => ({ icon: relic.icon, name: relic.name }));
}

export function buildGuideImageInput(build) {
  // The card defaults to the build's first style, so the image shows the same
  // loadout a visitor sees first rather than an arbitrary one.
  const style = COMBAT_STYLES.includes(build.styles?.[0]) ? build.styles[0] : 'melee';
  const loadout = build.loadouts?.late?.[style] ?? {};

  const unlockedRegionIds = [
    ...Object.keys(REGIONS).filter((id) => REGIONS[id].fixed),
    // Guides always take the gateway region; `build.regions` holds only the
    // optional picks (see BuildGuideCard's shareFieldsFor).
    ...GATEWAY_REGIONS,
    ...OPTIONAL_REGIONS.filter((id) => (build.regions ?? []).includes(id)).slice(0, MAX_OPTIONAL_REGIONS),
  ];

  return {
    unlockedRegionIds,
    equippedNames: loadout.slots ?? {},
    // Rendered in the grid's top-left EOF cell, same as on the card. No
    // necklace check needed the way the short-link decoder does one: a guide's
    // loadout is authored data, so an `eof` here always has its amulet.
    eofWeaponName: loadout.eof ?? null,
    defaultStyle: style,
    blessings: blessingIconsFor(build),
    leagueRelics: leagueRelicIconsFor(build),
  };
}
