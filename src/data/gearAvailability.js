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
// a quest step, boss drop, on-site interaction, or a hand-in to an NPC who
// is not a collection collector) - these materials
// are obtainable remotely via the Research system without visiting the dig
// site's own region, so `isGearItemAvailable`'s `ignoreArtefactRegions`
// option (the Relics page's "Artefacts are not region-locked" toggle) treats
// them as automatically satisfied. Artefact groups are always single-region
// and carry an optional `note` with item-specific tooltip text (e.g. "skips
// the Everlight dig site materials") instead of a hand-written `label` - the
// UI derives the "Artefacts: X" label itself from the region id. A `region:
// 'relic'` item additionally carries `source.leagueRelic` (e.g. 'Golden
// Touch') when it's known which specific League Relic grants it - that
// group then gates PURELY on `isGearItemAvailable`'s `selectedLeagueRelics`
// option instead of the blanket-unlocked fallback every other 'relic' item
// still gets (there's no real region alternative for these). An `anyOf`
// entry can ALSO carry its own `leagueRelic` alongside real regions (e.g.
// the "Luminate ore"/"Oricalchite ore"/"Light animica ore" labelled groups
// tagged `leagueRelic: 'Endless Harvest'`) - there the relic is an
// *additional* OR-alternative on top of the regions, not a replacement for
// them (see isGearItemAvailable for how the two `leagueRelic` shapes are
// told apart). Mirrors the `region` conventions documented in gear.js:
//   - undefined/null/'global' -> [{ regions: ['global'] }]
//   - 'relic'                 -> [{ regions: ['relic'], leagueRelic? }]
//   - a single region id      -> [{ regions: [regionId] }]
//   - a plain array of region ids (combination item, AND) ->
//       [{ regions: [id1] }, { regions: [id2] }, ...] - one single-region
//       group per entry
//   - an array that also contains `{ anyOf: [...], label?, component?,
//       artefact?, note?, leagueRelic? }` entries -> each anyOf entry
//       becomes its own OR-group, e.g. ['asgarnia', { anyOf: ['wilderness', 'kandarin'] }]
//       becomes [{ regions: ['asgarnia'] }, { regions: ['wilderness', 'kandarin'] }]
//       (asgarnia AND (wilderness OR kandarin))
//   - a bare `{ anyOf: [...], label?, component?, artefact?, note?, leagueRelic? }` (no
//       surrounding array) -> [{ regions: [...anyOf], label, component, artefact, note }]
export function normalizeRegionGroups(item) {
  const region = item.source?.region;
  if (!region || region === 'global') return [{ regions: ['global'] }];
  if (region === 'relic') return [{ regions: ['relic'], leagueRelic: item.source?.leagueRelic }];
  if (Array.isArray(region)) {
    return region.map((entry) => {
      if (typeof entry === 'string') return { regions: [entry] };
      if (Array.isArray(entry?.anyOf)) {
        return { regions: entry.anyOf, label: entry.label, component: entry.component, artefact: entry.artefact, note: entry.note, leagueRelic: entry.leagueRelic };
      }
      return { regions: [] };
    });
  }
  if (typeof region === 'object' && Array.isArray(region.anyOf)) {
    return [{ regions: region.anyOf, label: region.label, component: region.component, artefact: region.artefact, note: region.note, leagueRelic: region.leagueRelic }];
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

// Distinct from `impossible` - that's about region math (needs more
// distinct optional regions than a single run can unlock); `disabled` is
// for items Jagex has explicitly turned off for the Leagues game mode
// regardless of region access (e.g. Vanquish/Armour of Trials, since
// Leagues grants Quest Points a different way than normal play). Shown as
// its own "Disabled" tag rather than "Not obtainable" - same always-locked
// behaviour, different reason. `source.disabledReason` is the optional
// human-readable explanation shown in the tag's tooltip.
export function isGearItemDisabled(item) {
  return Boolean(item.source?.disabled);
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
// without visiting the dig site's own region, while quest steps, boss drops,
// on-site interactions and hand-ins to non-collector NPCs still gate.
//
// A collection's collector never gates at all any more and is not recorded as
// a region - collections are handed in at the delivery box by Velucia, in
// always-unlocked Misthalin. See the header of data/relics.js.
//
// `leagueRelic` is normally a single relic name, but a group can list
// several alternative relics that each independently satisfy it (e.g.
// Luminate/Oricalchite/Light animica ore's groups are satisfied by *either*
// Endless Harvest's Mining tier-upgrade chance *or* Transmutation's
// resource-conversion spells - two unrelated relics that each happen to
// produce the same materials) - accepts either shape so single-relic
// entries don't need to become a one-element array everywhere.
export function normalizeLeagueRelicList(leagueRelic) {
  if (!leagueRelic) return [];
  return Array.isArray(leagueRelic) ? leagueRelic : [leagueRelic];
}

// `options.selectedLeagueRelics` (default []) is the player's current League
// Relic picks (see hooks/useLeagueRelicSelection.js). A group whose
// `leagueRelic` is set is satisfied by any one of those relic(s) being
// picked - for a pure `region: 'relic'` group (e.g. Golden Touch's own
// reward item, which has no real region alternative) that's the *only* way
// it's satisfied, regardless of region state. But a group can also carry a
// `leagueRelic` alongside real regions (e.g. the "Luminate ore"/"Oricalchite
// ore"/"Light animica ore" labelled groups - see normalizeLeagueRelicList
// above) - there, the relic(s) are an *additional* alternative on top of the
// normal region check, not a replacement for it.
export function isGearItemAvailable(item, isUnlocked, options = {}) {
  const { ignoreComponents = false, ignoreArtefactRegions = false, selectedLeagueRelics = [] } = options;
  if (isGearItemImpossible(item) || isGearItemDisabled(item)) return false;
  return normalizeRegionGroups(item).every((group) => {
    const relicOptions = normalizeLeagueRelicList(group.leagueRelic);
    if (relicOptions.some((relic) => selectedLeagueRelics.includes(relic))) return true;
    // A pure relic-gated group (no real region alternative) stops here -
    // falling through to the region check below would trivially pass
    // regardless of the relic pick, since 'relic' is itself in ALWAYS_UNLOCKED.
    if (relicOptions.length > 0 && group.regions.length === 1 && group.regions[0] === 'relic') return false;
    if (ignoreComponents && group.component) return true;
    if (ignoreArtefactRegions && group.artefact) return true;
    return group.regions.some((r) => ALWAYS_UNLOCKED.has(r) || isUnlocked(r));
  });
}
