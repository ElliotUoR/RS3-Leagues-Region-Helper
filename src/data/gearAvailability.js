// Pseudo-region tags that are always considered "unlocked" regardless of
// which real regions the player has selected.
const ALWAYS_UNLOCKED = new Set(['global', 'relic']);

// Splits an item's `source.region` into an ordered list of AND-groups, where
// each group is `{ regions: [...], label?, component? }` - any one region in
// `regions` being unlocked satisfies that group. An optional `label` (e.g.
// "Luminate ore") tells the UI to collapse the group's alternatives into a
// single named tag instead of listing each region - used for wide OR-groups
// (5+ regions) where spelling out every alternative gets unreadable. An
// optional `component: true` marks a group that represents an Invention
// component requirement (e.g. "Cywir components", "Ports components") rather
// than a plain region visit - see isGearItemAvailable's `ignoreComponents`
// option, used by the Abilities page's "Ignore component requirements"
// toggle to treat these groups as automatically satisfied. Mirrors the
// `region` conventions documented in gear.js:
//   - undefined/null/'global' -> [{ regions: ['global'] }]
//   - 'relic'                 -> [{ regions: ['relic'] }]
//   - a single region id      -> [{ regions: [regionId] }]
//   - a plain array of region ids (combination item, AND) ->
//       [{ regions: [id1] }, { regions: [id2] }, ...] - one single-region
//       group per entry
//   - an array that also contains `{ anyOf: [...], label?, component? }`
//       entries -> each anyOf entry becomes its own OR-group, e.g.
//       ['asgarnia', { anyOf: ['wilderness', 'kandarin'] }] becomes
//       [{ regions: ['asgarnia'] }, { regions: ['wilderness', 'kandarin'] }]
//       (asgarnia AND (wilderness OR kandarin))
//   - a bare `{ anyOf: [...], label?, component? }` (no surrounding array) ->
//       [{ regions: [...anyOf], label, component }]
export function normalizeRegionGroups(item) {
  const region = item.source?.region;
  if (!region || region === 'global') return [{ regions: ['global'] }];
  if (region === 'relic') return [{ regions: ['relic'] }];
  if (Array.isArray(region)) {
    return region.map((entry) => {
      if (typeof entry === 'string') return { regions: [entry] };
      if (Array.isArray(entry?.anyOf)) {
        return { regions: entry.anyOf, label: entry.label, component: entry.component };
      }
      return { regions: [] };
    });
  }
  if (typeof region === 'object' && Array.isArray(region.anyOf)) {
    return [{ regions: region.anyOf, label: region.label, component: region.component }];
  }
  return [{ regions: [region] }];
}

// Flat, de-duplicated list of every region id an item touches (across all
// AND-groups and OR-alternatives). Used where grouping doesn't matter, e.g.
// generic "does this item involve region X" checks.
export function normalizeRegions(item) {
  return [...new Set(normalizeRegionGroups(item).flatMap((g) => g.regions))];
}

// Items that structurally require more regions than a single Leagues run can
// unlock (3 fixed + up to 3 optional) are marked `source.impossible: true`
// rather than expressed as an unsatisfiable region combination - this lets
// the UI show a permanent "not obtainable" badge instead of a normal (if
// always-locked) region tag set. `source.impossibleReason` is an optional
// human-readable explanation shown in the badge's tooltip.
export function isGearItemImpossible(item) {
  return Boolean(item.source?.impossible);
}

// Determines whether a gear item is obtainable given the player's currently
// unlocked regions: every AND-group must have at least one unlocked
// OR-alternative, and the item must not be flagged `impossible`.
//
// `options.ignoreComponents` (default false) treats any `component: true`
// group as automatically satisfied regardless of region - used by the
// Abilities page's "Ignore component requirements" toggle, which lets a
// player who already has the Invention component stockpiled skip that
// region requirement while still needing the item's other regions.
export function isGearItemAvailable(item, isUnlocked, options = {}) {
  const { ignoreComponents = false } = options;
  if (isGearItemImpossible(item)) return false;
  return normalizeRegionGroups(item).every((group) => {
    if (ignoreComponents && group.component) return true;
    return group.regions.some((r) => ALWAYS_UNLOCKED.has(r) || isUnlocked(r));
  });
}
