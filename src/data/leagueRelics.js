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
    // Compact-mode one-liner (app-added, see LeagueRelicRow.jsx's `compact`
    // rendering) - summarises the `effects` bullets below, not wiki text.
    summary: 'Auto-banks resources, upgrades gathered ores/fish/logs, and speeds up Fishing, Mining and Woodcutting.',
    effects: [
      'Automatically banks resources obtained for Archaeology, Farming, Fishing, Mining and Woodcutting.',
      'Provides a 10% chance to upgrade your Fishing, Mining, and Woodcutting resources to the next tier.',
      'Tree felling rate is reduced and woodcutting resumes automatically when the tree regrows.',
      'The player will automatically follow fishing spots when they move.',
      'Grants permanently full stamina when mining.',
      'Grants an always-active time sprite when excavating.',
    ],
    // Eternal magic logs sit one tier above Magic logs in the Woodcutting
    // tier chain (Logs -> ... -> Magic logs -> Eternal magic logs), so the
    // 10% resource-upgrade effect above can produce them too, not just
    // upgraded ores/fish - tagged onto gear.js's matching groups as a second
    // `leagueRelic` alternative alongside Transmutation (see
    // gearAvailability.js's normalizeLeagueRelicList).
    regionTagNote: {
      prefix: 'Allows you to obtain',
      tags: ['Luminate ore', 'Oricalchite ore', 'Light animica ore', 'Eternal magic logs'],
      suffix: 'regardless of region.',
    },
    icon: FP('Endless_Harvest.png'),
  },
  {
    name: 'Survivalist',
    tier: 1,
    summary: 'Doubles Archaeology, Fishing, Mining and Woodcutting yields with top-tier tools and bonus artefact restores.',
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
    // Same regionTagNote mechanism as Endless Harvest above - gear.js tags
    // every "PoF Wool" labelled region group (the necromancy Deathwarden/
    // Deathdealer tiers plus Masterwork magic/ranged armour, all of which
    // need wool sheared at the Player-Owned Farm in Kandarin) with
    // `leagueRelic: 'Golden Touch'` as an alternative to visiting Kandarin.
    name: 'Golden Touch',
    tier: 1,
    summary: 'Guaranteed, tripled Thieving loot with 100x coins, plus passive Agility XP and course bonuses.',
    effects: [
      'Grants goldenhawk boots, offering passive Agility XP whilst moving, skilling, or using ultimate abilities.',
      'Gives a chance to obtain goldenhawk feathers whilst training Agility or Thieving, which can be converted into Prayer XP or alchemised.',
      'Provides double the base amount of agility course XP and coins when the course is completed, and prevents failures of obstacles and shortcuts.',
      'Gives guaranteed success on all Thieving pickpocketing attempts and gives both tripled and noted loot.',
      'Stalls never deplete and safes can be opened without a cooldown.',
      'Repeated Thieving actions continue automatically.',
      'All coins obtained via Thieving are increased by 100x the usual amount, and chests and safes can reward additional bundles of herb and potion ingredients that are sent directly to your bank.',
    ],
    regionTagNote: {
      prefix: 'Allows you to obtain',
      tags: ['PoF Wool'],
      suffix: 'regardless of region.',
    },
    icon: FP('Golden_Touch_(relic).png'),
    // Thieving secondary-ingredient drop table - four separate tier tables,
    // each gated by a *different* combination of Heist-only vs
    // outside-of-Heist availability (per the relic's own Thieving-pickpocket
    // effects above): Tier 1 is Heist-only, Tiers 2-3 drop both inside and
    // outside Heists, Tier 4 is outside-Heist-only. Grimy Herbs is listed
    // first since it's not part of that Tier 1-4 sequence at all - it drops
    // regardless of tier, both inside and outside Heists. The `badge` on
    // each line names its own availability rather than a single shared
    // "Heist" flag, since it genuinely differs line to line.
    //
    // `theme: 'herblore'` opts this table into RelicDropTablePanel's bespoke
    // herblore-ledger rendering branch (see that component) instead of the
    // generic palette-cycled list used by Superheated/Transmutation. `icon`/
    // `clearance` are extra fields that branch reads:
    //   - `icon` is the item image shown in each line's rank medallion
    //     (in place of a roman numeral/star) - these are runescape.wiki
    //     "detail" renders, downscaled to ~160px max side locally (Pillow)
    //     since the originals were 900px-1280px source images destined for a
    //     ~28px circle.
    //   - `clearance` is the machine-readable form of `badge` ('heist' /
    //     'both' / 'outside') that drives the lit/locked HEIST+OUT meter.
    //     `badge` itself is kept verbatim and still rendered as text (as
    //     "Access: <badge>") so the underlying game info isn't only conveyed
    //     via color/icons. The dark-green-to-black tint per line is assigned
    //     positionally in CSS (nth-child), not from a data field.
    //   - `quantity` (e.g. '3-9 at a time') renders next to the category
    //     name, in smaller/lighter text than the name itself.
    dropTable: {
      heading: 'Thieving drop table',
      footerText: 'Thieving drop table',
      theme: 'herblore',
      icon: FP('Thieving_detail.webp'),
      categories: [
        {
          name: 'Grimy Herbs',
          badge: 'Heist + Outside',
          icon: FP('Clean_lantadyme_detail.png'),
          clearance: 'both',
          quantity: '3-9 at a time',
          detail: 'Guam → Fellstalk',
        },
        {
          name: 'Tier 1 Secondaries',
          badge: 'Heist only',
          icon: FP('Congealed_blood_1000_detail.png'),
          clearance: 'heist',
          quantity: '5-15 at a time',
          detail:
            'Primal extract, bottled roar, spark chitin, poison slime, adrenaline crystal, ground wyvern bone and wyvern bonemeal, grenwall spikes, congealed blood, ground Miasma runes, dragonscale dust, phoenix feather, morchella mushroom, tombshroom, timeworn tincture, spider fang',
        },
        {
          name: 'Tier 2 Secondaries',
          badge: 'Heist + Outside',
          icon: FP('Snape_grass_detail.png'),
          clearance: 'both',
          quantity: '5-15 at a time',
          detail:
            "Snape grass, Red spider's eggs, unicorn horn dust, limpwurt roots, white berries, wine of zamorak, crushed birds nest, cactus potato, Yew and Magic roots, Searing ashes, cockatrice egg, rabbit foot, bull horns, wine of saradomin, wine of guthix, Mycelial webbing, poison ivy berries",
        },
        {
          name: 'Tier 3 Secondaries',
          badge: 'Heist + Outside',
          icon: FP('Mort_myre_fungus_detail.webp'),
          clearance: 'both',
          quantity: '5-15 at a time',
          detail:
            "Chinchompa residue, yak milk, yak tuft, zygomite fruit, various PoF sheep wool, regular and enriched timber & calcified fungus, enriched fungal algae, kebbit teeth dust, mort myre mushroom, goat horn dust, toad's legs, spider venom",
        },
        {
          name: 'Tier 4 Secondaries',
          badge: 'Outside only',
          icon: FP('Jangerberries_detail.webp'),
          clearance: 'outside',
          quantity: '5-15 at a time',
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
    summary: 'Transmutes resources up or down a tier via two new alchemy spells, reaching region-locked materials.',
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
      // Distinguishes this from the generic drop-table rendering path in
      // RelicDropTablePanel.jsx - these categories are ordered tier chains
      // (see each category's `detail` below), not flat drop-chance lists, so
      // they get their own alchemy-themed "chain of pills" layout keyed off
      // this literal string.
      theme: 'alchemy',
      // Both directions apply to every chain below - Divine Convergence walks
      // a chain one step toward its base (left) end, Divine Divergence one
      // step toward its refined (right) end. Rendered once as a shared
      // legend rather than repeated per category.
      legend: [
        {
          label: 'Divine Convergence',
          direction: 'down',
          detail: 'steps a resource down toward its base tier',
          icon: FP('Low_Level_Alchemy_icon.webp'),
        },
        {
          label: 'Divine Divergence',
          direction: 'up',
          detail: 'steps a resource up toward its refined tier',
          icon: FP('High_Level_Alchemy_icon.webp'),
        },
      ],
      // `icon` (one per category, added below) is a real item image
      // representative of that category's chain, shown to the left of its
      // name - downscaled locally from the wiki's larger "detail" renders
      // to ~160px max side, same as every other relic's drop-table icons.
      categories: [
        {
          name: 'Hides',
          icon: FP('Cowhide_detail.webp'),
          detail: 'Cowhide → Snakehide → Green Dhide → Blue Dhide → Red Dhide → Black Dhide → Royal Dhide',
        },
        // The single "Air runes through Time runes" span is 15 individual
        // runes, not 1 - spelled out in full below (with Rune/Pure essence)
        // for an accurate 17-tier count, in Runecrafting-level order (Air
        // through Wrath, then Time) - Astral is excluded since it's unlocked
        // via a separate quest-only altar, not this main sequential chain.
        {
          name: 'Runes',
          color: '#4a4a52',
          icon: FP('Blood_rune_detail.png'),
          detail:
            'Rune essence → Pure essence → Air runes → Mind runes → Water runes → Earth runes → Fire runes → Body runes → Cosmic runes → Chaos runes → Nature runes → Law runes → Death runes → Blood runes → Soul runes → Wrath runes → Time runes',
        },
        {
          name: 'Ashes',
          color: '#6e6e78',
          icon: FP('Accursed_ashes_detail.png'),
          detail: 'Impious → Accursed → Infernal → Tortured → Searing',
        },
        {
          name: 'Bones',
          color: '#9a9aa4',
          icon: FP('Reinforced_dragon_bones_detail.png'),
          detail:
            'Bones → Wolf bones → Monkey bones → Bat bones → Big bones → Jogre bones → Zogre bones → Baby dragon bones → Wyvern bones → Dragon bones → Dagannoth bones → Airut bones → Ourg bones → Hardened dragon bones → Dragonkin bones → Dinosaur bones → Frost dragon bones → Reinforced dragon bones',
        },
        {
          name: 'Gems',
          icon: FP('Uncut_ruby_detail.png'),
          detail: 'Opal → Jade → Red topaz → Sapphire → Emerald → Ruby → Diamond → Dragonstone',
        },
        {
          name: 'Compost',
          icon: FP('Ultracompost_detail.png'),
          detail: 'Compost → Supercompost → Ultracompost',
        },
        {
          name: 'Allotment seeds',
          icon: FP('Onion_seed_detail.png'),
          detail:
            'Potato seed → Onion seed → Cabbage seed → Tomato seed → Sweetcorn seed → Strawberry seed → Watermelon seed → Snape grass seed → Sunchoke seed → Fly trap seed',
        },
        {
          name: 'Flower seeds',
          icon: FP('Starbloom_flower_seed_detail.png'),
          detail:
            'Marigold seed → Rosemary seed → Nasturtium seed → Woad seed → Limpwurt seed → White lily seed → Butterfly flower seed → Starbloom flower seed',
        },
        {
          name: 'Hop & vine seeds',
          icon: FP('Godly_grapevine_seed_detail.png'),
          detail:
            'Barley seed → Hammerstone seed → Asgarnian seed → Wendlewick seed → Jute seed → Yanillian seed → Krandorian seed → Wildblood seed → Reed seed → Grapevine seed → Godly grapevine seed',
        },
        {
          name: 'Herb seeds',
          color: '#3ddc63',
          icon: FP('Lantadyme_seed_detail.png'),
          detail:
            'Guam seed → Marrentill seed → Tarromin seed → Harralander seed → Ranarr seed → Spirit weed seed → Toadflax seed → Irit seed → Wergali seed → Avantoe seed → Kwuarm seed → Bloodweed seed → Snapdragon seed → Cadantine seed → Lantadyme seed → Arbuck seed → Dwarf weed seed → Torstol seed → Fellstalk seed',
        },
        {
          name: 'Bush seeds',
          icon: FP('Avocado_seed_detail.png'),
          detail:
            'Redberry seed → Cadavaberry seed → Dwellberry seed → Jangerberry seed → Whiteberry seed → Poison Ivy seed → Barberry seed → Avocado seed → Mango seed → Lychee seed',
        },
        {
          name: 'Tree seeds',
          icon: FP('Magic_seed_detail.png'),
          detail: 'Acorn → Willow seed → Maple seed → Yew seed → Magic seed → Elder seed',
        },
        {
          name: 'Fruit tree seeds',
          icon: FP('Palm_tree_seed_detail.png'),
          detail:
            'Apple tree seed → Banana tree seed → Orange tree seed → Curry tree seed → Pineapple seed → Papaya tree seed → Palm tree seed → Ciku seed → Guarana seed → Carambola seed',
        },
        {
          name: 'Cactus seeds',
          color: '#d9a066',
          icon: FP('Golden_dragonfruit_seed_detail.png'),
          detail: 'Cactus seed → Prickly pear seed → Potato cactus seed → Dragonfruit seed → Golden dragonfruit seed',
        },
        {
          name: 'Mushroom spores',
          icon: FP('Morchella_mushroom_spore_detail.webp'),
          detail: 'Bittercap mushroom spore → Morchella mushroom spore → Stinkshroom spore → Tombshroom spore',
        },
        {
          name: 'Logs',
          icon: FP('Magic_logs_detail.webp'),
          detail:
            'Logs → Oak logs → Willow logs → Teak logs → Maple logs → Acadia logs → Mahogany logs → Yew logs → Magic logs → Elder logs → Eternal magic logs',
        },
        {
          name: 'Ores',
          icon: FP('Light_animica_detail.png'),
          // "Primal ore" isn't a single tier - past Dark animica the chain
          // continues through these 10 elder ores by name (not a loop back
          // to Copper, despite what an earlier "(then cycles)" note here
          // implied).
          detail:
            'Copper ore → Tin ore → Iron ore → Coal → Mithril ore → Adamantite ore → Luminite → Runite ore → Orichalcite ore → Drakolith → Necrite ore → Phasmatite → Banite ore → Light animica → Dark animica → Novite ore → Bathus ore → Marmaros ore → Kratonium ore → Fractite ore → Zephyrium ore → Argonite ore → Katagon ore → Gorgonite ore → Promethium ore',
        },
        {
          name: 'Precious ores & clay',
          icon: FP('Gold_ore_detail.webp'),
          detail: 'Clay → Silver ore → Gold ore → Porcelain clay → Platinum ore',
        },
        {
          name: 'Raw fish',
          color: '#3a8fc7',
          icon: FP('Raw_rocktail_detail.png'),
          detail:
            'Raw crayfish → Raw shrimps → Raw sardine → Raw herring → Raw anchovies → Raw mackerel → Raw trout → Raw cod → Raw pike → Raw salmon → Raw tuna → Raw lobster → Raw bass → Raw swordfish → Raw desert sole → Raw catfish → Raw monkfish → Raw green blubber jellyfish → Raw beltfish → Raw shark → Raw sea turtle → Raw great white shark → Raw manta ray → Raw giant crayfish → Raw cavefish → Raw rocktail → Raw blue blubber jellyfish → Raw sailfish',
        },
        {
          name: 'Divine energy',
          color: '#9b59c9',
          icon: FP('Luminous_energy_detail.webp'),
          detail:
            'Pale energy → Flickering energy → Bright energy → Glowing energy → Sparkling energy → Gleaming energy → Vibrant energy → Lustrous energy → Brilliant energy → Radiant energy → Luminous energy → Incandescent energy',
        },
        {
          name: 'Ghostly ink',
          icon: FP('Powerful_ghostly_ink_detail.webp'),
          detail: 'Basic ghostly ink → Regular ghostly ink → Greater ghostly ink → Powerful ghostly ink',
        },
        {
          name: 'Necroplasm',
          icon: FP('Powerful_necroplasm_detail.webp'),
          detail: 'Weak necroplasm → Lesser necroplasm → Greater necroplasm → Powerful necroplasm',
        },
        {
          name: 'Mementos',
          icon: FP('Powerful_memento_detail.png'),
          detail: 'Broken memento → Fragile memento → Spirit memento → Robust memento → Powerful memento',
        },
        {
          name: 'Ritual candles',
          icon: FP('Greater_ritual_candle_detail.png'),
          detail: 'Basic ritual candle → Regular ritual candle → Greater ritual candle → Greater flaming skull',
        },
        {
          name: 'Necromancy runes',
          icon: FP('Miasma_rune_detail.png'),
          detail: 'Spirit rune → Bone rune → Flesh rune → Miasma rune',
        },
      ],
    },
  },
  {
    name: 'Crystal Grace',
    tier: null,
    summary: 'Unlocks all spellbooks and boosts Runecrafting, Necromancy rituals/glyphs, and bone-offering XP.',
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
    summary: 'Auto-burns logs and cooks fish, doubles smelted bars, and speeds up Smithing with bonus XP.',
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
    // not just those two ends) rather than a fixed list of items. An
    // optional `quantity` (e.g. '5-15 dropped') renders as its own bulleted
    // line under `detail` instead of being folded into that sentence.
    //
    // `theme: 'forge'` opts this table into RelicDropTablePanel.jsx's
    // bespoke forge-themed rendering branch (see the `dropTable.theme ===
    // 'forge'` check there) instead of the generic palette-cycling one every
    // other relic's table still uses. The category order below is already
    // the real drop table's own common-to-rare order, and it happens to
    // trace the classic blacksmith heat-color scale end to end (dull red ->
    // cherry red -> orange -> yellow -> white -> welding heat), so each
    // category's `color` still climbs that same scale rather than being an
    // arbitrary palette pick, even though the named stage tags (Dull Red,
    // Welding Heat, etc.) were dropped as unnecessary - `icon` (a real item
    // image, downscaled locally to ~160px max side from the wiki's much
    // larger "detail" renders) replaces them instead.
    dropTable: {
      heading: 'Blessed Fire Spirits drop table',
      footerText: 'Blessed Fire Spirits drop table',
      theme: 'forge',
      categories: [
        {
          name: 'Stone Spirits',
          detail: 'Copper → Platinum',
          quantity: '5-15 dropped',
          color: '#8f3a1e',
          icon: FP('Drakolith_stone_spirit_detail.png'),
        },
        {
          name: 'Uncut Gems',
          detail: 'Sapphire → Dragonstone',
          quantity: '3-10 dropped',
          color: '#c8421f',
          icon: FP('Uncut_sapphire_detail.png'),
        },
        {
          name: 'Charms',
          detail: 'Gold, Green, Crimson, Blue',
          quantity: '4-12 dropped',
          color: '#dd6a1f',
          icon: FP('Gold_charm_detail.png'),
        },
        {
          name: 'Clues',
          detail: 'Easy → Master, and Box of Clue Scrolls',
          quantity: '1-3, or a Box of Clues',
          color: '#e8a824',
          icon: FP('Sealed_clue_scroll_(hard)_detail.webp'),
        },
        {
          name: 'Flasks',
          detail: 'Crystal & Potion Flasks',
          quantity: '10-20 dropped',
          color: '#f3d35a',
          icon: FP('Crystal_flask_detail.webp'),
        },
        { name: 'Coins', detail: '10k → 100k GP', color: '#fdf1c4', icon: FP('Coins_1000_detail.png') },
      ],
    },
  },
  {
    // Transcribed from the reveal image directly (not the wiki - not
    // published there yet), same "Unknown Tier" treatment as Crystal Grace/
    // Superheated above.
    name: 'Divine Druid',
    tier: null,
    summary: 'Auto-cleans grimy herbs into potions and boosts Summoning familiars, charms and divine energy conversions.',
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
      'Provides a flask and unlocks all Meilyr potion recipes.',
    ],
    icon: FP('Divine_Druid.png'),
  },
  {
    // Transcribed from the reveal image directly (not the wiki - not
    // published there yet), same "Unknown Tier" treatment as Crystal Grace/
    // Superheated/Divine Druid above. Tier is unconfirmed as of writing -
    // update once Jagex states it.
    //
    // Two mechanical typos in the reveal image were corrected here rather
    // than preserved verbatim: "HUNTER LOOT QUANTITY IS INCREASE BY 5X" ->
    // "increased", and "HUNTER MARKS ARE EINCREASED BY 5X" -> "increased".
    // "HUNTER CATCH CHANGE IS 100%" was also read as "chance", the obvious
    // intended word. No wording or meaning was otherwise added.
    //
    // No wiki page exists for this relic yet - icon is a manually-cropped
    // reveal-image icon saved locally, same as Crystal Grace/Superheated/
    // Divine Druid/Transmutation above, so scripts/download-icons.mjs will
    // never re-fetch it from runescape.wiki.
    name: 'Animal Wrangler',
    tier: null,
    summary:
      'Automates Fishing/Hunter banking, boosts Hunter and farm animal yields and rates by up to 20x, guarantees Hunter catches, and occasionally gifts bonus farm animals or Farming materials.',
    effects: [
      'Bank fish automatically when fishing and Hunter loot when hunting. (Toggleable)',
      'When capturing Hunter creatures or fishing, there is a 2% chance to receive a random farm animal, sent to your bank.',
      'When gaining a bonus baby animal from this relic, you can instead receive an Anachronia dinosaur farm animal. (Toggleable)',
      'When catching fish, capturing Hunter creatures, or harvesting farm animals, there is a 33% chance to obtain a random clean herb, or herb, tree, or fruit tree seed sent to your bank.',
      'Farm animals always have 100% stats & never get hungry.',
      'Hunter catch chance is 100%.',
      'Buyers always pay the highest amount of beans for sold animals, regardless of age or disease.',
      'Hunter loot quantity is increased by 5x.',
      'Hunter traps attract creatures faster.',
      'Hunter marks are increased by 5x.',
      'Fishing no longer requires bait, always catch an additional fish.',
      'Anachronia and Havenhythe big game Hunter creatures no longer require bait and are twice as slow to catch you.',
      'Spirit moths give you 10x charms.',
      'Farm animals are 20x more common from their sources.',
    ],
    icon: FP('Animal_Wrangler.png'),
    // Two independent tables, both app-supplied (not on the wiki - this
    // relic isn't confirmed there yet): the 33%-per-roll gathering table
    // from the "clean herb/seed" effect bullet above, and the farm-animal
    // gift table from the "random farm animal" bullet. `theme: 'menagerie'`
    // opts into RelicDropTablePanel.jsx's bespoke nature/field-journal
    // rendering rather than the generic flat-list one every other relic's
    // table uses, since this one genuinely has two separate tables (not one
    // flat list), and one of those (Seeds) is itself three named groups
    // rolled as a single pool rather than three separate sub-tables.
    //
    // Herb/seed tier chain matches the one already verified for
    // Transmutation's own dropTable above (search this file for
    // "Wergali" if that ever needs re-confirming) - Farming's herb line
    // genuinely does run through those less-common names between Torstol
    // and Fellstalk, this isn't a typo.
    dropTable: {
      heading: 'Animal Wrangler drop tables',
      footerText: 'drop tables',
      theme: 'menagerie',
      tables: [
        {
          title: 'Gathering table',
          oddsNote:
            'Equal 33% chance to roll each of the three tables below when catching fish, capturing Hunter creatures, or harvesting farm animals; within a table every drop is equally likely.',
          // `column` groups these into two explicit stacked columns rather
          // than however-many-fit-per-row: Seeds alone in column 1 (it's the
          // tallest, with three subcategories), Clean Herbs + Wood Spirits
          // stacked in column 2 - see MenagerieDropTable/index.css's
          // .drop-table-menagerie-columns.
          categories: [
            {
              name: 'Seeds',
              column: 1,
              quantity: 'varies by seed - see below',
              // These three groups are NOT three separate 33%-each
              // sub-tables - every seed across all three is one flat,
              // equal-chance pool (see the relic's own effects bullet).
              subcategories: [
                {
                  label: 'Herb Seeds',
                  quantity: '1-3',
                  detail:
                    'Guam seed → Marrentill seed → Tarromin seed → Harralander seed → Ranarr seed → Spirit weed seed → Toadflax seed → Irit seed → Wergali seed → Avantoe seed → Kwuarm seed → Bloodweed seed → Snapdragon seed → Cadantine seed → Lantadyme seed → Arbuck seed → Dwarf weed seed → Torstol seed → Fellstalk seed',
                },
                {
                  // Plain text, not pill tags - unlike Manor Farm/Anachronia's
                  // animal lists below, this is a flat unordered list with no
                  // tier meaning, and keeping it as text (matching Clean
                  // Herbs/Wood Spirits' own chains) avoids the pill styling
                  // making this one subcategory visually heavier than its
                  // siblings for no reason.
                  label: 'Tree Seeds',
                  quantity: '1',
                  detail: 'Acorn, Willow seed, Maple seed, Yew seed, Magic seed, Spirit tree seed',
                },
                {
                  label: 'Fruit Tree Seeds',
                  quantity: '1',
                  detail: 'Apple seed, Banana seed, Orange seed, Curry seed, Pineapple seed, Papaya seed, Palm seed, Calquat seed',
                },
              ],
            },
            {
              name: 'Clean Herbs',
              column: 2,
              quantity: '1-3',
              detail:
                'Guam → Marrentill → Tarromin → Harralander → Ranarr → Spirit weed → Toadflax → Irit → Wergali → Avantoe → Kwuarm → Bloodweed → Snapdragon → Cadantine → Lantadyme → Arbuck → Dwarf weed → Torstol → Fellstalk',
            },
            {
              name: 'Wood Spirits',
              column: 2,
              quantity: '5-10',
              detail:
                'Wood spirit → Oak wood spirit → Willow wood spirit → Teak wood spirit → Maple wood spirit → Acadia wood spirit → Mahogany wood spirit → Yew wood spirit → Magic wood spirit → Elder wood spirit → Eternal magic wood spirit',
            },
          ],
        },
        {
          title: 'Farm Animals',
          oddsNote: 'Equal chance between every animal below, regardless of which farm it comes from.',
          categories: [
            {
              name: 'Manor Farm',
              quantity: '1',
              items: ['Rabbit', 'Chicken', 'Chinchompa', 'Sheep', 'Spider', 'Zygomite', 'Cow', 'Yak', 'Dragon'],
            },
            {
              name: 'Anachronia Dinosaur Farm',
              quantity: '1',
              items: [
                'Varanusaur', 'Brutish dinosaur', 'Apoterrasaur', 'Scimitops', 'Asciatops', 'Malletops',
                'Bagrada rex', 'Corbicula rex', 'Pavosaurus rex', 'Frog', 'Salamander', 'Jadinko',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // Transcribed from the reveal image directly (not the wiki - not
    // published there yet), same "Unknown Tier" treatment as Animal Wrangler
    // above. Tier is unconfirmed as of writing - update once Jagex states it.
    //
    // The reveal image groups three "When worn" bonuses under one shared
    // header rather than repeating the phrase three times as three visually
    // separate bullets - reworded here as three parallel "When worn, ..."
    // sentences so each stays its own list item (this file's existing
    // convention, e.g. Divine Druid's "(Toggleable)" bullets above) rather
    // than one run-on sentence or an unlabelled sub-list.
    //
    // Icon is a manually-cropped reveal-image icon, same situation as
    // Animal Wrangler above.
    //
    // TIER 7, and currently the only relic at it - so it is the only thing you
    // can activate in that tier, but nothing forces the pick. Both fall out of
    // the existing one-per-tier rule (see hooks/useLeagueRelicSelection.js):
    // a tier with a single member has exactly one option, and a relic is only
    // ever selected by clicking it.
    name: 'Icyenic Faith',
    tier: 7,
    summary:
      'Grants the Tome of the Icyene: +50 Prayer bonus, 0.2% crit chance and ability damage per Prayer bonus, and makes protection prayers/Deflect curses block 50% more damage while also acting as Soul Split.',
    effects: [
      'Grants you the Tome of the Icyene.',
      'When worn, the Tome of the Icyene provides +50 Prayer bonus.',
      'When worn, gain 0.2% critical strike chance per 1 Prayer bonus you have.',
      'When worn, gain 0.2% base ability damage per 1 Prayer bonus you have.',
      'Protection prayers and Deflect curses block an additional 50% of damage.',
      'Protection prayers and Deflect curses act as though Soul Split is active.',
    ],
    icon: FP('Icyenic_Faith.png'),
  },
  // ------------------------------------------------------------- TIER THREE
  // Transcribed verbatim from Jagex's "Relic Reveal" promo images, same as
  // Divine Druid/Transmutation above - none of these three are on the wiki yet,
  // and their icons were cropped from those images rather than downloaded, so
  // (like the four unknown-tier ones) scripts/download-icons.mjs must never be
  // pointed at them.
  //
  // Filenames were normalised on copy from image/league relics/ and
  // deliberately differ from the source - do not "fix" these back:
  //   Assassin's_Insight_(Equilibrium_League).webp -> Assassins_Insight.webp  (spelling, apostrophe, dropped suffix)
  //   Nature's_Network.webp                         -> Natures_Network.webp   (apostrophe)
  //   Voidwalker_(Equilibrium_League).webp          -> Voidwalker.webp        (dropped suffix)
  // All-lowercase matters: these are served from a Linux container where the
  // filesystem is case-sensitive, unlike the Windows machine they were
  // authored on, so a mixed-case reference would 404 only in production.
  // (Re-cropped 2026-08-01 with properly-cropped .webp source images,
  // replacing the original rougher .png crops - every reference to the old
  // .png filenames was updated alongside the file swap, including the
  // Divine geodes placeholder in Voidwalker's own drop table below, which
  // reuses this same icon.)
  //
  // Tier 3 with no Tier 2 revealed yet, so these render as the second group on
  // the page - both tier-grouping helpers sort numerically and put unknown
  // last, so that ordering falls out without a special case.
  {
    name: 'Voidwalker',
    tier: 3,
    summary:
      'Unlimited teleports from 13 jewellery pieces, plus Void Shards that each open into a clue scroll and a piece of loot.',
    effects: [
      'Grants an Abyssal Conduit, a powerful item that provides unlimited teleports from the following jewelry pieces:',
      "The Amulet of glory, Combat bracelet, Delver's anklet, Dig site pendant, Enlightened amulet, Ferocious ring, Games necklace, Ring of duelling, Ring of respawn, Ring of slaying, Ring of wealth, Skills necklace, and Traveller's necklace.",
      'Occasionally gain Void Shards. Void Shards can be opened to gain one clue scroll and a piece of the following loot:',
      'Summoning pouches, Ancient summoning pouches, Divine energy, Divine charge, Invention materials, Dragon equipment, Goldenhawk feathers, Divine geodes, Blessed fire spirits, or Crystal essence.',
    ],
    // Void Shard contents. Structurally unlike the other three drop tables:
    // this one is a FLAT, EQUAL-WEIGHTED roll - eight slots, 1/8 each - rather
    // than a tiered ladder (Superheated), a chain (Transmutation) or a
    // clearance ledger (Golden Touch). The 'void' theme renders it as eight
    // facets of a shard so the equal odds are the thing you see first, since
    // that is the only number that matters when reading it.
    //
    // Three of the slots hand out materials that other relics also produce
    // (goldenhawk feathers, crystal essence, blessed fire spirits) - but you do
    // NOT need those relics to roll them here, so they are described as items
    // rather than as conditions.
    dropTable: {
      heading: 'Void Shard',
      footerText: 'Void Shard drop table',
      theme: 'void',
      standfirst:
        'Opening a Void Shard always gives one clue scroll, plus exactly one of the eight slots below. Every slot is an equal 1/8.',
      odds: '1/8',
      categories: [
        {
          name: 'Summoning pouches',
          icon: 'icons/voidshard/Binding_contract_ripper_demon.webp',
          detail:
            'Every ancient Summoning familiar pouch, and almost all standard pouches - only a handful of the least useful familiars are missing. 1-5 dropped.',
          note: 'Voidwalker can be used to access Ancient summoning without Kandarin.',
        },
        {
          name: 'Divine energy & charge',
          icon: 'icons/voidshard/Divine_charge.png',
          detail:
            'Core energies from Pale all the way to Incandescent, plus Divine Charge. 50/50 chance of either - 150-300 Energy, or 10-20 Charges.',
        },
        {
          name: 'Dragon equipment',
          icon: 'icons/Dragon_hatchet.png',
          detail:
            '2h crossbow, 2h sword, arrow, arrowheads, battleaxe, battlestaff, claws, dagger, dart, halberd, hatchet, longsword, mace, pickaxe, scimitar, spear, throwing axe, warhammer, boots, chainbody, full helm, helm, platebody, platelegs, plateskirt, kiteshield, sq shield. Always 1 item.',
          note: 'Same table as the Motherlode Maw. Includes the dragon hatchet and pickaxe, which is otherwise a Fremennik drop.',
        },
        {
          name: 'Goldenhawk feathers',
          icon: 'icons/voidshard/Golden_feather.png',
          detail:
            'Convertible into Prayer XP, or alchemised. Normally a Golden Touch drop from Agility and Thieving. 1-3 dropped.',
        },
        {
          name: 'Crystal essence',
          icon: 'icons/voidshard/Crystalline_essence.png',
          detail: 'The Crystal Grace rune/pure essence stackable subtitute. 3-10 dropped.',
        },
        {
          name: 'Blessed fire spirits',
          icon: 'icons/voidshard/Fire_spirit.webp',
          detail: 'Gain access to the Superheated fire spirit table',
        },
        {
          name: 'Invention components',
          icon: 'icons/voidshard/Precious_components.webp',
          detail: 'Quantities not revealed yet.',
        },
        {
          name: 'Divine geodes',
          icon: 'icons/Voidwalker.webp',
          detail: 'Contents not revealed yet. 1-5 dropped.',
          hidden: true,
        },
      ],
    },
    icon: FP('Voidwalker.webp'),
  },
  {
    name: "Nature's Network",
    tier: 3,
    summary:
      'Fairy ring, spirit tree and farming patch teleports; instant growth and harvest, noted produce, free ultracompost, and 25% seeds saved.',
    effects: [
      'Grants a Fairy Mushroom, which allows you to teleport to any fairy ring, spirit tree, or farming patch.',
      'Patches are harvested instantly and produce is automatically noted.',
      'Seeds planted instantly grow to full.',
      'All patches are always treated with ultracompost.',
      '25% chance to save planted seeds when sowing.',
      'Herb seeds are planted at max amount, with only the base amount of seeds used.',
    ],
    icon: FP('Natures_Network.webp'),
  },
  {
    name: "Assassin's Insight",
    tier: 3,
    summary:
      'Slayer master and dungeon teleports, a choice of two assignments, free prefer/block, corrupted slayer mask effects, and 5x elite spawns and XP.',
    effects: [
      'Grants the Skull of Slaying, which allows you to teleport to any slayer master and a range of slayer dungeons and monsters.',
      'When assigned a slayer assignment, you will be able to choose between two assignments.',
      'Choose between minimum or maximum amounts when requesting a new slayer assignment.',
      'Monsters can be added to the prefer and block lists for free.',
      'You have the effects of the corrupted slayer mask without needing to wear it.',
      'Elite slayer monsters are 5x more likely to spawn.',
      'Elite slayer monsters give 5x slayer XP when defeated (before league modifiers).',
      "Monsters are captured into Ushabti's 100% of the time.",
    ],
    icon: FP('Assassins_Insight.webp'),
  },
];

// Transcribed verbatim from Jagex's "Relic Passives Revealed" promo image -
// a SEPARATE progression track from LEAGUE_RELICS above, same relationship
// BLESSING_PASSIVE_TIERS has to BLESSING_TIERS (see data/blessings.js). All
// passives for a tier unlock regardless of which relic you actually pick in
// that tier - the promo image's own header line says so explicitly. Only
// tiers 1, 2, 4 and 6 have a headline XP multiplier reward; 3, 5 and 7 are
// plain passive-only tiers (not a data gap - the reveal image itself has no
// multiplier box under those columns).
export const RELIC_PASSIVE_TIERS = [
  {
    tier: 'Tier 1',
    xpMultiplier: '5X XP Multiplier',
    passives: [
      'All farming crops grow 5x faster',
      'Run energy rapidly replenishes to 100%',
      'The Archaeology Guild shop is fully available',
      'Receive 5x as many Chronotes when handing in artefacts and collections',
      'Souls earned from Necromancy rituals are increased by +400%',
      'Bosses respawn faster on all speed presets',
      'The Invention tutorial is auto-completed',
    ],
  },
  {
    tier: 'Tier 2',
    xpMultiplier: '8X XP Multiplier',
    passives: [
      'Thaler quantity earned is 10x',
      'Rare items are 2x more common',
      'Slayer points and Reaper points are multiplied x5 when completing tasks',
      'Heart of Gielinor, Menaphos, and Farming reputation gain is multiplied by 4x',
      'Archaeology lore pages are 30% more common',
    ],
  },
  {
    tier: 'Tier 3',
    xpMultiplier: null,
    passives: [
      "Where applicable skillcape perks, except Defence, are passive as long as you have level 99 or 120 in the skill",
      "When defeating enemies there's a 10% chance to obtain 8x common or uncommon invention materials",
    ],
  },
  {
    tier: 'Tier 4',
    xpMultiplier: '12X XP Multiplier',
    passives: [
      'Rare items are 4x more common',
      'Unlock all items on the toolbelt',
      "When defeating enemies there's a 20% chance to obtain 12x common or uncommon invention materials",
      'Killcount is no longer required to enter God Wars Dungeon encounters',
      'Killcount is no longer required to enter Heart of Gielinor encounters',
      'Ascension keystones are no longer required to fight the Legiones',
      'Keys to the Crossing are no longer required to fight the Magister',
    ],
  },
  {
    tier: 'Tier 5',
    xpMultiplier: null,
    passives: [
      'Rare items are 6x more common',
      'You can swap spellbooks and prayers at the League Sage',
      'When getting assigned a Soul Reaper task from Death, you will be able to choose which task you want',
      "When defeating enemies, there's a 20% chance to obtain 20x common or uncommon invention materials",
      'Augmented items gain experience 4x faster',
    ],
  },
  {
    tier: 'Tier 6',
    xpMultiplier: '16X XP Multiplier',
    passives: ['Rare items are 8x more common', 'All Seren spells and prayers are unlocked'],
  },
  {
    tier: 'Tier 7',
    xpMultiplier: null,
    passives: ["Rare items are 10x more common", "The 'Advance Time' spell can be cast without limit"],
  },
];
