// Archaeology relic powers reference for RS3 Leagues II: Equilibrium.
// See https://runescape.wiki/w/Relics for the full list this is derived from.
//
// Each entry's primary `name` is the *relic power* (the permanent passive
// buff granted at the mysterious monolith, e.g. "Font of Life"), with
// `relicName` as the underlying artefact/relic that grants it (e.g. "The
// Mortal Cup") shown as a subtitle — per the naming the relic is commonly
// known by is the artefact, but what you actually see and use in-game is the
// power.
//
// `category` groups relics into the tab split requested: 'combat' (affects
// combat stats/LP/adrenaline/abilities), 'skilling' (affects a non-combat
// skill), or 'misc' (utility/economy/luck effects that aren't tied to a
// specific skill or combat).
//
// `effect` is the relic power's actual in-game description, quoted verbatim
// from the wiki's relic power infobox — shown in its own colour in the UI to
// distinguish "what it does" from "how you unlock it" (`source.detail`).
//
// `source.region` follows the exact same conventions as gear.js/abilities.js
// and is read by the same gearAvailability.js helpers. Regions were traced
// past the relic's own collection/dig-site to each *component's* actual
// origin where a relic combines parts from multiple sources (e.g. Ring of
// Solomon needs both the Stormguard Citadel dig site AND Armadyl's Tower in
// Asgarnia) — several relics also chain through an earlier relic's
// prerequisite (the four Hand of Glory luck rings must be made in order),
// which pulls in that earlier relic's region(s) too. Misthalin/Karamja/
// Havenhythe sources are still listed even though those regions are always
// unlocked (fixed), for an accurate/complete tag display.
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
        'Combine a hand of glory (Dungeon of Disorder, Infernal Source Dig Site) with a Ring of Luck (Grand Exchange)',
      region: 'misthalin',
    },
  },
  {
    name: 'Unexpected Diplomacy',
    relicName: 'Seal of the Praefectus Praetorio',
    category: 'skilling',
    effect: 'Adds 10% to all reputation earned at the Heart of Gielinor, the Farming Guild, Menaphos and Mazcab.',
    icon: FP('Unexpected_Diplomacy.png'),
    source: { type: 'skilling', detail: 'Complete the Zarosian I collection (Kharid-et Dig Site)', region: 'kharidianDesert' },
  },
  {
    name: 'Pouch Protector',
    relicName: 'Threads of Fate',
    category: 'skilling',
    effect: 'Runecrafting pouches will no longer degrade when used, including massive pouches.',
    icon: FP('Pouch_Protector.png'),
    source: {
      type: 'combination',
      detail: 'Combine an abyssal thread (Zamorakian I collection, Infernal Source Dig Site) with a giant pouch',
      region: 'misthalin',
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
        'Combine a lock of hair (Saradomin I collection, Everlight Dig Site) with an amulet of the forsaken (Barrows, or Grand Exchange)',
      region: 'morytania',
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
        "Combine a Guardian's tear (Guthixian I collection, Moonrise Dig Site) with expensive spices (Let Them Eat Pie quest reward, Taverley/Burthorpe)",
      region: ['havenhythe', 'asgarnia'],
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
      region: ['misthalin', 'wilderness'],
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
        'Complete the Smoky Fings collection (artefacts from Infernal Source, Everlight, and Kharid-et Dig Sites) and hand it in to Chief Tess in Kandarin',
      region: ['morytania', 'kharidianDesert', 'kandarin'],
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
        "Give King Oberon's moonshroom spores (Armadylean I collection, Stormguard Citadel Dig Site) to the Fairy Queen",
      region: 'kandarin',
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
      region: ['kandarin', 'asgarnia'],
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
        "Activate the seed (Imcando anvil, Warforge Dig Site) while wearing flame gloves (All Fired Up quest, a beacon chain across Morytania, Asgarnia, and the Wilderness)",
      impossible: true,
      impossibleReason:
        'Requires the Warforge Dig Site (Kandarin) plus lighting beacons across Morytania, Asgarnia, and the Wilderness for All Fired Up — 4 optional regions, more than a single Leagues run can unlock.',
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
      detail: 'Give a Dominarian device (Oikos fishing hut remnants, Everlight Dig Site) to Reldo or Charos',
      region: 'morytania',
    },
  },
  {
    name: 'Spirit Weaver',
    relicName: "Pastkeeper's tapestry",
    category: 'skilling',
    effect:
      'Grant a 50% experience boost when creating Summoning pouches, but pouches are crafted one at a time, every 4 ticks (2.4 seconds), instead of all at once.',
    icon: FP('Spirit_Weaver.png'),
    source: { type: 'skilling', detail: 'Complete the Dragonkin VI collection (Daemonheim Dig Site)', region: 'wilderness' },
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
      region: ['morytania', 'kandarin', 'fremennikProvince'],
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
      detail: 'Combine the red hand and green skull cave paintings (both Warforge Dig Site)',
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
      region: 'misthalin',
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
      detail: 'Give Bob the cat (Lumbridge) a restored death mask (dragonkin coffin, Orthen Dig Site)',
      region: 'anachronia',
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
        'Create the Soma relic from Skeka flasks (Orthenglass flask, near the corbicula rex hunting site, Orthen Dig Site) using sweet honeycomb, only obtainable in Kandarin',
      region: ['anachronia', 'kandarin'],
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
      detail: 'Craft via Invention (111) — requires having completed The World Wakes',
      region: 'kandarin',
    },
  },
  {
    name: 'Inspire Love',
    relicName: "Ariadne's Diadem",
    category: 'skilling',
    effect: '2% more experience when training support skills.',
    icon: FP('Inspire_Love.png'),
    source: { type: 'skilling', detail: 'Complete the Zamorakian IV collection (Infernal Source Dig Site)', region: 'misthalin' },
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
      region: ['morytania', 'asgarnia'],
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
      detail: "Craft via Invention (108) — requires deciphering Howl's workshop blueprints (Stormguard Citadel)",
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
        'Complete the Knowledge is Power collection (artefacts spread across Infernal Source, Stormguard Citadel, Kharid-et, Everlight, and Warforge Dig Sites)',
      region: ['morytania', 'kharidianDesert', 'kandarin'],
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
      region: ['kandarin', 'asgarnia'],
    },
  },
];
