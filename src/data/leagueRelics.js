// League relic powers reference for RS3 Leagues II: Equilibrium. The three
// Tier 1 entries (Endless Harvest/Survivalist/Golden Touch) are quoted
// verbatim from https://runescape.wiki/w/Equilibrium_League/Relics, whose
// own "Unknown Tier" table covers Crystal Grace/Superheated the same way.
// Divine Druid/Transmutation aren't on the wiki at all yet as of writing -
// transcribed straight from Jagex's own "Relic Reveal" promo images instead,
// same as Crystal Grace/Superheated originally were before the wiki caught
// up. None of these four "Unknown Tier" relics have an uploaded icon on the
// wiki (their file link there is still a "please upload" placeholder, where
// they exist at all) - their icons here were cropped from the reveal images
// directly instead (see the icon note below).
//
// Distinct from Archaeology relics (see relics.js, labelled "Arch Relics"
// in the nav): these are picked directly from the league's own relic tree
// and aren't tied to any region.
//
// `tier` groups relics into the "only one relic can be activated per tier"
// constraint the league itself enforces (see
// hooks/useLeagueRelicSelection.js's toggleLeagueRelic). `tier: null` marks
// a relic whose tier isn't known/confirmed yet - those get no pick
// constraint at all instead of a per-tier one, per how little is actually
// known about them.
//
// `effects` is the relic's full list of effect bullets - shown as a list
// rather than one run-on paragraph since several of these (Golden Touch,
// Crystal Grace, Superheated especially) stack up quite a few distinct
// effects. Every bullet is wiki-verbatim EXCEPT Endless Harvest's last one,
// which is an app-added clarification (not something Jagex wrote) - see the
// note on that entry below.
//
// Icon note: Golden Touch's relic icon is `Golden_Touch_(relic).png`, NOT
// `Golden_Touch.png` - that plain filename is already used by the unrelated,
// long-existing Magic ability of the same name (see abilities.js). The wiki
// disambiguates the two with this suffix; using the wrong file would show
// the ability's icon here instead of the relic's. Crystal Grace, Superheated,
// Divine Druid, and Transmutation's icons aren't on the wiki at all yet (see
// above) - cropped directly from Jagex's reveal images instead and saved
// locally, so unlike every other FP() reference here there's no matching
// runescape.wiki file for scripts/download-icons.mjs to ever re-fetch for
// these four specifically.
const FP = (file) => `icons/${file}`;

export const LEAGUE_RELICS = [
  {
    // The Mining resource-upgrade effect below genuinely lets a player reach
    // Luminate/Oricalchite/Light animica ore from common lower-tier ores
    // without visiting any of those ores' normal source regions (confirmed
    // via https://runescape.wiki/w/Polishing#Mining's tier-upgrade table -
    // e.g. mithril ore -> luminite, runite ore -> oricalchite) - so gear.js
    // tags every "Luminate ore"/"Oricalchite ore"/"Light animica ore"
    // labelled region group with `leagueRelic: 'Endless Harvest'` as an
    // alternative to the real regions (see gearAvailability.js/
    // isGearItemAvailable and RegionTags.jsx's ResourcePill). `regionTagNote`
    // (app-added, not a wiki-verbatim `effects` bullet - see LeagueRelicRow.jsx)
    // surfaces that to the player directly on the relic's own row, rendering
    // `tags` as the exact same pill component gear items use for these
    // labels rather than just naming them in prose.
    name: 'Endless Harvest',
    tier: 1,
    effects: [
      'Automatically banks resources obtained for Archaeology, Farming, Fishing, Mining and Woodcutting.',
      'Provides a 10% chance to upgrade your Fishing, Mining, and Woodcutting resources to the next tier.',
      'Tree felling rate is reduced and woodcutting resumes automatically when the tree regrows.',
      'The player will automatically follow fishing spots when they move.',
      'Grants permanently full stamina when mining.',
      'Grants an always-active time sprite when excavating.',
    ],
    regionTagNote: {
      prefix: 'Allows you to obtain',
      tags: ['Luminate ore', 'Oricalchite ore', 'Light animica ore'],
      suffix: 'regardless of region.',
    },
    icon: FP('Endless_Harvest.png'),
  },
  {
    name: 'Survivalist',
    tier: 1,
    effects: [
      'Doubles the resources obtained for Archaeology, Fishing, Mining and Woodcutting.',
      "Grants the Survivalist's Bag, an enhanced storage container capable of holding up to 150 of three different types of logs, ores, or fish at once.",
      'Provides the highest tier tools for Mining (Pickaxe of the Faithful), Fishing (Harpoon of the Pious), and Woodcutting (Hatchet of Devotion), improving efficiency.',
      'Rockertunities and critical swings deal double damage.',
      'Rockertunities immediately provide an ore.',
      'Time sprite focus gain is doubled.',
      'Upon discovering artefacts or lore pages, immediately gain 100% sprite focus.',
      "Upon discovering artefacts, there is a 50% chance they are automatically restored as well as providing the XP that would've been gained from the restoration.",
    ],
    icon: FP('Survivalist.png'),
  },
  {
    name: 'Golden Touch',
    tier: 1,
    effects: [
      'Grants goldenhawk boots, offering passive Agility XP whilst moving, skilling, or using ultimate abilities.',
      'Gives a chance to obtain goldenhawk feathers whilst training Agility or Thieving, which can be converted into Prayer XP or alchemised.',
      'Provides double the base amount of agility course XP and coins when the course is completed, and prevents failures of obstacles and shortcuts.',
      'Gives guaranteed success on all Thieving pickpocketing attempts and gives both tripled and noted loot.',
      'Stalls never deplete and safes can be opened without a cooldown.',
      'Repeated Thieving actions continue automatically.',
      'All coins obtained via Thieving are increased by 100x the usual amount, and chests and safes can reward additional bundles of herb and potion ingredients that are sent directly to your bank.',
    ],
    icon: FP('Golden_Touch_(relic).png'),
  },
  {
    name: 'Crystal Grace',
    tier: null,
    effects: [
      "Grants Seren's crystal tiara, which acts as an omni-tiara and offers unlimited teleports to all runecrafting altars in your unlocked regions.",
      'Unlocks all Magic spells across all spellbooks.',
      'Provides a 5% chance at obtaining crystal essence, which can be used in place of pure and impure essence.',
      'Rune quantity output is increased by 3x for all essence, and level-based rune multipliers are always the maximum regardless of Runecrafting level.',
      'All Necromancy rituals act as having the Multiply, Attraction, and Protection glyphs active without needing them to be drawn, at a level of 200%.',
      'All Necromancy rituals act as having the Speed glyph active without needing it to be drawn, at a level of 50%, which is the speed cap.',
      'Light sources and glyphs do not require ingredients to be created.',
      'Buying a bone or offering it at an altar will provide additional XP equivalent to a dragon bone.',
    ],
    icon: FP('Crystal_Grace.png'),
  },
  {
    name: 'Superheated',
    tier: null,
    effects: [
      'Provides a toggleable option to burn any log automatically when Woodcutting, regardless of your Firemaking level.',
      'Provides a toggleable option to cook any fish automatically when Fishing, regardless of your Cooking level.',
      'Logs are added to bonfires at a rate of 0.6 seconds per log.',
      'Lighting a single incense stick will provide max potency for 60 minutes.',
      'Fire spirits are replaced with blessed fire spirits, which spawn more frequently and can spawn whilst Smithing.',
      'Smelting ores will always provide double the amount of bars, with a 3% chance to gain 50 bars.',
      'The cap on the number of ores able to be smelted at one time is increased to 60.',
      'Fully smithing an item will provide invention materials equivalent to those the player would receive if they disassembled the item.',
      'Grants constant max heat and triple base-progress per strike when smithing.',
      'Completing ceremonial swords provides 5x Smithing XP and 50 bars of the metal you were using.',
      'XP for burial sets is increased by 3x.',
    ],
    icon: FP('Superheated.png'),
  },
  {
    // Transcribed from the reveal image directly (not the wiki - not
    // published there yet), same "Unknown Tier" treatment as Crystal Grace/
    // Superheated above.
    name: 'Divine Druid',
    tier: null,
    effects: [
      "Grants Thera's Summoning Pouch, a pouch that stores grimy herbs and charms, acts as infinite spirit shard and summoning pouches.",
      'Cleaning grimy herbs turns them directly into unfinished potions. (Toggleable)',
      'Grimy herbs/charms can be found frequently when mining, fishing, woodcutting, siphoning or excavating archaeology hotspots.',
      'Grimy herbs are all cleaned at once.',
      '50% chance to create an extra pouch per pouch created, sent directly to the bank.',
      'All charm drops from defeating enemies are increased by 5x.',
      'Summoning familiars which boost skills now boost them by 3x the amount.',
      'Gain a 75% chance to save some ingredients when creating potions.',
      "When crafting pouches, you will also make 10 of the respective familiar's scroll. Sent directly to the bank, no extra XP is awarded.",
      'Always gather enriched memories.',
      'Converting energies and memories together only requires half as many energies, rounded down.',
      'Converting memories has a 10% chance to give a random porter or divine charge. Sent directly to the bank.',
      'Memory strands are gained at x10 rate.',
      'Chronicle fragments give 2x XP (before Leagues multipliers).',
      'Crafting items from divine energies only requires half as many energies, rounded down.',
      'Unlock all Meilyr potion recipes.',
    ],
    icon: FP('Divine_Druid.png'),
  },
  {
    // Same as Divine Druid above.
    name: 'Transmutation',
    tier: null,
    effects: [
      "Grants the Deities' Transmuter.",
      'Alchemical spells transmutes items (Toggleable).',
      'Transmutation spells bank noted products (Toggleable).',
      'Low alchemy and high alchemy spells transform into 2 new spells:',
      'Divine Convergence: downgrades up to 10 of a resource into a lower tier. Divine Divergence: upgrades up to 10 of a resource into a higher tier.',
      "The Deities' Transmuter must be in the inventory to cast these spells.",
      "Using items on the Deities' Transmuter will display what they can turn into.",
      'Both spells have no level requirement. The spell gives 10 Magic XP for each item transmuted (before league XP multipliers).',
      'When cast upon a stack of noted items, these spells will automatically re-cast over time as long as the items are available in the same slot in your inventory.',
    ],
    icon: FP('Transmutation.png'),
  },
];
