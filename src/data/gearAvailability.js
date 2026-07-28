// Pseudo-region tags that are always considered "unlocked" regardless of
// which real regions the player has selected. 'relic' only falls back to
// this for an item that doesn't say which specific league relic grants it -
// see the `leagueRelic` field/isGearItemAvailable's `selectedLeagueRelics`
// option below for the two (Seren's Crystal Tiara, Goldenhawk boots) that do.
const ALWAYS_UNLOCKED = new Set(['global', 'relic']);

// Splits an item's `source.region` into an ordered list of AND-groups, where
// each group is `{ regions: [...], label?, component?, artefact?, note? }` -
// any one region in `regions` being unlocked satisfies that group. An
// optional `label` (e.g. "Luminate ore") tells the UI to collapse the
// group's alternatives into a single named tag instead of listing each
// region - used for wide OR-groups (5+ regions) where spelling out every
// alternative gets unreadable. An optional `component: true` marks a group
// that represents an Invention component requirement (e.g. "Cywir
// components", "Ports components") rather than a plain region visit - see
// isGearItemAvailable's `ignoreComponents` option, used by the Abilities
// page's "Ignore component requirements" toggle to treat these groups as
// automatically satisfied. An optional `artefact: true` marks a group that
// represents Archaeology dig-site *artefact collection only* (as opposed to
// a collector NPC hand-in or non-Archaeology component) - these materials
// are obtainable remotely via the Research system without visiting the dig
// site's own region, so `isGearItemAvailable`'s `ignoreArtefactRegions`
// option (the Relics page's "Artefacts are not region-locked" toggle) treats
// them as automatically satisfied. Artefact groups are always single-region
// and carry an optional `note` with item-specific tooltip text (e.g. "skips
// the Everlight dig site materials") instead of a hand-written `label` - the
// UI derives the "Artefacts: X" label itself from the region id. A `region:
// 'relic'` item additionally carries `source.leagueRelic` (e.g. 'Golden
// Touch') when it's known which specific League Relic grants it - that
// group then gates on `isGearItemAvailable`'s `selectedLeagueRelics` option
// instead of the blanket-unlocked fallback every other 'relic' item still
// gets. Mirrors the `region` conventions documented in gear.js:
//   - undefined/null/'global' -> [{ regions: ['global'] }]
//   - 'relic'                 -> [{ regions: ['relic'], leagueRelic? }]
//   - a single region id      -> [{ regions: [regionId] }]
//   - a plain array of region ids (combination item, AND) ->
//       [{ regions: [id1] }, { regions: [id2] }, ...] - one single-region
//       group per entry
//   - an array that also contains `{ anyOf: [...], label?, component?,
//       artefact?, note? }` entries -> each anyOf entry becomes its own
//       OR-group, e.g. ['asgarnia', { anyOf: ['wilderness', 'kandarin'] }]
//       becomes [{ regions: ['asgarnia'] }, { regions: ['wilderness', 'kandarin'] }]
//       (asgarnia AND (wilderness OR kandarin))
//   - a bare `{ anyOf: [...], label?, component?, artefact?, note? }` (no
//       surrounding array) -> [{ regions: [...anyOf], label, component, artefact, note }]
export function normalizeRegionGroups(item) {
  const region = item.source?.region;
  if (!region || region === 'global') return [{ regions: ['global'] }];
  if (region === 'relic') return [{ regions: ['relic'], leagueRelic: item.source?.leagueRelic }];
  if (Array.isArray(region)) {
    return region.map((entry) => {
      if (typeof entry === 'string') return { regions: [entry] };
      if (Array.isArray(entry?.anyOf)) {
        return { regions: entry.anyOf, label: entry.label, component: entry.component, artefact: entry.artefact, note: entry.note };
      }
      return { regions: [] };
    });
  }
  if (typeof region === 'object' && Array.isArray(region.anyOf)) {
    return [{ regions: region.anyOf, label: region.label, component: region.component, artefact: region.artefact, note: region.note }];
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
//
// `options.ignoreArtefactRegions` (default false) treats any `artefact: true`
// group as automatically satisfied regardless of region - used by the
// Relics page's "Artefacts are not region-locked" toggle, which reflects
// that dig-site artefact collection can be done remotely via Research
// without visiting the dig site's own region, while a relic's collector
// hand-in location (and any non-Archaeology component) still gates.
//
// `options.selectedLeagueRelics` (default []) is the player's current League
// Relic picks (see hooks/useLeagueRelicSelection.js) - a group whose
// `leagueRelic` is set is satisfied only by that exact pick being present,
// regardless of region state (only GearPage.jsx passes this option; every
// other caller's items are never tagged with `leagueRelic`, so this is a
// no-op elsewhere).
export function isGearItemAvailable(item, isUnlocked, options = {}) {
  const { ignoreComponents = false, ignoreArtefactRegions = false, selectedLeagueRelics = [] } = options;
  if (isGearItemImpossible(item)) return false;
  return normalizeRegionGroups(item).every((group) => {
    if (group.leagueRelic) return selectedLeagueRelics.includes(group.leagueRelic);
    if (ignoreComponents && group.component) return true;
    if (ignoreArtefactRegions && group.artefact) return true;
    return group.regions.some((r) => ALWAYS_UNLOCKED.has(r) || isUnlocked(r));
  });
}
