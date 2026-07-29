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
