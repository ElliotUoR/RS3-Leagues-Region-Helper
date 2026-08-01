// Spellbook and Prayer-book unlock reference for RS3 Leagues II: Equilibrium.
//
// Each entry is a "card": one or more named icons (most cards are a single
// spell/prayer standing in for the whole book or sub-unlock; a few represent
// a matched set unlocked together, e.g. the four Nex, Angel of Death curses)
// plus a `source.region` gate read by the same gearAvailability.js helpers
// used everywhere else (single id / AND array / 'global').
//
// `softRegion` is a separate, non-gating hint: a region the wiki doesn't
// confirm as a hard requirement, shown as a dashed/muted "possibly requires"
// tag that never locks the card. Currently only used for Ancient Curses,
// where the desert gate isn't confirmed the way Ancient Magicks' is.
//
// League relic alternative: the Crystal Grace relic's own effect text says it
// "Unlocks all Magic spells across all spellbooks", so every non-global
// SPELLBOOK card carries `{ anyOf: [region], leagueRelic: 'Crystal Grace' }` -
// the same "relic is an ADDITIONAL alternative on top of the region" shape
// gear.js uses for its Luminate/Oricalchite/Light animica ore groups (see
// gearAvailability.js's isGearItemAvailable). Picking Crystal Grace therefore
// unlocks Lunar, Ancient Magicks and Seren spells regardless of region.
//
// Deliberately NOT applied to PRAYER_GROUPS: Crystal Grace unlocks *spells*,
// and Ancient Curses / Seren Prayers / Knight Waves / the Nex curses are
// prayer-book unlocks, not spells. Do not "fix" that asymmetry.
//
// League passives Tier 6 (per the passive table released alongside launch):
// "at tier 6 you unlock the Seren spells and prayers." Modeled as a 'tier6'
// pseudo-region (see gearAvailability.js's ALWAYS_UNLOCKED / RegionTags.jsx's
// isRegionUnlocked) - unconditionally satisfied, same mechanism as 'global'/
// 'relic'. Seren spells still needs Ancient Magicks' own Desert Treasure
// requirement on top of it (Tier 6 only replaces the old extra Tirannwn/
// Light Within requirement, so it now reads Desert AND Tier 6 - effectively
// just Desert, since Tier 6 is always satisfied). Seren Prayers has no such
// parent requirement, so it's Tirannwn OR Tier 6 - effectively always
// unlocked, same as its Ancient Curses parent.
//
// Each `*_GROUPS` array is a set of independent unlock lines, one per panel
// - a parent card plus the sub-unlocks/extensions layered on top of it.
// Rendered as N side-by-side panels (3 for spellbooks, 2 for prayers),
// parent card first and its related cards connected below.
const FP = (file) => `icons/${file}`;

export const SPELLBOOK_GROUPS = [
  {
    id: 'standard',
    parent: {
      name: 'Standard spellbook',
      icons: [{ name: 'Standard spellbook', icon: FP('Fire_Surge_icon.png') }],
      source: { region: 'global', detail: 'Auto-unlocked from the start.' },
    },
    related: [],
  },
  {
    id: 'lunar',
    parent: {
      name: 'Lunar spellbook',
      icons: [{ name: 'Lunar spellbook', icon: FP('Vengeance_icon.png') }],
      source: {
        region: { anyOf: ['fremennikProvince'], leagueRelic: 'Crystal Grace' },
        detail: 'Unlocked via the Fremennik quest line (Lunar Diplomacy), or by the Crystal Grace relic.',
      },
    },
    related: [],
  },
  {
    id: 'ancient',
    parent: {
      name: 'Ancient Magicks',
      icons: [{ name: 'Ancient Magicks', icon: FP('Blood_Barrage.png') }],
      source: {
        region: { anyOf: ['kharidianDesert'], leagueRelic: 'Crystal Grace' },
        detail: 'Unlocked via Desert Treasure, or by the Crystal Grace relic.',
      },
    },
    related: [
      {
        name: 'Seren spells',
        icons: [{ name: 'Seren spells', icon: FP('Crystal_Mask.png') }],
        source: {
          region: [
            { anyOf: ['kharidianDesert'], leagueRelic: 'Crystal Grace' },
            { anyOf: ['tier6'] },
          ],
          detail:
            "Auto-unlocked at League passives Tier 6, on top of Ancient Magicks' own Desert Treasure requirement - or the Crystal Grace relic instead of Desert.",
        },
      },
    ],
  },
];

export const PRAYER_GROUPS = [
  {
    id: 'standard',
    parent: {
      name: 'Standard Prayers',
      icons: [{ name: 'Standard Prayers', icon: FP('Protect_from_Melee.png') }],
      source: { region: 'global', detail: 'Auto-unlocked from the start.' },
    },
    related: [
      {
        name: 'Divine Rage',
        icons: [{ name: 'Divine Rage', icon: FP('Divine_Rage.png') }],
        source: { region: 'misthalin', detail: 'Unlocked at the Sanctum of Rebirth.' },
      },
      {
        name: 'Eclipsed Soul',
        icons: [{ name: 'Eclipsed Soul', icon: FP('Eclipsed_Soul.png') }],
        source: { region: 'misthalin', detail: 'Unlocked at the Gate of Elidinis.' },
      },
      {
        name: 'Knight Waves prayers',
        icons: [
          { name: 'Chivalry', icon: FP('Chivalry.png') },
          { name: 'Sanctity', icon: FP('Sanctity.png') },
          { name: 'Piety', icon: FP('Piety.png') },
          { name: 'Augury', icon: FP('Augury.png') },
          { name: 'Rigour', icon: FP('Rigour.png') },
        ],
        source: { region: 'kandarin', detail: 'Unlocked together by completing Knight Waves Training Grounds.' },
      },
    ],
  },
  {
    id: 'ancient',
    parent: {
      name: 'Ancient Curses',
      icons: [{ name: 'Ancient Curses', icon: FP('Turmoil.png') }],
      source: { region: 'global', detail: 'Prayer-book unlock condition unconfirmed as of writing.' },
      softRegion: 'kharidianDesert',
      softNote: "Possibly requires Desert (like Ancient Magicks) - not confirmed, doesn't gate this card.",
    },
    related: [
      {
        name: 'Nex, Angel of Death curses',
        icons: [
          { name: 'Ruination', icon: FP('Ruination.png') },
          { name: 'Desolation', icon: FP('Desolation.png') },
          { name: 'Malevolence', icon: FP('Malevolence.png') },
          { name: 'Affliction', icon: FP('Affliction.png') },
        ],
        source: { region: 'asgarnia', detail: 'Dropped by Nex, Angel of Death.' },
        softRegion: 'kharidianDesert',
        softNote: 'Possibly also requires Desert for base Ancient Curses access - not confirmed.',
      },
      {
        name: 'Seren Prayers',
        icons: [{ name: 'Seren Prayers', icon: FP('Light_Form.png') }],
        source: {
          region: { anyOf: ['tirannwn', 'tier6'] },
          detail: 'Auto-unlocked at League passives Tier 6, or via The Light Within (tirannwn).',
        },
        softRegion: 'kharidianDesert',
        softNote: 'Possibly also requires Desert for base Ancient Curses access - not confirmed.',
      },
    ],
  },
];
