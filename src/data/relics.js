// Archaeology relic powers reference for RS3 Leagues II: Equilibrium.
// See https://runescape.wiki/w/Relics for the full list this is derived from.
//
// Each entry's primary `name` is the *relic power* (the permanent passive
// buff granted at the mysterious monolith, e.g. "Font of Life"), with
// `relicName` as the underlying artefact/relic that grants it (e.g. "The
// Mortal Cup") shown as a subtitle - per the naming the relic is commonly
// known by is the artefact, but what you actually see and use in-game is the
// power.
//
// `category` groups relics into the tab split requested: 'combat' (affects
// combat stats/LP/adrenaline/abilities), 'skilling' (affects a non-combat
// skill), or 'misc' (utility/economy/luck effects that aren't tied to a
// specific skill or combat).
//
// `effect` is the relic power's actual in-game description, quoted verbatim
// from the wiki's relic power infobox - shown in its own colour in the UI to
// distinguish "what it does" from "how you unlock it" (`source.detail`).
//
// `source.region` follows the exact same conventions as gear.js/abilities.js
// and is read by the same gearAvailability.js helpers. Regions were traced
// past the relic's own collection/dig-site to each *component's* actual
// origin where a relic combines parts from multiple sources (e.g. Ring of
// Solomon needs both the Stormguard Citadel dig site AND Armadyl's Tower in
// Asgarnia) - several relics also chain through an earlier relic's
// prerequisite (the four Hand of Glory luck rings must be made in order),
// which pulls in that earlier relic's region(s) too. Misthalin/Karamja/
// Havenhythe sources are still listed even though those regions are always
// unlocked (fixed), for an accurate/complete tag display.
//
// `{ anyOf: [region], artefact: true, note }` marks a region that's only
// required to physically excavate a dig site's *artefacts* - since those
// materials can be gathered remotely via the Archaeology Research system
// (Exam Centre, spending chronotes) without visiting the dig site itself,
// these render as a distinct "Artefacts: X" tag and get skipped entirely
// when the Relics page's "Artefacts are not region-locked" toggle is on.
// A relic's actual collector/hand-in NPC location, and any non-Archaeology
// component (a boss drop, a quest reward, a site-bound puzzle/altar/statue
// interaction rather than a delegable collection), still gates as a normal
// hard region regardless of that toggle - see gearAvailability.js for the
// full mechanism (mirrors the existing Abilities page "Ignore component
// requirements" toggle/`component: true` pattern).
//
// Dig site -> region mapping used throughout (confirmed per-site on
// runescape.wiki): Infernal Source -> misthalin, Everlight -> morytania,
// Kharid-et -> kharidianDesert, Senntisten -> misthalin, Stormguard Citadel
// -> kandarin, Warforge -> kandarin (South Feldip Hills, folded per the
// Feldip Hills -> kandarin convention in regions.js), Moonrise -> havenhythe
// (Amberfell), Orthen -> anachronia, Daemonheim -> wilderness.
const FP = (file) => `icons/${file}`;

export const RELIC_CATEGORIES = ['combat', 'skilling', 'misc'];

export const RELICS = [
  {
    name: 'Font of Life',
    relicName: 'The Mortal Cup',
    category: 'combat',
    effect: "Increases the player's maximum life points by 500.",
    icon: FP('Font_of_Life.png'),
    source: { type: 'skilling', detail: 'Obtained from the Archaeology tutorial', region: 'global' },
  },
  {
    name: 'Ring of Luck',
    relicName: 'Hand of Glory (Ring of Luck)',
    category: 'misc',
    effect: 'Players will always gain the effect of tier 1 luck.',
    icon: FP('Ring_of_Luck_(relic_power).png'),
    source: {
      type: 'skilling',
      detail:
        'Combine a hand of glory (Dungeon of Disorder, Infernal Source Dig Site) with a Ring of Luck',
      region: 'misthalin',
    },
  },
  {
    name: 'Unexpected Diplomacy',
    relicName: 'Seal of the Praefectus Praetorio',
    category: 'skilling',
    effect: 'Adds 10% to all reputation earned at the Heart of Gielinor, the Farming Guild, Menaphos and Mazcab.',
    icon: FP('Unexpected_Diplomacy.png'),
    source: {
      type: 'skilling',
      detail: 'Complete the Zarosian I collection (Kharid-et Dig Site), handed in to Soran, Emissary of Zaros, in south-west Varrock',
      region: [
        'misthalin',
        { anyOf: ['kharidianDesert'], artefact: true, note: 'Region required to obtain artefacts - needs the Kharid-et dig site materials for the Zarosian I collection.' },
      ],
    },
  },
  {
    name: 'Pouch Protector',
    relicName: 'Threads of Fate',
    wikiName: 'Threads of Fate (relic)',
    category: 'skilling',
    effect: 'Runecrafting pouches will no longer degrade when used, including massive pouches.',
    icon: FP('Pouch_Protector.png'),
    source: {
      type: 'combination',
      detail: 'Combine an abyssal thread (Zamorakian I collection, Infernal Source Dig Site) with a giant pouch, handed in to Isaura in the Black Knights\' Base, Taverley Dungeon',
      region: [
        'asgarnia',
        { anyOf: ['misthalin'], artefact: true, note: 'Region required to obtain artefacts - needs the Infernal Source dig site materials for the Zamorakian I collection.' },
      ],
    },
  },
  {
    name: 'Ring of Wealth',
    relicName: 'Hand of Glory (Ring of Wealth)',
    category: 'misc',
    effect: 'Players will always gain the effect of tier 2 luck.',
    icon: FP('Ring_of_Wealth_(relic_power).png'),
    source: {
      type: 'combination',
      detail:
        'Combine a hand of glory (Statue of Mesomedes, Everlight Dig Site) with a Ring of Wealth (4), having previously made Ring of Luck',
      region: ['morytania', 'misthalin'],
    },
  },
  {
    name: "Berserker's Fury",
    relicName: "Dharok's Memento",
    category: 'combat',
    effect:
      "Players will deal up to +5.5% damage with all styles the lower the player's current life points are beneath their maximum level.",
    icon: FP('Berserker%27s_Fury.png'),
    source: {
      type: 'combination',
      detail:
        'Combine a lock of hair (Saradomin I collection, Everlight Dig Site) with an amulet of the forsaken (Barrows)',
      region: ['morytania', 'asgarnia'],
      note: 'The Saradomin I collection is handed in to Sir Atcha at the White Knights\' Castle, Falador.',
    },
  },
  {
    name: 'Ring of Fortune',
    relicName: 'Hand of Glory (Ring of Fortune)',
    category: 'misc',
    effect: 'Players will always gain the effect of tier 3 luck.',
    icon: FP('Ring_of_Fortune_(relic_power).png'),
    source: {
      type: 'combination',
      detail:
        'Combine a hand of glory (Orcus altar, Kharid-et Dig Site) with a Ring of Fortune, having previously made Ring of Wealth',
      region: ['kharidianDesert', 'morytania', 'misthalin'],
    },
  },
  {
    name: 'Hungry Like the Wolf',
    relicName: 'Tear of Inanna',
    category: 'combat',
    effect: 'Every piece of food will restore an additional 100 life points. Consuming food will no longer cost adrenaline.',
    icon: FP('Hungry_Like_the_Wolf.png'),
    source: {
      type: 'combination',
      detail:
        "Combine a Guardian's tear (Guthixian I collection, Moonrise Dig Site) with expensive spices (Let Them Eat Pie quest reward, Taverley/Burthorpe), handed in to Artiefax in Taverley",
      region: [
        'asgarnia',
        { anyOf: ['havenhythe'], artefact: true, note: 'Region required to obtain artefacts - needs the Moonrise (Amberfell) dig site materials for the Guthixian I collection.' },
      ],
    },
  },
  {
    name: "Shadow's Grace",
    relicName: "Aurelius's Mask",
    category: 'combat',
    effect: 'Reduces the cooldown of Surge, Escape, Bladed Dive and Barge by 50%.',
    icon: FP('Shadow%27s_Grace.png'),
    source: {
      type: 'skilling',
      detail: 'Solve the Secrets of the Inquisition mystery (funerary urns, Senntisten Dig Site)',
      region: 'misthalin',
    },
  },
  {
    name: 'Nexus Mod',
    relicName: 'Abyssal Gatestone',
    category: 'misc',
    effect: 'Players will always arrive at the centre of the Abyss when entering.',
    icon: FP('Nexus_Mod.png'),
    source: {
      type: 'combination',
      detail:
        'Combine a chaos star (Shakroth remains, Infernal Source Dig Site) with a chaotic gatestone (Daemonheim Rewards shop, 60 Dungeoneering)',
      region: [
        'wilderness',
        { anyOf: ['misthalin'], artefact: true, note: 'Region required to obtain artefacts - needs the Infernal Source dig site chaos star.' },
      ],
    },
  },
  {
    name: 'Blessing of Het',
    relicName: 'Eye of Het (broken)',
    category: 'combat',
    effect: 'Food and potions heal 10% more life points.',
    icon: FP('Blessing_of_Het.png'),
    source: { type: 'quest', detail: 'Eye of Het II quest reward (Het’s Oasis)', region: 'kharidianDesert' },
  },
  {
    name: 'Endurance',
    relicName: "Oo'glog Wellspring",
    category: 'misc',
    effect: 'Infinite run energy.',
    icon: FP('Endurance.png'),
    source: {
      type: 'combination',
      detail:
        'Complete the Smoky Fings collection (artefacts from Infernal Source, Everlight, and Kharid-et Dig Sites) and hand it in to Chief Tess in Oo\'glog',
      region: [
        'kandarin',
        { anyOf: ['morytania'], artefact: true, note: 'Region required to obtain artefacts - needs the Everlight dig site materials for the Smoky Fings collection.' },
        { anyOf: ['kharidianDesert'], artefact: true, note: 'Region required to obtain artefacts - needs the Kharid-et dig site materials for the Smoky Fings collection.' },
      ],
    },
  },
  {
    name: 'Pharm Ecology',
    relicName: "Queen Mab's Moonstone",
    category: 'skilling',
    effect: "Player's herb patches and mushroom patches will no longer become diseased.",
    icon: FP('Pharm_Ecology.png'),
    source: {
      type: 'combination',
      detail:
        "Give King Oberon's moonshroom spores (Armadylean I collection, Stormguard Citadel Dig Site) to the Fairy Queen in Zanaris",
      region: [
        'misthalin',
        { anyOf: ['kandarin'], artefact: true, note: 'Region required to obtain artefacts - needs the Stormguard Citadel dig site materials for the Armadylean I collection.' },
      ],
    },
  },
  {
    name: 'Death Ward',
    relicName: 'Ring of Solomon',
    category: 'combat',
    effect: 'Players receive reduced damage at certain life points thresholds.',
    icon: FP('Death_Ward.png'),
    source: {
      type: 'combination',
      detail:
        "Give an aviansie dreamcoat (tailory debris, Stormguard Citadel Dig Site) to Armadyl (his tower, south of Falador)",
      region: [
        'asgarnia',
        { anyOf: ['kandarin'], artefact: true, note: 'Region required to obtain artefacts - needs the Stormguard Citadel dig site tailory debris.' },
      ],
    },
  },
  {
    name: 'Luck of the Dwarves',
    relicName: 'Hand of Glory (Luck of the Dwarves)',
    category: 'misc',
    effect: 'Players will always gain the effect of tier 4 luck.',
    icon: FP('Luck_of_the_Dwarves_(relic_power).png'),
    source: {
      type: 'combination',
      detail:
        "Combine a hand of glory (Imcando forge, Warforge Dig Site) with the Luck of the Dwarves ring, having previously made Ring of Fortune",
      region: ['kandarin', 'kharidianDesert', 'morytania'],
    },
  },
  {
    name: 'Always Adze',
    relicName: 'Seed of the Charyou Tree',
    category: 'skilling',
    effect: 'Automatically burn logs cut while woodcutting for immediate Firemaking experience.',
    icon: FP('Always_Adze.png'),
    source: {
      type: 'combination',
      detail:
        "Activate the seed on the Imcando anvil/forge at Warforge Dig Site, while wearing flame gloves (All Fired Up quest, a beacon chain across Morytania, Asgarnia, and the Wilderness)",
      impossible: true,
      impossibleReason:
        'Requires the Warforge Dig Site forge interaction (Kandarin) plus lighting beacons across Morytania, Asgarnia, and the Wilderness for All Fired Up - 4 optional regions, more than a single Leagues run can unlock.',
      region: ['kandarin', 'morytania', 'asgarnia', 'wilderness'],
    },
  },
  {
    name: 'Sticky Fingers',
    relicName: 'Andvaranaut',
    category: 'skilling',
    effect: 'Increases the rate of auto-pickpocketing by 50%, but reduces pickpocket XP by 33%.',
    icon: FP('Sticky_Fingers.png'),
    source: {
      type: 'combination',
      detail: 'Give a Dominarian device (Oikos fishing hut remnants, Everlight Dig Site) to Reldo (Varrock Palace Library) or Charos',
      region: [
        'misthalin',
        { anyOf: ['morytania'], artefact: true, note: 'Region required to obtain artefacts - needs the Everlight dig site materials for the Dominarian device.' },
      ],
    },
  },
  {
    name: 'Spirit Weaver',
    relicName: "Pastkeeper's tapestry",
    category: 'skilling',
    effect:
      'Grant a 50% experience boost when creating Summoning pouches, but pouches are crafted one at a time, every 4 ticks (2.4 seconds), instead of all at once.',
    icon: FP('Spirit_Weaver.png'),
    source: {
      type: 'skilling',
      detail: 'Complete the Dragonkin VI collection (Daemonheim Dig Site), submitted to Sharrigan',
      region: [
        'anachronia',
        { anyOf: ['wilderness'], artefact: true, note: 'Region required to obtain artefacts - needs the Daemonheim dig site materials for the Dragonkin VI collection.' },
      ],
      note: 'The completed collection must be handed in to Sharrigan, the dragonkin artefact collector, at the Anachronia base camp.',
    },
  },
  {
    name: 'Deathless',
    relicName: "Koschei's Death Egg",
    category: 'skilling',
    effect: 'Never receive a penalty for dying when Dungeoneering in Daemonheim.',
    icon: FP('Deathless.png'),
    source: {
      type: 'combination',
      detail:
        "Complete the Wise Am the Music Man collection (Everlight and Stormguard Citadel Dig Sites) and give Koschei's needle to Koschei the Deathless (Rellekka)",
      region: [
        'fremennikProvince',
        { anyOf: ['morytania'], artefact: true, note: 'Region required to obtain artefacts - needs the Everlight dig site materials for the Wise Am the Music Man collection.' },
        { anyOf: ['kandarin'], artefact: true, note: 'Region required to obtain artefacts - needs the Stormguard Citadel dig site materials for the Wise Am the Music Man collection.' },
      ],
    },
  },
  {
    name: 'Fury of the Small',
    relicName: 'Goblin Warpaints',
    category: 'combat',
    effect: 'All basic abilities will generate 1% more adrenaline.',
    icon: FP('Fury_of_the_Small.png'),
    source: {
      type: 'skilling',
      detail: 'Combine the red hand and green skull cave paintings, done on-site at the Warforge Dig Site',
      region: 'kandarin',
    },
  },
  {
    name: 'Divine Conversion',
    relicName: 'Cres Framework',
    category: 'skilling',
    effect: 'Convert their entire inventory of divination memories when using a divination rift.',
    icon: FP('Divine_Conversion.png'),
    source: {
      type: 'skilling',
      detail:
        "Transfer the personality to a golem framework (requires deciphering Howl's workshop blueprints, Stormguard Citadel) while holding a large memory",
      region: 'kandarin',
    },
  },
  {
    name: 'Persistent Rage',
    relicName: 'The Rings of Razulei',
    category: 'combat',
    effect: 'Automatically generate adrenaline when outside of combat.',
    icon: FP('Persistent_Rage.png'),
    source: {
      type: 'skilling',
      detail: 'Give two hellfire katars (Byzroth remains, Infernal Source Dig Site) to Dagon the Gatekeeper',
      region: [
        'misthalin',
        { anyOf: ['kandarin'], label: 'Harlequin cow' },
        { anyOf: ['kandarin'], label: 'Goblin potion' },
      ],
      note: "Requires completing the Dagon Bye mystery first, which itself requires completing the Contract Claws mystery. Contract Claws needs a Harlequin cow (bred at Manor Farm, kandarin) and a Goblin potion (pharmakos berries via Land of the Goblins/Goblin Cave content, kandarin).",
    },
  },
  {
    name: 'Bait and Switch',
    relicName: "Evil Bob's Catspaw",
    category: 'skilling',
    effect: 'Fishing produce are cooked when caught.',
    icon: FP('Bait_and_Switch.png'),
    source: {
      type: 'skilling',
      detail: 'Give Bob the cat a restored death mask (dragonkin coffin, Orthen Dig Site)',
      region: { anyOf: ['anachronia'], artefact: true, note: 'Region required to obtain artefacts - needs the Orthen dig site death mask.' },
      note: "Bob the cat has one of the largest wander radii in the game (spotted across Misthalin, Asgarnia, Kandarin, and the desert) with no single fixed hand-in spot, so no reliable hard region can be asserted for actually finding him.",
      softRegion: 'kharidianDesert',
      softLabel: 'Catspeak amulet',
      softNote: "Talking to Bob the cat requires a Catspeak amulet, a reward from Icthlarin's Little Helper (collected from the Sphinx in Sophanem, kharidianDesert) - not confirmed as a hard requirement, but plausibly needed.",
    },
  },
  {
    name: 'Flow State',
    relicName: 'Soma',
    category: 'skilling',
    effect: '20% increase to Archaeology excavation precision (at the expense of receiving no soil).',
    icon: FP('Flow_State.png'),
    source: {
      type: 'combination',
      detail:
        'Create the Soma relic from Skeka flasks (Orthenglass flask, near the corbicula rex hunting site, Orthen Dig Site, filled with Anachronia water on-site) using sweet honeycomb, only obtainable in Kandarin',
      region: ['kandarin', 'anachronia'],
    },
  },
  {
    name: 'Heightened Senses',
    relicName: 'Cup of Nectar',
    category: 'combat',
    effect: "Player's maximum adrenaline is increased by 10%.",
    icon: FP('Heightened_Senses.png'),
    source: { type: 'skilling', detail: 'Use a kantharos cup on the Everlight beacon', region: 'morytania' },
  },
  {
    name: 'Death Note',
    relicName: 'Kaladanda',
    category: 'skilling',
    effect: 'All guaranteed bone and ash drops are noted.',
    icon: FP('Death_Note.png'),
    source: { type: 'skilling', detail: 'Complete the Dragonkin III collection (Orthen Dig Site)', region: 'anachronia' },
  },
  {
    name: 'Abyssal Link',
    relicName: 'The Subtle Blade',
    category: 'misc',
    effect: 'Teleport spells from the magic spellbook will no longer require runes but award no Magic experience.',
    icon: FP('Abyssal_Link.png'),
    source: {
      type: 'skilling',
      detail: 'Craft via Invention (111) - requires having completed The World Wakes',
      region: 'kandarin',
    },
  },
  {
    name: 'Inspire Love',
    relicName: "Ariadne's Diadem",
    category: 'skilling',
    effect: '2% more experience when training support skills.',
    icon: FP('Inspire_Love.png'),
    source: {
      type: 'skilling',
      detail: 'Complete the Zamorakian IV collection (Infernal Source Dig Site)',
      region: [
        'asgarnia',
        { anyOf: ['misthalin'], artefact: true, note: 'Region required to obtain artefacts - needs the Infernal Source dig site materials for the Zamorakian IV collection.' },
      ],
      note: 'The Zamorakian IV collection is handed in to Isura, in the Black Knights\' Base within Taverley Dungeon.',
    },
  },
  {
    name: 'Inspire Effort',
    relicName: 'Petasos',
    category: 'skilling',
    effect: '2% more experience when training gathering skills.',
    icon: FP('Inspire_Effort.png'),
    source: {
      type: 'combination',
      detail: 'Complete the Saradominist IV collection (Everlight Dig Site) and hand it in at its collector in Asgarnia',
      region: [
        'asgarnia',
        { anyOf: ['morytania'], artefact: true, note: 'Region required to obtain artefacts - needs the Everlight dig site materials for the Saradominist IV collection.' },
      ],
    },
  },
  {
    name: 'Conservation of Energy',
    relicName: 'Experimental Aether Reactor',
    category: 'combat',
    effect: 'Regain 10% adrenaline after using an ultimate ability.',
    icon: FP('Conservation_of_Energy.png'),
    source: {
      type: 'skilling',
      detail: "Craft via Invention (108) - requires deciphering Howl's workshop blueprints (Stormguard Citadel)",
      region: 'kandarin',
    },
  },
  {
    name: 'Inspire Genius',
    relicName: "Howl's Thinking Cap",
    category: 'skilling',
    effect: '2% more experience when training artisan skills.',
    icon: FP('Inspire_Genius.png'),
    source: {
      type: 'combination',
      detail: 'Complete the Armadylean III collection (Stormguard Citadel Dig Site) and hand it in at its collector in Asgarnia',
      region: ['kandarin', 'asgarnia'],
    },
  },
  {
    name: 'Slayer Introspection',
    relicName: "Amascut's Enchanted Gem",
    category: 'skilling',
    effect: 'Choose between minimum or maximum assignment amounts when requesting a new slayer assignment.',
    icon: FP('Slayer_Introspection.png'),
    source: {
      type: 'combination',
      detail:
        'Complete the Knowledge is Power collection (artefacts spread across Infernal Source, Stormguard Citadel, Kharid-et, Everlight, and Warforge Dig Sites), handed in to the Wise Old Man in Draynor Village',
      region: [
        'misthalin',
        { anyOf: ['morytania'], artefact: true, note: 'Region required to obtain artefacts - needs the Everlight dig site materials for the Knowledge is Power collection.' },
        { anyOf: ['kharidianDesert'], artefact: true, note: 'Region required to obtain artefacts - needs the Kharid-et dig site materials for the Knowledge is Power collection.' },
        { anyOf: ['kandarin'], artefact: true, note: 'Region required to obtain artefacts - needs the Stormguard Citadel and Warforge dig site materials for the Knowledge is Power collection.' },
      ],
    },
  },
  {
    name: 'Inspire Awe',
    relicName: 'Helm of Terror',
    category: 'combat',
    effect: '2% more experience when training combat skills.',
    icon: FP('Inspire_Awe.png'),
    source: {
      type: 'combination',
      detail:
        'Combine Helm of Terror (inside) with Helm of Terror (outside) (Red Rum Relics III and Green Gobbo Goodies III collections, both Warforge Dig Site) and hand them in at their collector in Asgarnia',
      region: [
        'asgarnia',
        { anyOf: ['kandarin'], artefact: true, note: 'Region required to obtain artefacts - needs the Warforge dig site materials for the Red Rum Relics III / Green Gobbo Goodies III collections.' },
      ],
    },
  },
];
