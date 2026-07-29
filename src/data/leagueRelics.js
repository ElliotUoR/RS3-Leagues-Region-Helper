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
    // Thieving secondary-ingredient drop table - four separate tier tables,
    // each gated by a *different* combination of Heist-only vs
    // outside-of-Heist availability (per the relic's own Thieving-pickpocket
    // effects above): Tier 1 is Heist-only, Tiers 2-3 drop both inside and
    // outside Heists, Tier 4 is outside-Heist-only. The `badge` on each line
    // names its own availability rather than a single shared "Heist" flag,
    // since it genuinely differs tier to tier.
    dropTable: {
      heading: 'Thieving drop table',
      footerText: 'Thieving drop table',
      categories: [
        {
          name: 'Tier 1 Secondaries',
          badge: 'Heist only',
          detail:
            'Primal extract, bottled roar, spark chitin, poison slime, adrenaline crystal, ground wyvern bone and wyvern bonemeal, grenwall spikes, congealed blood, ground Miasma runes, dragonscale dust, phoenix feather, morchella mushroom, tombshroom, timeworn tincture, spider fang',
        },
        {
          name: 'Tier 2 Secondaries',
          badge: 'Heist + Outside',
          detail:
            "Snape grass, Red spider's eggs, unicorn horn dust, limpwurt roots, white berries, wine of zamorak, crushed birds nest, cactus potato, Yew and Magic roots, Searing ashes, cockatrice egg, rabbit foot, bull horns, wine of saradomin, wine of guthix, Mycelial webbing, poison ivy berries",
        },
        {
          name: 'Tier 3 Secondaries',
          badge: 'Heist + Outside',
          detail:
            "Chinchompa residue, yak milk, yak tuft, zygomite fruit, regular and enriched timber & calcified fungus, enriched fungal algae, kebbit teeth dust, mort myre mushroom, goat horn dust, toad's legs, spider venom",
        },
        {
          name: 'Tier 4 Secondaries',
          badge: 'Outside only',
          detail:
            'Eye of newt, jangerberries, Frog spawn, Papaya, Swordfish, Wimpy feather, redberries, ground mud runes, Nail beast nails, bull horns, Bear fur, cadava berries, chocolate dust, white, red, yellow and black beads',
        },
      ],
    },
  },
  {
    // Transcribed from the reveal image directly (not the wiki - not
    // published there yet), same "Unknown Tier" treatment as Crystal Grace/
    // Superheated/Divine Druid below. Kept first among the Unknown Tier
    // relics since its resource-conversion effect touches the widest range
    // of other gear.js entries (see regionTagNote below).
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
    // App-added (not a wiki-verbatim effects bullet), same treatment as
    // Endless Harvest's regionTagNote above - Divine Convergence/Divergence
    // can transmute a resource up or down a tier, which genuinely lets you
    // reach several region-locked materials without visiting their normal
    // source regions. Tagged onto the matching gear.js groups as an
    // additional `leagueRelic: 'Transmutation'` alternative (see
    // gearAvailability.js's normalizeLeagueRelicList) - Luminate/Oricalchite/
    // Light animica ore already had Endless Harvest as an alternative, this
    // just adds Transmutation as a second one; Eternal magic logs/Primal ore/
    // Acadia logs are new tags that previously had no non-region path at all.
    regionTagNote: {
      prefix: 'Gives access to the following region restricted items (needed for PvM gear):',
      tags: ['Luminate ore', 'Oricalchite ore', 'Light animica ore', 'Eternal magic logs', 'Primal ore', 'Acadia logs'],
      suffix: '',
    },
    icon: FP('Transmutation.png'),
    // Not a drop table - Divine Convergence/Divergence transmute a resource
    // one tier down/up a fixed progression chain (see effects above), so
    // each line below is that chain, not a random-roll loot list. Deliberately
    // titled "tables" throughout, never "drop table".
    dropTable: {
      heading: 'Transmutation tables',
      footerText: 'Transmutation tables',
      categories: [
        { name: 'Hides', detail: 'Cowhide → Snakehide → Green Dhide → Blue Dhide → Red Dhide → Black Dhide → Royal Dhide' },
        { name: 'Runes', detail: 'Rune essence → Pure essence → Air runes through Time runes' },
        { name: 'Ashes', detail: 'Impious → Accursed → Infernal → Tortured → Searing' },
        {
          name: 'Bones',
          detail:
            'Bones → Wolf bones → Monkey bones → Bat bones → Big bones → Jogre bones → Zogre bones → Baby dragon bones → Wyvern bones → Dragon bones → Dagannoth bones → Airut bones → Ourg bones → Hardened dragon bones → Dragonkin bones → Dinosaur bones → Frost dragon bones → Reinforced dragon bones',
        },
        { name: 'Gems', detail: 'Opal → Dragonstone' },
        { name: 'Compost', detail: 'Compost → Supercompost → Ultracompost' },
        {
          name: 'Allotment seeds',
          detail:
            'Potato seed → Onion seed → Cabbage seed → Tomato seed → Sweetcorn seed → Strawberry seed → Watermelon seed → Snape grass seed → Sunchoke seed → Fly trap seed',
        },
        {
          name: 'Flower seeds',
          detail:
            'Marigold seed → Rosemary seed → Nasturtium seed → Woad seed → Limpwurt seed → White lily seed → Butterfly flower seed → Starbloom flower seed',
        },
        {
          name: 'Hop & vine seeds',
          detail:
            'Barley seed → Hammerstone seed → Asgarnian seed → Wendlewick seed → Jute seed → Yanillian seed → Krandorian seed → Wildblood seed → Reed seed → Grapevine seed → Godly grapevine seed',
        },
        {
          name: 'Herb seeds',
          detail:
            'Guam seed → Marrentill seed → Tarromin seed → Harralander seed → Ranarr seed → Spirit weed seed → Toadflax seed → Irit seed → Wergali seed → Avantoe seed → Kwuarm seed → Bloodweed seed → Snapdragon seed → Cadantine seed → Lantadyme seed → Arbuck seed → Dwarf weed seed → Torstol seed → Fellstalk seed',
        },
        {
          name: 'Bush seeds',
          detail:
            'Redberry seed → Cadavaberry seed → Dwellberry seed → Jangerberry seed → Whiteberry seed → Poison Ivy seed → Barberry seed → Avocado seed → Mango seed → Lychee seed',
        },
        { name: 'Tree seeds', detail: 'Acorn → Willow seed → Maple seed → Yew seed → Magic seed → Elder seed' },
        {
          name: 'Fruit tree seeds',
          detail:
            'Apple tree seed → Banana tree seed → Orange tree seed → Curry tree seed → Pineapple seed → Papaya tree seed → Palm tree seed → Ciku seed → Guarana seed → Carambola seed',
        },
        {
          name: 'Cactus seeds',
          detail: 'Cactus seed → Prickly pear seed → Potato cactus seed → Dragonfruit seed → Golden dragonfruit seed',
        },
        {
          name: 'Mushroom spores',
          detail: 'Bittercap mushroom spore → Morchella mushroom spore → Stinkshroom spore → Tombshroom spore',
        },
        {
          name: 'Logs',
          detail:
            'Logs → Oak logs → Willow logs → Teak logs → Maple logs → Acadia logs → Mahogany logs → Yew logs → Magic logs → Elder logs → Eternal magic logs',
        },
        {
          name: 'Ores',
          detail:
            'Copper ore → Tin ore → Iron ore → Coal → Mithril ore → Adamantite ore → Luminite → Runite ore → Orichalcite ore → Drakolith → Necrite ore → Phasmatite → Banite ore → Light animica → Dark animica → Primal ore (then cycles)',
        },
        { name: 'Precious ores & clay', detail: 'Clay → Silver ore → Gold ore → Porcelain clay → Platinum ore' },
        {
          name: 'Raw fish',
          detail:
            'Raw crayfish → Raw shrimps → Raw sardine → Raw herring → Raw anchovies → Raw mackerel → Raw trout → Raw cod → Raw pike → Raw salmon → Raw tuna → Raw lobster → Raw bass → Raw swordfish → Raw desert sole → Raw catfish → Raw monkfish → Raw green blubber jellyfish → Raw beltfish → Raw shark → Raw sea turtle → Raw great white shark → Raw manta ray → Raw giant crayfish → Raw cavefish → Raw rocktail → Raw blue blubber jellyfish → Raw sailfish',
        },
        {
          name: 'Divine energy',
          detail:
            'Pale energy → Flickering energy → Bright energy → Glowing energy → Sparkling energy → Gleaming energy → Vibrant energy → Lustrous energy → Brilliant energy → Radiant energy → Luminous energy → Incandescent energy',
        },
        {
          name: 'Ghostly ink',
          detail: 'Basic ghostly ink → Regular ghostly ink → Greater ghostly ink → Powerful ghostly ink',
        },
        {
          name: 'Necroplasm',
          detail: 'Weak necroplasm → Lesser necroplasm → Greater necroplasm → Powerful necroplasm',
        },
        {
          name: 'Mementos',
          detail: 'Broken memento → Fragile memento → Spirit memento → Robust memento → Powerful memento',
        },
        {
          name: 'Ritual candles',
          detail: 'Basic ritual candle → Regular ritual candle → Greater ritual candle → Greater flaming skull',
        },
        { name: 'Necromancy runes', detail: 'Spirit rune → Bone rune → Flesh rune → Miasma rune' },
      ],
    },
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
    // Blessed Fire Spirits (see effects above - Fire spirits are replaced by
    // these while Superheated is active) drop table - each entry below is a
    // range (e.g. Stone Spirits drops anywhere from Copper up to Platinum,
    // not just those two ends) rather than a fixed list of items.
    //
    // `theme: 'forge'` opts this table into RelicDropTablePanel.jsx's
    // bespoke forge-themed rendering branch (see the `dropTable.theme ===
    // 'forge'` check there) instead of the generic palette-cycling one every
    // other relic's table still uses. The category order below is already
    // the real drop table's own common-to-rare order, and it happens to
    // trace the classic blacksmith heat-color scale end to end (dull red ->
    // cherry red -> orange -> yellow -> white -> welding heat), so each
    // category's `stage` name and `color` climbs that same scale rather than
    // being an arbitrary palette pick - Coins landing on "Welding Heat" as
    // near-white/molten gold is the intentional payoff at the end of the
    // list, not a coincidence.
    dropTable: {
      heading: 'Blessed Fire Spirits drop table',
      footerText: 'Blessed Fire Spirits drop table',
      theme: 'forge',
      categories: [
        { name: 'Stone Spirits', detail: 'Copper → Platinum', stage: 'Dull Red', color: '#8f3a1e' },
        { name: 'Uncut Gems', detail: 'Sapphire → Dragonstone', stage: 'Cherry Red', color: '#c8421f' },
        { name: 'Charms', detail: 'Gold, Green, Crimson, Blue', stage: 'Orange Heat', color: '#dd6a1f' },
        {
          name: 'Clues',
          detail: 'Easy → Master, and Box of Clue Scrolls',
          stage: 'Bright Yellow',
          color: '#e8a824',
        },
        { name: 'Flasks', detail: 'Crystal & Potion Flasks', stage: 'White Heat', color: '#f3d35a' },
        { name: 'Coins', detail: '10k → 100k GP', stage: 'Welding Heat', color: '#fdf1c4' },
      ],
    },
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
];
