// A transparency page: every judgment call, inferred convention, or
// unconfirmed mapping made while building this site's region data. None of
// these affect gear/ability/relic availability logic themselves - the
// affected items already carry their own region tags (hard or soft) - this
// page just collects the *reasoning* in one place so it's auditable.
//
// Raw, not-yet-actioned confirmations straight from JMods - called out
// separately (and more prominently) from ASSUMPTION_GROUPS below because
// their implications for region/drop-table data haven't been worked through
// yet. Once digested, anything relevant here should fold into the normal
// groups (or gear/drop-table data) rather than staying listed twice.
export const JMOD_CONFIRMATIONS = [
  {
    title: 'Rex Matriarchs',
    detail: 'Will drop full rings instead of the hearts.',
  },
  {
    title: 'Elite Dungeon 2',
    detail: 'Draconic energy comes with a side of Tectonic energy.',
  },
  {
    title: 'Elite Dungeon 1',
    detail: 'Ancient scales will drop alongside some Sirenic scales.',
  },
  {
    title: 'The Arc -> Asgarnia',
    detail: 'JMods have confirmed the Arc is part of Asgarnia - Masuta the Ascended, Seiryu, and the rest of the Aminishi/Bonfire Isle content are tagged Asgarnia rather than treated as their own region.',
  },
  {
    title: 'Underworld -> Misthalin',
    detail: 'The Underworld (Rasial, Hermod) is folded into Misthalin.',
  },
  {
    title: 'Daemonheim / Dungeoneering content -> Wilderness',
    detail: 'Dungeoneering rewards (Marmaros trader) and Daemonheim-sourced ores/materials (e.g. Primal bars) are tagged Wilderness throughout.',
  },
  {
    title: 'Lost Grove -> Tirannwn',
    detail: 'The Lost Grove (Cinderbane gloves, Erethdor\'s grimoire) is folded into Tirannwn.',
  },
  {
    title: 'Will the Dragon Forge be accessible for breaking down items into Masterwork Essence if I don\'t pick Kandarin?',
    detail: "Yes. In Leagues, you can break down items into Masterwork Essence at any anvil, so you won't need access to the Dragon Forge or the Kandarin region to use this specific feature. Confirmed from the source, so Kandarin is not required for it.",
  },
  {
    title: 'Quest-point rewards (Vanquish, etc.) treated as global',
    detail: 'Since players begin Leagues with a number of Quest Points already unlocked and can earn additional Quest Points through region unlocks, some Quest Caravan rewards have been disabled. Free dice rolls and the Armour of Trials and Vanquish rewards will not be available during Leagues.',
  },
  {
    title: 'Will bosses who drop Defender upgrade items drop the full items?',
    detail: "Instead of needing the pre-requisite item in your inventory, Barrows, Nex, and KK will have a chance to drop the Corruption Sigil, Ancient Emblem, and Perfect Chitin outright. Note: you'll still need a Chaotic Splint from Dungeoneering for the Ancient ones.",
  },
  {
    title: 'How will we hand in Archaeology artefacts to collectors in different regions?',
    detail: 'Some collectors are in different regions compared to their respective dig sites. A special "collector delivery box" has been added at the Archaeology guild campus next to Velucia, letting you hand in artefacts to the unique collectors from there.',
  },
];

// Grouped into categories, each a list of `{ title, detail }` entries.
export const ASSUMPTION_GROUPS = [
  {
    id: 'region-mapping',
    title: 'Region-mapping calls',
    intro: "The game doesn't always draw its zones along Leagues region lines, so some real-world locations had to be folded onto one of the 11 Leagues regions by judgment call.",
    items: [
      {
        title: 'Fort Forinthry -> Misthalin (not Wilderness)',
        detail: "JMods have confirmed that it is in Misthalin, so we are operating under the assumption Vorkath is also in Misthalin.",
      },
      {
        title: 'Mazcab -> Kharidian Desert',
        detail: 'Mazcab (Beastmaster Durzag, the Menaphite Pantheon raid) is folded into Kharidian Desert.',
      },
      {
        title: 'Troll Country / God Wars Dungeon -> Asgarnia',
        detail: 'The original GWD (Zilyana, Graardor, Kree\'arra, K\'ril) and Troll Country are folded into Asgarnia.',
      },
      {
        title: 'Dig sites -> region (Archaeology relics)',
        detail: 'Every Archaeology dig site was individually checked and mapped: Infernal Source and Senntisten -> Misthalin, Everlight -> Morytania, Kharid-et -> Kharidian Desert, Stormguard Citadel and Warforge -> Kandarin, Moonrise (Amberfell) -> Havenhythe, Orthen -> Anachronia, Daemonheim -> Wilderness.',
      },
      {
        title: 'Relic region traced to component origin, not just the dig site',
        detail: "When a relic combines parts from multiple sources (e.g. a ring needing both a dig-site find and a separate boss-dropped component), the region tag traces every component's real origin rather than just the relic's own collection site. Prerequisite relics (e.g. the Hand of Glory ring chain) also pull in whatever regions the earlier relic in the chain needed.",
      },
      {
        title: 'Zanaris -> Misthalin',
        detail: "Jukat's Dragon Sword Shop (Dragon dagger, Dragon 2h sword, Dragon longsword) is reached via the Lumbridge Swamp Caves, so Zanaris is folded into Misthalin - same reasoning as Tormented demons' Ancient Guthix Temple.",
      },
      {
        title: 'Polypore Dungeon -> Morytania',
        detail: "Confirmed via a fan-maintained coordinate-mapped region spreadsheet (not the wiki's own League infobox field). Gates the Ganodermic armour set, Ganodermic gloves/boots, the Polypore staff, and (via Masterwork green cloth's ganodermic flake requirement) the Masterwork hat.",
      },
    ],
  },
  {
    id: 'soft-tags',
    title: 'Soft / unconfirmed region tags currently in use',
    intro: 'These items show a normal (hard, gating) region tag plus a dashed "Possibly X" tag that is purely informational - it never affects whether the item shows as locked.',
    items: [
      {
        title: 'Fort Forinthry items -> "Possibly Wilderness"',
        detail: 'All Dracolich-set gear, Zemouregal\'s nexus, and Invoke Lord of Bones carry this alongside their hard Misthalin tag, since the location is geographically inside the Wilderness even though the League field says Misthalin.',
      },
      {
        title: 'Undead dragon leather -> "Possibly Wilderness"',
        detail: 'Several Masterwork armour pieces (magic robe set, ranged armour set) previously hard-required Wilderness for undead dragon leather. That hasn\'t been independently confirmed as a real gate, so it\'s now a soft tag instead of a hard one.',
      },
      {
        title: 'Ancient Curses prayer-book -> "Possibly Desert"',
        detail: "Ancient Curses' own unlock condition isn't confirmed anywhere the way Ancient Magicks' Desert Treasure requirement is - it's tagged global (non-gating) with a soft Desert hint, carried through to its Nex-drop curses and the Seren Prayers sub-unlock.",
      },
    ],
  },
  {
    id: 'scope',
    title: 'Scope exclusions & modeling conventions',
    intro: 'Deliberate decisions about what this site does and doesn\'t track, and how the data is shaped.',
    items: [
      {
        title: '"World Wakes - Autocompleted" toggle',
        detail: 'The World Wakes will probably be autocompleted. A toggle lets the 4 abilities it grants show as unlocked regardless of whether Kandarin is actually selected.',
      }
    ],
  },
  {
    id: 'impossible',
    title: 'Structurally unobtainable items',
    intro: "A Leagues run only ever unlocks 3 fixed regions (Misthalin, Karamja, Havenhythe) plus up to 3 optional picks - 6 total. Items whose recipe genuinely needs more distinct optional regions than that are flagged as unobtainable in one run, rather than just shown locked like everything else.",
    items: [
      {
        title: 'Masterwork staff',
        detail: 'Needs Wilderness (Abyss runecrafting) plus a fully repaired Noxious weapon plus masterworked ore spanning up to 7 different possible regions depending on route - more distinct optional regions than 3 picks can cover.',
      },
      {
        title: "Always Adze (Seed of the Charyou Tree relic)",
        detail: 'Needs the Warforge dig site (Kandarin) plus lighting beacons across Morytania, Asgarnia, and the Wilderness for the All Fired Up quest - 4 optional regions.',
      },
    ],
  },
  {
    id: 'misc',
    title: 'Other per-item judgment calls',
    intro: 'Smaller individual decisions worth surfacing, mostly cases where a drop source, component, or region choice needed some interpretation.',
    items: [
      {
        title: 'Dual-location bosses resolved to the more useful single region (or an OR-group)',
        detail: 'A few bosses/monsters spawn in two different regions (e.g. Glacors in both the EGWD Glacor Front and the Wilderness; Abyssal Beasts in both Senntisten Asylum and the Wilderness). Where one region alone was judged sufficient, only that one is tagged; where it genuinely could go either way, an OR-group tag is used instead so either region unlocks it.',
      },
      {
        title: 'Combination items: only the real gating component is tagged',
        detail: "For crafted items with multiple ingredients, only the ingredient(s) that actually can't be obtained another way get a region tag - e.g. for one necromancy pouch, only the Croesus-drop component is treated as a hard gate, since the other ingredient is obtainable multiple non-exclusive ways.",
      },
      {
        title: '"Awkward without Fremennik" caveats that stop short of being a hard gate',
        detail: 'A few Masterwork armour recipes also call for dagannoth hide, which the note flags as "awkward to obtain without Fremennik access" - but since it isn\'t strictly impossible without Fremennik, this is left as a caveat in the notes rather than an actual region requirement.',
      },
      {
        title: 'Glacor Cave -> Fremennik Province (user-confirmed)',
        detail: 'Steadfast/Glaiven/Ragefire boots (and their Emberkeen/Flarefrost/Hailfire upgrades) are obtainable from Glacors in the EGWD Glacor Front (misthalin), the Wilderness, or Glacor Cave - the latter folded to Fremennik Province for now',
      },
      {
        title: 'Nightmare gauntlets / Enhanced Nightmare gauntlets -> Kandarin (unconfirmed)',
        detail: 'The wiki has no confirmed League region tag for the Freneskae/World Gate content these drop from. As the world gate, kandarin is assumed - but could require quests from other regions.',
      },
    ],
  },
];
