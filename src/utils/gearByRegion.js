import { COMBAT_STYLES, GEAR } from '../data/gear';
import { isGearItemImpossible, normalizeRegionGroups } from '../data/gearAvailability';

// Flattens every item across every style/slot into one de-duplicated list
// (keyed by name) - a shared/universal accessory appears identically under
// each applicable style already, and this page doesn't discriminate by
// combat style, so it should only show up once. Every item gets a normalized
// `applicableStyles` array: universal accessories already have their own
// (from gear.js's UNIVERSAL_ACCESSORIES), everything else gets it derived
// here from which style bucket(s) it was actually found under.
function collectAllItems() {
  const byName = new Map();
  for (const style of COMBAT_STYLES) {
    const slots = GEAR[style];
    for (const slot of Object.keys(slots)) {
      for (const item of slots[slot]) {
        if (!byName.has(item.name)) byName.set(item.name, { item, styles: [] });
        byName.get(item.name).styles.push(style);
      }
    }
  }
  return [...byName.values()].map(({ item, styles }) => ({
    ...item,
    applicableStyles: item.applicableStyles ?? styles,
  }));
}

// Computed once - gear.js is static data, not something that changes at runtime.
const ALL_ITEMS = collectAllItems();

// Global name search across every item in gear.js, deliberately ignoring
// region entirely - that's the whole point of the search bar on the Gear by
// Region page, which otherwise only ever shows you one region at a time.
//
// Unlike getGearForRegion below, this does NOT filter out 'global'/'relic'
// items or `impossible` ones. Those are invisible everywhere else on this
// page (they're tied to no region, or to more regions than a run can hold),
// so a search that hid them would be quietly lying about what exists - and
// GearByRegionRow already renders their "Not obtainable"/global tags correctly.
//
// Matching is a case-insensitive substring on the item name, with curly
// apostrophes folded to straight ones so typing "araxxi's" finds "Araxxi’s".
function normalize(text) {
  return text.toLowerCase().replace(/[‘’]/g, "'");
}

export function searchAllGear(query) {
  const needle = normalize(query.trim());
  if (!needle) return [];
  return ALL_ITEMS.filter((item) => normalize(item.name).includes(needle));
}

// Classifies every non-impossible, real-region-gated item into two buckets
// for the given region:
//   - `direct`: the item has only ONE AND-group total (ignoring any
//     'global'/'relic' pseudo-groups), and this region is one of its
//     regions (whether the sole one, or one alternative within an OR-group)
//     - so picking just this region, on its own, is genuinely enough.
//   - `combination`: the item has TWO OR MORE AND-groups, and this region
//     appears in at least one of them - it genuinely also needs at least
//     one other region requirement satisfied alongside this one.
// 'global'/'relic'-gated items aren't tied to any specific region, so they
// never appear on this page under any region. `impossible` items (need more
// regions than a single Leagues run can unlock) are excluded entirely too.
export function getGearForRegion(regionId) {
  const direct = [];
  const combination = [];
  for (const item of ALL_ITEMS) {
    if (isGearItemImpossible(item)) continue;
    const realGroups = normalizeRegionGroups(item).filter(
      (g) => !g.regions.includes('global') && !g.regions.includes('relic'),
    );
    if (realGroups.length === 0) continue;
    if (!realGroups.some((g) => g.regions.includes(regionId))) continue;
    (realGroups.length === 1 ? direct : combination).push(item);
  }
  return { direct, combination };
}
