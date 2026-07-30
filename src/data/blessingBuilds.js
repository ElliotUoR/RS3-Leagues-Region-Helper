// Curated example builds for the "Blessing Build examples" page.
//
// Every build in here has been machine-verified against the real availability
// logic (gearAvailability.js/isGearItemAvailable) under its own declared
// regions + relics, so an implementer can render these directly and trust that:
//   - the three blessings are one per tier and `godTier` is what
//     resolveGodTier() actually returns for them
//   - `regions` is at most 3 optional picks (Misthalin/Karamja/Havenhythe are
//     always free and are NOT listed)
//   - `relics` is at most 1 tier-1 relic plus at most 2 unknown-tier relics
//   - every item name in `loadouts` exists in gear.js AND is available under
//     that build's regions+relics
//
// If you edit any build, re-run the verification described in
// `opus combat notes/06-blessing-builds-page-plan.md` before shipping.
//
// `armourTotal` is precomputed: sum of max(stats.defence.*) over the loadout
// plus natural armour at 99 Defence (1212.2, from D^3/1250 + 4D + 40). It is
// stored rather than computed at render time so the page has no dependency on
// the gear data being loaded, but blessings.js exports getTotalArmour() if a
// live recompute is ever wanted.

// Per-relic accent colours, used to colour-code the relic pills on each build
// card. Chosen to be distinguishable in both light and dark themes and to not
// collide with the red/green/blue blessing colours (which encode something
// else entirely on the same card).
export const RELIC_COLOURS = {
  'Endless Harvest': { hue: 140, label: 'green' },
  Survivalist: { hue: 30, label: 'amber' },
  'Golden Touch': { hue: 48, label: 'gold' },
  Transmutation: { hue: 275, label: 'violet' },
  'Crystal Grace': { hue: 190, label: 'cyan' },
  Superheated: { hue: 12, label: 'ember' },
  'Divine Druid': { hue: 95, label: 'moss' },
};

export const BLESSING_BUILD_STAGES = [
  { id: 'midLate', label: 'Mid-late game' },
  { id: 'late', label: 'Late game' },
];

// Execution difficulty is a real selection axis, not flavour text - a build you
// can play badly and still perform with is worth a lot in a league where you
// are constantly under-levelled and learning new bosses. Render this
// prominently on the card, not buried in the expanded body.
export const EXECUTION_DIFFICULTIES = {
  1: { label: 'Very easy', note: 'Performs close to its ceiling with minimal rotation knowledge.' },
  2: { label: 'Easy', note: 'A short rotation and one or two buffs to maintain.' },
  3: { label: 'Moderate', note: 'Real rotation and resource management required.' },
  4: { label: 'Demanding', note: 'Full PvME rotation, tight timings, reactive play.' },
};

export const BLESSING_BUILDS_EXAMPLES = [
  // ------------------------------------------------------------------ 1
  {
    id: 'teragards-bulwark',
    name: "Teragard's Bulwark",
    tagline: 'Turn your armour into ability damage - and get the best basic attack in the game for free.',
    // Highest ceiling AND the lowest execution floor in the set. Those normally
    // trade off against each other; here they do not, which is the strongest
    // argument for this build over any other.
    difficulty: 1,
    styles: ['melee', 'magic'],
    blessings: ["Teragard's Aegis", 'Striking Light', 'Steadfast Will'],
    godTier: 'Sacred Fervor',
    relics: ['Endless Harvest', 'Transmutation', 'Superheated'],
    relicReasons: {
      'Endless Harvest': 'Tier-1. Ore tier-upgrades plus auto-banking - this is what feeds the whole smithing chain, and it substitutes for the regions that normally gate Masterwork.',
      Transmutation: 'The single most important relic here. It substitutes for Wilderness on Primal ore, which hands you the full Primal +5 tank set AND the Primal kiteshield - the highest armour in the game - at zero region cost.',
      Superheated: 'Double bars from every smelt, constant max heat and triple progress per strike. Primal +5 is an enormous smithing grind; this is what makes it realistic inside a league.',
    },
    regions: ['anachronia', 'morytania'],
    regionReasons: {
      anachronia: "Champion's ring / Channeller's ring and the Nodon spike harness.",
      morytania: 'Merciless kiteshield - the best magic-class shield (491.6 armour), which matters because Aegis triples off it.',
    },
    // The headline fact for this build, verified: with Transmutation alone and
    // ZERO optional regions you can still assemble a full Primal tank set,
    // Primal kiteshield, Abyssal Scourge and Igneous cape.
    regionNote:
      'Both picks are luxuries. Verified: with Transmutation and NO optional regions at all you can still build the full Primal set, Primal kiteshield, Abyssal Scourge and Igneous cape - so all three region picks are free to spend elsewhere.',
    whyItsGood:
      "Teragard's Aegis adds 75% of your total armour to your base ability damage while you hold a shield. At 3,605 total armour that is +2,704 ability damage - roughly double what the weapon itself provides - and because it feeds the BASE stat, every percentage-based ability, ultimate multiplier and crit scales off it. Going main-hand + shield costs you about 690 ability damage and three abilities; it gains you nearly 1,900. This build is the reason shields out-damage two-handers in this league.\n\nIt is also, unusually, the EASIEST build here to play. Striking Light adds 40% to your basic attack, and Aegis has already inflated the ability damage that basic attack is a percentage of - so a single basic attack lands for about 5,540, which is 44% of a full threshold ability like Wild Magic while costing no adrenaline and having no cooldown. Simply auto-attacking, with Light of Saradomin firing every 9s on its own, produces roughly 38,700 damage per 9-second window. Most builds ask you to earn your damage with a rotation; this one hands you most of it for holding right-click.",
    howToPlay:
      "Hold a shield at all times - the entire build collapses without one. Open with Preparation, then Revenge, and deliberately let the boss hit you: each incoming attack is +5% damage and Steadfast Will raises the cap to 20 stacks, so a full stack is +100% damage. Sacred Fervor cuts Revenge's cooldown to 63s while Preparation strips 12s off every cooldown each cast, which collapses the effective cooldown to roughly 34s - under Revenge's 39.6s duration. Held correctly, Revenge never drops. Weave Bash on cooldown (it deals an extra 350-450% of your armour value, around +14,000) and let basic attacks fill gaps so Light of Saradomin fires every 9s.",
    tradeoffs: [
      'Melee loses Greater Flurry, which extends Berserk from 19.8s to 35.4s - the single biggest cost of going shield.',
      'Melee also loses Hurricane, Meteor Strike and Bladed Dive; magic forfeits FSOA and its crit passive.',
      'Revenge needs you to actually be taking hits. At a boss you can fully avoid, this build loses its best multiplier.',
    ],
    keyNumbers: [
      { label: 'Total armour (late, melee)', value: '3,605' },
      { label: "Teragard's Aegis bonus", value: '+2,704 ability damage' },
      { label: 'Bash bonus damage', value: '~+14,000' },
      { label: 'Light of Saradomin', value: '~10,500 per 9s' },
      { label: 'Revenge at 20 stacks', value: '+100% damage' },
      { label: 'Basic attack (+40%)', value: '~5,540 - 44% of a threshold, free' },
      { label: 'Auto-attacking only', value: '~38,700 per 9s' },
    ],
    loadouts: {
      late: {
        melee: {
          armourTotal: 3605,
          slots: {
            weapon: 'Abyssal Scourge', offhand: 'Primal kiteshield + 5',
            head: 'Primal full helm + 5', torso: 'Primal platebody + 5', legs: 'Primal platelegs + 5',
            hands: 'Primal gauntlets + 5', feet: 'Primal armoured boots + 5',
            back: 'Igneous Kal-Ket', neck: 'Essence of Finality amulet (or)',
            ring: "Champion's ring", pocket: 'Underworld Grimoire 4', ammo: 'Nodon spike harness',
          },
        },
        magic: {
          armourTotal: 3605,
          slots: {
            weapon: 'Roar of Awakening', offhand: 'Merciless kiteshield',
            head: 'Cryptbloom helm', torso: 'Cryptbloom top', legs: 'Cryptbloom bottoms',
            hands: 'Cryptbloom gloves', feet: 'Cryptbloom boots',
            back: 'Igneous Kal-Mej', neck: 'Essence of Finality amulet (or)',
            ring: "Channeller's ring", pocket: 'Underworld Grimoire 4', ammo: 'Grasping rune pouch',
          },
        },
      },
      midLate: {
        melee: {
          armourTotal: 3275,
          slots: {
            weapon: 'Abyssal Scourge', offhand: 'Elder rune round shield',
            head: 'Masterwork helm', torso: 'Masterwork platebody', legs: 'Masterwork platelegs',
            hands: 'Masterwork gloves', feet: 'Masterwork boots',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death', pocket: 'Book of Death',
          },
        },
        magic: {
          armourTotal: 3383,
          slots: {
            weapon: 'Roar of Awakening', offhand: 'Dragonfire ward',
            head: 'Cryptbloom helm', torso: 'Cryptbloom top', legs: 'Cryptbloom bottoms',
            hands: "Enhanced Kerapac's wrist wraps", feet: 'Cryptbloom boots',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death', pocket: 'Book of Death',
          },
        },
      },
    },
  },

  // ------------------------------------------------------------------ 2
  {
    id: 'the-ironclad',
    name: 'The Ironclad',
    tagline: 'The shield build, tuned for ranged’s much higher hit count.',
    difficulty: 3,
    styles: ['ranged'],
    blessings: ["Teragard's Aegis", 'Abyssal Cinders', 'Steadfast Will'],
    godTier: 'Sacred Fervor',
    relics: ['Endless Harvest', 'Transmutation', 'Superheated'],
    relicReasons: {
      'Endless Harvest': 'Tier-1. Ore access for the smithing chain and the Elder rune fallback shield.',
      Transmutation: 'Primal crossbow Mk. 5 for the mid-late slot, plus Primal armour if you want to stack armour over damage bonus.',
      Superheated: 'Makes the Primal smithing grind realistic.',
    },
    regions: ['tirannwn', 'anachronia'],
    regionReasons: {
      tirannwn: "Blightbound crossbow - the best main-hand ranged weapon, and the ONLY style whose main-hand costs a region. Also brings the Attuned crystal deflector (384.8 armour).",
      anachronia: "Stalker's ring.",
    },
    regionNote:
      'Ranged is the only style whose main-hand is region-locked - melee (Abyssal Scourge) and magic (Roar of Awakening) both get theirs free from Misthalin. Weigh that before committing ranged as your main.',
    whyItsGood:
      "Identical engine to Teragard's Bulwark, with one deliberate swap. Striking Light scales off ARMOUR; Abyssal Cinders scales off ABILITY DAMAGE times hit count. Ranged is the most hit-dense style in the game - Rapid Fire alone is 5 hits - so over a 9s window Cinders deals about 11,135 against Striking Light's 10,479. Crucially this is still 2 blue, so the god power is unchanged: you get Sacred Fervor either way and lose nothing.",
    howToPlay:
      "Play it exactly like Teragard's Bulwark - shield up, Preparation and Revenge held on cooldown, Bash woven in. The difference is purely in what you stack: favour damage bonus over raw armour where the two conflict, because Abyssal Cinders pays 15% of ability damage on every single hit and your rotation produces a great many hits. Lead with multi-hit abilities and Rapid Fire whenever Cinders' proc is worth rolling.",
    tradeoffs: [
      'Forfeits Bow of the Last Guardian and its Perfect Equilibrium passive.',
      'Costs a region pick that melee and magic do not have to spend.',
    ],
    keyNumbers: [
      { label: 'Total armour (late)', value: '3,370' },
      { label: "Teragard's Aegis bonus", value: '+2,528 ability damage' },
      { label: 'Abyssal Cinders per hit', value: '+594' },
      { label: 'Cinders vs Striking Light', value: '11,135 vs 10,479 per 9s' },
    ],
    loadouts: {
      late: {
        ranged: {
          armourTotal: 3370,
          slots: {
            weapon: 'Blightbound crossbow', offhand: 'Attuned crystal deflector',
            head: 'Elite dracolich coif', torso: 'Elite dracolich hauberk', legs: 'Elite dracolich chaps',
            hands: 'Elite dracolich vambraces', feet: 'Elite dracolich boots',
            back: 'Igneous Kal-Xil', neck: 'Essence of Finality amulet (or)',
            ring: "Stalker's ring", pocket: 'Underworld Grimoire 4',
          },
        },
      },
      midLate: {
        ranged: {
          armourTotal: 3187,
          slots: {
            weapon: 'Primal crossbow Mk. 5', offhand: 'Dragonfire deflector',
            head: 'Dracolich coif', torso: 'Dracolich hauberk', legs: 'Dracolich chaps',
            hands: 'Dracolich vambraces', feet: 'Dracolich boots',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death',
          },
        },
      },
    },
  },

  // ------------------------------------------------------------------ 3
  {
    id: 'the-berserker',
    name: 'The Berserker',
    tagline: 'Keep the rotation you already know. Free special attacks, forever.',
    difficulty: 4,
    styles: ['melee', 'magic'],
    blessings: ['Adrenaline Junkie', 'Abyssal Cinders', 'Avernic Rampage'],
    godTier: "Demon's Mark",
    relics: ['Golden Touch', 'Transmutation', 'Divine Druid'],
    relicReasons: {
      'Golden Touch': "Tier-1. Guaranteed pickpockets with tripled loot - this is the fastest route to the Asuran Arsenal rewards, and Varanus's Mercy is the best spec-spam main-hand in the game.",
      Transmutation: 'Masterwork and Primal armour without the ore regions.',
      'Divine Druid': '75% ingredient savings on potions and all Meilyr recipes unlocked - overload uptime is a real damage stat and this build has no armour scaling to fall back on.',
    },
    regions: ['wilderness', 'anachronia', 'kharidianDesert'],
    regionReasons: {
      wilderness: 'Dark Sliver of Leng, the off-hand that makes dual-wield melee possible and keeps Greater Flurry.',
      anachronia: "Varanus's Mercy (The Final Flurry spec) and Champion's/Channeller's ring.",
      kharidianDesert: 'Seren godbow and Devourer’s Guard for the Essence of Finality slot.',
    },
    whyItsGood:
      'The only build that requires no change to how you play. Keep your two-hander or dual-wield, keep Greater Flurry, keep FSOA and Bow of the Last Guardian. The payload is Avernic Rampage: special attacks have NO global cooldown and can be cast back-to-back, and most have no cooldown at all, so 7.2s of 0% adrenaline is a free spec-spam window. Alternating EoF dragon claws (400% ability damage) with a wielded Varanus’s Mercy (345%) fits 3-4 specials, roughly 59,000 damage, free. Adrenaline Junkie is at its best here specifically: Greater Flurry is a threshold that EXTENDS Berserk, so a 150% cap means you cast Berserk and still have 50% banked to start chaining it toward the 35.4s ceiling.',
    howToPlay:
      'Play your normal rotation. Enter fights at 150% adrenaline, open with your ultimate, and immediately spend the banked 50% on a threshold rather than rebuilding with basics - that swap is most of this build’s value. The moment Avernic Rampage procs, stop your rotation entirely and dump special attacks until the window closes. Store a DIFFERENT weapon in your Essence of Finality than the one you wield: a physical copy of the stored weapon cannot be specced twice in a row.',
    tradeoffs: [
      'Lowest raw ceiling of the five builds - no armour scaling at all.',
      "Demon's Mark is the weakest god power at best-in-slot, since accuracy saturates. It does fix melee's accuracy problem and lets one style's gear cover everything.",
      'Avernic Rampage is random. It cannot be planned around and often procs while your best abilities are on cooldown.',
    ],
    keyNumbers: [
      { label: 'Avernic Rampage window', value: '~59,000 damage, free' },
      { label: 'Rampage uptime', value: '~20% (~1.65 procs/min)' },
      { label: 'Adrenaline cap', value: '150%' },
      { label: 'Abyssal Cinders per hit', value: '+594' },
    ],
    loadouts: {
      late: {
        melee: {
          armourTotal: 2903,
          slots: {
            weapon: 'Dark Shard of Leng', offhand: 'Dark Sliver of Leng',
            head: 'Masterwork helm', torso: 'Masterwork platebody', legs: 'Masterwork platelegs',
            hands: 'Masterwork gloves', feet: 'Masterwork boots',
            back: 'Igneous Kal-Ket', neck: 'Essence of Finality amulet (or)',
            ring: "Champion's ring", pocket: 'Underworld Grimoire 4', ammo: 'Nodon spike harness',
          },
        },
        magic: {
          armourTotal: 3099,
          slots: {
            weapon: 'Fractured Staff of Armadyl',
            head: 'Cryptbloom helm', torso: 'Cryptbloom top', legs: 'Cryptbloom bottoms',
            hands: "Enhanced Kerapac's wrist wraps", feet: 'Cryptbloom boots',
            back: 'Igneous Kal-Mej', neck: 'Essence of Finality amulet (or)',
            ring: "Channeller's ring", pocket: 'Underworld Grimoire 4', ammo: 'Grasping rune pouch',
          },
        },
      },
      midLate: {
        melee: {
          armourTotal: 2890,
          slots: {
            weapon: 'Drygore Rapier', offhand: 'Off-hand Drygore Rapier',
            head: 'Masterwork helm', torso: 'Masterwork platebody', legs: 'Masterwork platelegs',
            hands: 'Masterwork gloves', feet: 'Masterwork boots',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death',
          },
        },
      },
    },
  },

  // ------------------------------------------------------------------ 4
  {
    id: 'the-avalanche',
    name: 'The Avalanche',
    tagline: 'Two-handed, multi-target, and enormous against big bosses.',
    difficulty: 2,
    styles: ['melee', 'ranged'],
    blessings: ['Big Boned', 'Barkscales', 'Avernic Rampage'],
    godTier: 'Splash Zone',
    relics: ['Survivalist', 'Transmutation', 'Divine Druid'],
    relicReasons: {
      Survivalist: 'Tier-1. Doubled gathering and best-in-slot tools - the fastest way to the ore volume this build’s Primal armour needs.',
      Transmutation: 'Primal armour and the Primal 2h Sword without the Wilderness.',
      'Divine Druid': 'Potion savings and Meilyr recipes; overloads matter more here because the build has no ability-damage scaling.',
    },
    regions: ['kharidianDesert', 'anachronia', 'morytania'],
    regionReasons: {
      kharidianDesert: 'Seren godbow - its Crystal Rain spec fires 5 arrows and is genuinely multi-target, so Splash Zone amplifies it.',
      anachronia: "Champion's ring, Stalker's ring, Nodon spike harness.",
      morytania: 'Deeper armour and shield options, plus Araxxor gear.',
    },
    whyItsGood:
      'The coherent case for keeping a two-hander. Splash Zone’s best abilities - Hurricane, Quake, Bombardment - are exactly the 2h-only ones a shield build gives up, so this build and the Aegis builds pull in genuinely opposite directions. Splash Zone gives +30% to every AoE and multi-target attack plus 5% per tile the target occupies, which against a 3x3 boss is another +45%. Big Boned then adds a flat ~1,100-1,350 to EVERY splat, and multi-target abilities produce a great many splats. Barkscales removes a flat 300 from every hit you take and fires a 3x3 Grasp of Guthix every 5 reductions, which Splash Zone also boosts.',
    howToPlay:
      'Lead with area abilities even in single-target fights where the boss has a large footprint - the per-tile bonus applies to the target’s size, not the number of enemies. Barkscales means you can simply stand in damage that would otherwise force a retreat, and every hit you take is progress toward the next free Grasp of Guthix. Save Avernic Rampage windows for single-target burst, which is this build’s weak spot.',
    tradeoffs: [
      'Weakest single-target damage of the five builds - Avernic Rampage is in the build specifically to patch that.',
      'Multi-target is NOT multi-hit: Splash Zone does nothing for dragon claws or Varanus’s Mercy, which are several hits on one target.',
      'Big Boned is flat damage, so its relative value falls as your gear improves.',
    ],
    keyNumbers: [
      { label: 'Splash Zone (3x3 boss)', value: '+75% on AoE abilities' },
      { label: 'Big Boned per hit', value: '+1,010 to +1,350' },
      { label: 'Barkscales reduction', value: '-300 per hit taken' },
      { label: 'Grasp of Guthix', value: '~100% ability damage, 3x3' },
    ],
    loadouts: {
      late: {
        melee: {
          armourTotal: 3113,
          slots: {
            weapon: 'Ek-ZekKil',
            head: 'Primal full helm + 5', torso: 'Primal platebody + 5', legs: 'Primal platelegs + 5',
            hands: 'Primal gauntlets + 5', feet: 'Primal armoured boots + 5',
            back: 'Igneous Kal-Ket', neck: 'Essence of Finality amulet (or)',
            ring: "Champion's ring", pocket: 'Underworld Grimoire 4', ammo: 'Nodon spike harness',
          },
        },
        ranged: {
          armourTotal: 2985,
          slots: {
            weapon: 'Seren godbow',
            head: 'Elite dracolich coif', torso: 'Elite dracolich hauberk', legs: 'Elite dracolich chaps',
            hands: 'Elite dracolich vambraces', feet: 'Elite dracolich boots',
            back: 'Igneous Kal-Xil', neck: 'Essence of Finality amulet (or)',
            ring: "Stalker's ring", pocket: 'Underworld Grimoire 4',
          },
        },
      },
      midLate: {
        melee: {
          armourTotal: 2890,
          slots: {
            weapon: 'Primal 2h Sword + 5',
            head: 'Masterwork helm', torso: 'Masterwork platebody', legs: 'Masterwork platelegs',
            hands: 'Masterwork gloves', feet: 'Masterwork boots',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death',
          },
        },
      },
    },
  },

  // ------------------------------------------------------------------ 5
  {
    id: 'the-reaper',
    name: 'The Reaper',
    tagline: 'Necromancy. Costs you almost no regions at all.',
    difficulty: 3,
    styles: ['necromancy'],
    blessings: ['Big Boned', 'Striking Light', 'Avernic Rampage'],
    godTier: 'Splash Zone',
    relics: ['Survivalist', 'Crystal Grace', 'Transmutation'],
    relicReasons: {
      Survivalist: 'Tier-1. Doubled gathering, best tools, and doubled time-sprite focus.',
      'Crystal Grace': 'Made for necromancy: every ritual behaves as if Multiply, Attraction and Protection glyphs are drawn at 200%, and Speed at the 50% cap - without the ingredients. It also unlocks every spell across all spellbooks.',
      Transmutation: 'Death guard and Skull lantern tier 90 without the ore regions, covering the mid-late slot.',
    },
    regions: ['anachronia', 'kharidianDesert'],
    regionReasons: {
      anachronia: "Occultist's ring.",
      kharidianDesert: "Devourer's Guard - its Soul Crush spec consumes residual souls and is the best Essence of Finality store for necromancy.",
    },
    regionNote:
      'Necromancy is very nearly a Misthalin-only style. The First Necromancer set, Omni guard, Soulbound lantern, Igneous Kal-Mor, Underworld Grimoire 4 and Zemouregal’s nexus are all free. Picking necromancy as your main effectively hands you back all three optional region picks.',
    whyItsGood:
      'Necromancy cannot hold a shield - the off-hand must be a conduit - so the entire Aegis package is off the table and Steadfast Will loses both Bash and Revenge. What is left suits necro unusually well. Big Boned pays per hit and necromancy has the highest hit count in the game (conjures ticking, DoTs, multi-hit spenders), which turns +1,350 per hit into roughly 112,000 per minute. Striking Light needs no shield at all - it scales off armour, and the First Necromancer set has the same 491.6/565.3/540.7 armour as full Deathwarden tank while ALSO keeping full damage bonus. These picks land one-of-each, which routes to Splash Zone - and Death Skulls, Volley of Souls and conjures are all multi-target.',
    howToPlay:
      'Standard necromancy rotation: maintain conjures, build Necrosis with Touch of Death and Residual Souls with Soul Sap, spend on Finger of Death at 6+ and Volley of Souls at 5. Prioritise Living Death windows. Because Splash Zone rewards multi-target, favour Death Skulls and Volley of Souls, and remember the per-tile bonus applies to a large boss’s footprint even when it is the only enemy. Let basic attacks fill gaps - Omni guard’s Death Spark passive builds on Necromancy basic attacks and doubles every fifth, and Striking Light buffs exactly those by 40%.',
    tradeoffs: [
      'Steadfast Will is nearly dead weight for necromancy, so the strongest tier-3 blessing is simply unavailable to this build.',
      'Abyssal Cinders actually out-damages Striking Light here (~83 hits/min), but taking it makes the build 2 red and trades Splash Zone for Demon’s Mark. Swap only if you want pure single-target consistency.',
    ],
    keyNumbers: [
      { label: 'Total armour (late)', value: '3,113' },
      { label: 'Light of Saradomin', value: '~7,800 per 9s' },
      { label: 'Big Boned per hit', value: '+1,350 (tank LP)' },
      { label: 'Regions actually required', value: '0 - both picks are luxuries' },
    ],
    loadouts: {
      late: {
        necromancy: {
          armourTotal: 3113,
          slots: {
            weapon: 'Omni guard', offhand: 'Soulbound lantern',
            head: 'Crown of the First Necromancer', torso: 'Robe top of the First Necromancer',
            legs: 'Robe bottom of the First Necromancer', hands: 'Hand wrap of the First Necromancer',
            feet: 'Foot wraps of the First Necromancer',
            back: 'Igneous Kal-Mor', neck: 'Essence of Finality amulet (or)',
            ring: "Occultist's ring", pocket: 'Underworld Grimoire 4', ammo: "Zemouregal's nexus",
          },
        },
      },
      midLate: {
        necromancy: {
          armourTotal: 3100,
          slots: {
            weapon: 'Death guard (tier 90)', offhand: 'Skull lantern (tier 90)',
            head: 'Crown of the First Necromancer', torso: 'Robe top of the First Necromancer',
            legs: 'Robe bottom of the First Necromancer', hands: 'Hand wrap of the First Necromancer',
            feet: 'Foot wraps of the First Necromancer',
            back: 'Max cape', neck: 'Amulet of souls', ring: 'Ring of death', ammo: 'Deathwarden nexus',
          },
        },
      },
    },
  },

  // ------------------------------------------------------------------ 6
  {
    id: 'the-undying',
    name: 'The Undying',
    tagline: 'The only all-green build. Functionally immortal, and still hits hard.',
    difficulty: 1,
    styles: ['magic'],
    blessings: ['Big Boned', 'Barkscales', 'Eternal Sustenance'],
    godTier: 'Splash Zone',
    relics: ['Survivalist', 'Crystal Grace', 'Divine Druid'],
    relicReasons: {
      Survivalist: 'Tier-1. Doubled gathering and best-in-slot tools to get the set together quickly.',
      'Crystal Grace': 'Load-bearing for this build. It unlocks every Magic spell across all spellbooks - which is how you guarantee Animate Dead - and triples rune output, which pays the spell\'s heavy upkeep. Animate Dead is the whole engine here, so the relic that guarantees and funds it is not optional.',
      'Divine Druid': '75% ingredient savings on potions and all Meilyr recipes, so overload and prayer-renewal uptime is permanent rather than rationed.',
    },
    regions: ['anachronia'],
    regionReasons: {
      anachronia: "Reaver's ring. That is genuinely the only thing this build wants from an optional region.",
    },
    regionNote:
      'The cheapest build on this page by a wide margin. Cryptbloom, FSOA, the Igneous cape, Underworld Grimoire 4 and the Grasping rune pouch are all Misthalin; Animate Dead comes from City of Senntisten, also Misthalin. Two of your three region picks are entirely free.',
    whyItsGood:
      "This is the build the all-green line was hiding. Animate Dead grants flat damage reduction equal to 10% of each magic tank piece's armour value plus 25% of your Defence level per piece - about 308 flat with five-piece Cryptbloom at 99 Defence. Barkscales adds another 10% of your total armour, about 341. That is roughly 650 flat damage removed from every single hit before any percentage reduction applies.\n\nThen the percentages stack on top: Cryptbloom's Nature's Envoy is up to 24% magic and 16% melee, and it stacks additively with Animate Dead rather than replacing it. A 1,000 boss hit lands for 243 - a 76% total reduction. A 2,000 hit lands for 934 against a Big Boned life pool of about 27,000, so you would need 29 consecutive unhealed hits to die. With Eternal Sustenance your food is never consumed and eating costs no adrenaline, so you simply do not run out.\n\nAnd it is not a damage-dead build. Big Boned still adds roughly 1,350 to every splat, Barkscales fires a 3x3 Grasp of Guthix every five hits you take, and three green picks land on Splash Zone - which boosts both that Grasp and every AoE ability you own.",
    howToPlay:
      "Keep Animate Dead up at all times - it lasts 12 minutes, right-click multicast extends it toward an hour, and it neither interrupts channels nor triggers the global cooldown. You must be wearing magic tank armour for it to do anything, so Cryptbloom stays on even when a power set would be more damage. After that, play aggressively and simply ignore mechanics that would force other builds to disengage: standing in avoidable damage is how you feed Barkscales' Grasp of Guthix procs. Favour Chain and Detonate so Splash Zone's multi-target bonus is always live.",
    tradeoffs: [
      'Lowest single-target damage ceiling on this page - there is no ability-damage scaling anywhere in the build.',
      'Eternal Sustenance is genuinely a dead slot for damage; you are paying a full tier-3 pick for sustain you may not need once you know a boss.',
      'Animate Dead only works with MAGIC tank armour, so this build is locked to Cryptbloom and locked to magic.',
      'Animate Dead is a real rune cost without Crystal Grace - do not run this build without that relic.',
    ],
    keyNumbers: [
      { label: 'Animate Dead flat DR', value: '~308' },
      { label: 'Barkscales flat DR', value: '~341' },
      { label: 'Combined flat DR', value: '~650 per hit' },
      { label: 'A 1,000 hit becomes', value: '243 (76% reduction)' },
      { label: 'Life pool (Big Boned)', value: '~27,000' },
      { label: 'Unhealed hits to die @2k', value: '29' },
    ],
    loadouts: {
      late: {
        magic: {
          armourTotal: 3113,
          slots: {
            weapon: 'Fractured Staff of Armadyl',
            head: 'Cryptbloom helm', torso: 'Cryptbloom top', legs: 'Cryptbloom bottoms',
            hands: 'Cryptbloom gloves', feet: 'Cryptbloom boots',
            back: 'Igneous Kal-Mej', neck: 'Essence of Finality amulet (or)',
            ring: "Reaver's ring", pocket: 'Underworld Grimoire 4', ammo: 'Grasping rune pouch',
          },
        },
      },
      midLate: {
        magic: {
          armourTotal: 3410,
          slots: {
            weapon: 'Roar of Awakening', offhand: 'Dragonfire ward',
            head: 'Cryptbloom helm', torso: 'Cryptbloom top', legs: 'Cryptbloom bottoms',
            hands: 'Cryptbloom gloves', feet: 'Cryptbloom boots',
            back: 'Igneous Kal-Mej', neck: 'Amulet of souls',
            ring: 'Ring of death', pocket: 'Book of Death', ammo: 'Grasping rune pouch',
          },
        },
      },
    },
  },
];

// "Blind" tier list: each blessing and god power graded on its ISOLATED power,
// deliberately ignoring the combos elsewhere on this page. That is why
// Steadfast Will and Teragard's Aegis sit at A on their own merits while
// Barkscales - which is arguably the glue of the best package - sits at C.
//
// Nothing lands in F. The weakest entry (Eternal Sustenance) is a genuine
// effect that simply contributes no damage, not a broken one.
export const BLESSING_TIER_LIST = {
  grades: ['A', 'B', 'C', 'D', 'E', 'F'],
  entries: [
    // --- A
    { name: "Teragard's Aegis", kind: 'blessing', tier: 1, colour: 'blue', grade: 'A',
      note: 'Roughly doubles ability damage with a shield, and feeds the base stat so everything scales off it.' },
    { name: 'Steadfast Will', kind: 'blessing', tier: 3, colour: 'blue', grade: 'A',
      note: 'Revenge to 20 stacks is +100% damage; Bash gains ~14,000; Preparation becomes a cooldown engine.' },
    { name: 'Sacred Fervor', kind: 'god', colour: 'blue', grade: 'A',
      note: 'Unconditional -30% cooldowns on all four styles. No drawback, no setup, useful at every stage.' },
    // --- B
    { name: 'Striking Light', kind: 'blessing', tier: 2, colour: 'blue', grade: 'B',
      note: '~10,500 guaranteed damage every 9s, scaling off armour and independent of your rotation.' },
    { name: 'Big Boned', kind: 'blessing', tier: 1, colour: 'green', grade: 'B',
      note: '+1,000-1,350 flat on every hit, multiplied by every multi-hit ability, plus 50% more life points.' },
    { name: 'Abyssal Cinders', kind: 'blessing', tier: 2, colour: 'red', grade: 'B',
      note: 'Clean unconditional damage with no build requirement. Scales with ability damage and hit count.' },
    { name: 'Splash Zone', kind: 'god', colour: 'green', grade: 'B',
      note: 'Highest ceiling of the god powers, but conditional on AoE abilities and target size.' },
    // --- C
    { name: 'Barkscales', kind: 'blessing', tier: 2, colour: 'green', grade: 'C',
      note: 'Judged alone this is mostly defensive: -300 per hit taken plus a modest AoE proc. Its real value is as an enabler.' },
    { name: 'Avernic Rampage', kind: 'blessing', tier: 3, colour: 'red', grade: 'C',
      note: '~59,000 free damage per window via special-attack spam, but only ~20% uptime and entirely random.' },
    { name: 'Adrenaline Junkie', kind: 'blessing', tier: 1, colour: 'red', grade: 'C',
      note: 'Strong in skilled hands - a 150% cap means an ultimate plus an immediate threshold - but it only amplifies a rotation you already have.' },
    // --- D
    { name: "Demon's Mark", kind: 'god', colour: 'red', grade: 'D',
      asterisk: true,
      asteriskNote:
        'Graded on the weaker reading: most bosses have no weakness, so calculating accuracy from one is often worth nothing. If it instead means your attacks are always treated as having 90 affinity against the target, this is a large universal accuracy gain and would grade around B.',
      note: 'Accuracy only, and accuracy saturates at best-in-slot. Its real value is letting one style’s gear cover everything under region locking.' },
    // --- E
    { name: 'Eternal Sustenance', kind: 'blessing', tier: 3, colour: 'green', grade: 'E',
      note: 'Zero damage, which is why it grades E in isolation. It has exactly one real home: stacked with Animate Dead, Cryptbloom and Barkscales in The Undying, where the whole point is never dying rather than killing faster.' },
  ],
};
