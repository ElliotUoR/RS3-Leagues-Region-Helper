// A transparency page: every judgment call, inferred convention, or
// unconfirmed mapping made while building this site's region data. None of
// these affect gear/ability/relic availability logic themselves - the
// affected items already carry their own region tags (hard or soft) - this
// page just collects the *reasoning* in one place so it's auditable.
//
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
        title: 'The Arc -> Asgarnia',
        detail: 'The Arc (Aminishi/Bonfire Isle content, e.g. Masuta the Ascended, Seiryu) is folded into Asgarnia rather than treated as its own region.',
      },
      {
        title: 'Mazcab -> Kharidian Desert',
        detail: 'Mazcab (Beastmaster Durzag, the Menaphite Pantheon raid) is folded into Kharidian Desert.',
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
        title: 'Troll Country / God Wars Dungeon -> Asgarnia',
        detail: 'The original GWD (Zilyana, Graardor, Kree\'arra, K\'ril) and Troll Country are folded into Asgarnia.',
      },
      {
        title: 'Lost Grove -> Tirannwn',
        detail: 'The Lost Grove (Cinderbane gloves, Erethdor\'s grimoire) is folded into Tirannwn.',
      },
      {
        title: 'Dig sites -> region (Archaeology relics)',
        detail: 'Every Archaeology dig site was individually checked and mapped: Infernal Source and Senntisten -> Misthalin, Everlight -> Morytania, Kharid-et -> Kharidian Desert, Stormguard Citadel and Warforge -> Kandarin, Moonrise (Amberfell) -> Havenhythe, Orthen -> Anachronia, Daemonheim -> Wilderness.',
      },
      {
        title: 'Relic region traced to component origin, not just the dig site',
        detail: "When a relic combines parts from multiple sources (e.g. a ring needing both a dig-site find and a separate boss-dropped component), the region tag traces every component's real origin rather than just the relic's own collection site. Prerequisite relics (e.g. the Hand of Glory ring chain) also pull in whatever regions the earlier relic in the chain needed.",
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
        title: 'Masterwork bow',
        detail: "Needs Morytania (Noxious weapon), Kandarin (Ascension crossbow), Wilderness (Fletch Quest achievement, via primal bars), and Kharidian Desert (acacia logs) simultaneously - 4 distinct optional regions. Unlike Masterwork staff, this one's requirements are now listed explicitly (with normal + resource tags) rather than hidden behind a generic \"not obtainable\" badge, since the exact breakdown is useful to see even though it's still unobtainable in a single run.",
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
        title: 'Quest-point rewards (Vanquish, etc.) treated as global',
        detail: "May's Quest Caravan rewards (150 quest points) aren't gated to any single quest or region, since quest points accumulate across the whole game - tagged global rather than tied to whichever quests happen to be easiest to finish first.",
      },
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
    ],
  },
];
