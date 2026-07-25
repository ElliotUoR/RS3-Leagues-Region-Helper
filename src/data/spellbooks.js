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
      source: { region: 'fremennikProvince', detail: 'Unlocked via the Fremennik quest line (Lunar Diplomacy).' },
    },
    related: [],
  },
  {
    id: 'ancient',
    parent: {
      name: 'Ancient Magicks',
      icons: [{ name: 'Ancient Magicks', icon: FP('Blood_Barrage.png') }],
      source: { region: 'kharidianDesert', detail: 'Unlocked via Desert Treasure.' },
    },
    related: [
      {
        name: 'Seren spells',
        icons: [{ name: 'Seren spells', icon: FP('Crystal_Mask.png') }],
        source: {
          region: ['kharidianDesert', 'tirannwn'],
          detail: "Requires The Light Within (tirannwn) on top of Ancient Magicks' own Desert Treasure requirement.",
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
        source: { region: 'tirannwn', detail: 'Unlocked via The Light Within.' },
        softRegion: 'kharidianDesert',
        softNote: 'Possibly also requires Desert for base Ancient Curses access - not confirmed.',
      },
    ],
  },
];
