// The two sets a visitor can rank on the tier list maker, joined to the icons
// and accent colours the chips need.
//
// Blessings include the three God Tier powers alongside the nine pickable
// blessings, matching this site's own blessing tier list - it grades them on
// the same scale, and a list that ignored them would be answering a narrower
// question than the curated one it sits beside.
//
// Explicit .js extensions throughout: this module is COPY'd into the server
// image (server/Dockerfile) to validate submitted lists, and Node's ESM
// resolver, unlike Vite's, will not guess them.
//
// Order here is the order chips appear in Unsorted, so it is the order someone
// works through them: blessings by tier then colour, relics by their own tier.
import { BLESSINGS, GOD_TIER_BLESSINGS } from './blessings.js';
import { LEAGUE_RELICS } from './leagueRelics.js';
import { RELIC_COLOURS } from './blessingBuilds.js';

const blessingItems = [
  ...[...BLESSINGS].sort((a, b) => a.tier - b.tier),
  ...GOD_TIER_BLESSINGS,
].map((blessing) => ({
  name: blessing.name,
  icon: blessing.icon,
  colour: blessing.colour,
  // `kind` drives the T1/T2/T3 vs God badge, same as the curated list's.
  kind: GOD_TIER_BLESSINGS.some((god) => god.name === blessing.name) ? 'god' : 'blessing',
  tier: blessing.tier ?? null,
  // What the chip shows on hover/click. `compactPoints` is the blessing's own
  // one-line-per-effect summary; the God Tier powers have no compact form, so
  // they fall back to their full effects - which are short anyway.
  description: blessing.compactPoints ?? blessing.effects ?? [],
}));

const relicItems = [...LEAGUE_RELICS]
  .sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99))
  .map((relic) => ({
    name: relic.name,
    icon: relic.icon,
    hue: RELIC_COLOURS[relic.name]?.hue,
    relicTier: relic.tier ?? null,
    // A relic's `summary` IS its compact description - one sentence covering
    // what it does. Its `effects` are the long form and belong on the Relics
    // page, not in a bubble over a tier list.
    description: relic.summary ? [relic.summary] : [],
  }));

export const TIER_LIST_ITEMS = {
  blessings: blessingItems,
  relics: relicItems,
};

export const TIER_LIST_LABELS = {
  blessings: 'Blessings',
  relics: 'League relics',
};

// Lower-case and singular, for reading inside a sentence: "Elliot's blessing
// tier list".
export const TIER_LIST_NOUNS = {
  blessings: 'blessing',
  relics: 'league relic',
};

// What a list is called. The author's name is OPTIONAL - plenty of people just
// want to rank things and share the picture - so an unnamed list is "My
// blessing tier list", which reads correctly both to the person who made it and
// to anyone they send it to.
//
// One function rather than the same ternary in four places: the heading, the
// exported image, the unfurl title and the admin dashboard must agree, and
// they are spread across two repos and a canvas renderer.
export function tierListTitle(authorName, type) {
  const noun = TIER_LIST_NOUNS[type] ?? 'tier';
  const name = typeof authorName === 'string' ? authorName.trim() : '';
  return name ? `${name}'s ${noun} tier list` : `My ${noun} tier list`;
}

export function itemsFor(type) {
  return TIER_LIST_ITEMS[type] ?? [];
}

export function itemNamesFor(type) {
  return itemsFor(type).map((item) => item.name);
}
