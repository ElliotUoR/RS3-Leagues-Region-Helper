// Blessing powers reference for RS3 Leagues II: Equilibrium.
//
// Transcribed verbatim from Jagex's "Blessing Reveal" promo images (Blessing
// Tier One/Two/Three and God Tier One) - the wiki has no Blessings page as of
// writing, same situation leagueRelics.js's Divine Druid/Transmutation entries
// were in before the wiki caught up.
//
// STRUCTURE. A run picks exactly one blessing from each of the three tiers.
// Every tier offers the same three colours - red, green, blue - and the colours
// of your three picks determine which God Tier One power you receive:
//
//   2 or 3 of a colour  -> that colour's god power
//   1 of each           -> green (Splash Zone)
//
// See `resolveGodTier()` at the bottom, which implements exactly that rule.
//
// Blessings are RESETTABLE mid-league, which is why `analysis.stageRank` grades
// each one separately for early/mid/late game rather than giving a single
// verdict - the optimal early-game set is genuinely not the optimal endgame set.
//
// `effects` holds the card's effect lines verbatim. `analysis` is entirely
// app-added commentary (NOT Jagex text) derived from the combat research in
// `opus combat notes/` - keep the two clearly separated in any UI that renders
// this, the same way LeagueRelicRow.jsx distinguishes wiki-verbatim `effects`
// bullets from app-added `regionTagNote`.
//
// Icon note: all twelve icons (nine blessings + three god powers) were cropped
// from Jagex's reveal images. They are NOT on the wiki, so
// scripts/download-icons.mjs must never be pointed at them - there is no
// runescape.wiki file to re-fetch.
//
// The live set is `public/icons/blessings/*.webp`, copied from
// `image/BlessingIconsClear/` - background-free versions of the original crops.
// The earlier opaque PNGs are still in `public/icons/` and are no longer
// referenced from here. These paths are read by BOTH the app and the share-image
// renderer (server/src/lib/ogImageRender.js), so any replacement set has to be a
// format @napi-rs/canvas can decode; webp is verified working.
//
// Two filenames were normalised when copying, so the source and the copy
// deliberately differ - do not "fix" these back. Apostrophes are dropped rather
// than percent-encoded, matching what the PNG set already did:
//   Teragard's_Aegis.webp -> Teragard_Aegis.webp
//   Demon's_Mark.webp     -> Demons_Mark.webp

export const BLESSING_COLOURS = ['red', 'green', 'blue'];

// The god each colour belongs to, and the God Tier One power that colour awards
// a majority of. The god/theme pairing is the standard RS3 one (Zamorak-chaos,
// Guthix-balance, Saradomin-order) rather than anything stated on the reveal
// images - it is what the colour choice reads as in-universe, and the Blessings
// page leans on it so the three columns are identifiable at a glance without
// relying on colour alone.
export const BLESSING_COLOUR_META = {
  red: { god: 'Zamorak', theme: 'Chaos', godPower: "Demon's Mark" },
  green: { god: 'Guthix', theme: 'Balance', godPower: 'Splash Zone' },
  blue: { god: 'Saradomin', theme: 'Order & Wisdom', godPower: 'Sacred Fervor' },
};

export const BLESSING_TIERS = [1, 2, 3];

// Transcribed verbatim from Jagex's "Blessing Passives Revealed" promo image -
// a SEPARATE progression track from BLESSING_TIERS above. BLESSING_TIERS is
// "pick one blessing per tier" (which blessing you equip); this is the
// account-wide passive perks unlocked by resetting/re-progressing blessings
// overall - hence "1x Blessing progression reset" appearing as a reward
// itself at Tier 1/God Tier 1/God Tier 2. Tier 4 is not a gap in this data -
// the reveal image itself jumps straight from Tier 3 to God Tier 1, then
// Tier 5-7 to God Tier 2, with no Tier 4 shown at all.
//
// `colour` is NOT from Jagex - the reveal image doesn't assign a god/colour
// to any of these tiers, they're a flat account-wide progression. It's a
// purely decorative red/green/blue cycle (BlessingPassivesModal.jsx) so this
// table reuses the same three-god palette as the tier picker above it on the
// page, rather than a claim that e.g. Tier 1 "belongs to" Zamorak. The two
// God Tier rows get `colour: 'god'` for a distinct combined-palette treatment
// instead of any single colour.
export const BLESSING_PASSIVE_TIERS = [
  {
    tier: 'Tier 1',
    colour: 'red',
    passives: [
      '50% chance to save runes in combat',
      '50% chance to save ammunition in combat',
      '50% chance to save ectoplasm and runes when casting abilities and incantations',
      '1x Blessing progression reset',
    ],
  },
  {
    tier: 'Tier 2',
    colour: 'green',
    passives: [
      'The Dive ability is automatically unlocked',
      'Your attack range for all combat styles is increased by 1 tile. Maximum range is capped at 10 tiles',
    ],
  },
  {
    tier: 'Tier 3',
    colour: 'blue',
    passives: [
      '75% chance to save runes in combat',
      '75% chance to save ammunition in combat',
      '75% chance to save ectoplasm and runes when casting abilities and incantations',
      'All movement ability cooldowns are reduced to 4.2s',
      "Granted Nature's rune pouch",
    ],
  },
  {
    tier: 'God Tier 1',
    colour: 'god',
    passives: ['1x Blessing progression reset'],
  },
  {
    tier: 'Tier 5',
    colour: 'red',
    passives: [
      "All War's Wares rewards are unlocked",
      'Your maximum adrenaline is increased by +25%',
    ],
  },
  {
    tier: 'Tier 6',
    colour: 'green',
    passives: [
      'God books, scriptures, grimoires and scrimshaws no longer use charge',
      'Equipment no longer degrades',
    ],
  },
  {
    tier: 'Tier 7',
    colour: 'blue',
    passives: [
      '95% chance to save runes in combat',
      '95% chance to save ammunition in combat',
      '95% chance to save ectoplasm and runes when casting abilities and incantations',
    ],
  },
  {
    tier: 'God Tier 2',
    colour: 'god',
    passives: ['1x Blessing progression reset'],
  },
];

// Game-progression buckets used by `analysis.stageRank`. Blessings being
// resettable makes these three independent answers, not one averaged verdict.
export const BLESSING_STAGES = ['early', 'mid', 'late'];

// Reference baselines the `analysis` fields were reasoned against, surfaced here
// so the numbers in any UI tooltip can be explained rather than asserted. See
// `opus combat notes/01-combat-mechanics.md` for the derivations.
export const COMBAT_BASELINES = {
  early: { abilityDamage2h: 900, abilityDamageShield: 700, totalArmour: 1500, maxLifePoints: 7000 },
  mid: { abilityDamage2h: 1600, abilityDamageShield: 1150, totalArmour: 2300, maxLifePoints: 11000 },
  late: { abilityDamage2h: 2060, abilityDamageShield: 1376, totalArmour: 3400, maxLifePoints: 18000 },
};

export const BLESSINGS = [
  // ---------------------------------------------------------------- TIER ONE
  {
    name: 'Adrenaline Junkie',
    tier: 1,
    colour: 'red',
    icon: 'icons/blessings/Adrenaline_Junkie.webp',
    effects: [
      'Your maximum adrenaline is increased by +50%.',
      'Adrenaline generation is increased by 50%.',
    ],
    compactPoints: [
      '+50% maximum adrenaline',
      '+50% adrenaline generation',
    ],
    analysis: {
      summary:
        'Adrenaline cap 100% -> 150% and basics generate 13.5% instead of 9%, so you reach an ultimate in ~7 basics instead of ~11 and can bank an ultimate plus a threshold at once.',
      // Ultimates (Berserk/Sunshine/Death's Swiftness/Living Death) are the
      // multiplicative windows every style is built around, so uptime on them
      // is close to a straight DPM multiplier.
      // The real case for this blessing: the classic RS3 failure mode is casting
      // a 100% ultimate then spending the buffed window on basics rebuilding
      // adrenaline. At a 150% cap you cast Sunshine/Berserk and still have 50%
      // left for an immediate threshold. Swapping ~5 basics (~100% AD) for ~5
      // thresholds (~300% AD) inside a damage-buffed window is ~+1,000% AD per
      // ultimate, roughly +40k damage/min at 3,957 ability damage.
      estimatedGain: '~+40k damage/min via ultimate-window quality, plus more frequent ultimates',
      stageRank: { early: 3, mid: 3, late: 3 },
      // Amplifies a rotation you already have - worst early when your ability
      // bar is thin, best once you have a real rotation to accelerate. The only
      // T1 whose value scales with player execution.
      scalesWithSkill: true,
      requiresShield: false,
      synergies: [],
      // NOT a synergy with Avernic Rampage, despite appearances: adrenaline is
      // free during a Rampage window, so this contributes nothing inside one.
      antiSynergies: ['Avernic Rampage'],
      styleNotes: {},
    },
  },
  {
    name: 'Big Boned',
    tier: 1,
    colour: 'green',
    icon: 'icons/blessings/Big_Boned.webp',
    effects: [
      'Your maximum life points are increased by 50%.',
      'All damage you deal gains 5% of your maximum life points as bonus damage.',
    ],
    compactPoints: [
      '+50% maximum life points',
      'All damage gains +5% of max LP',
    ],
    analysis: {
      summary:
        'LP 13.5k -> 20k (power) or 18k -> 27k (tank), then every damage instance gains a flat 5% of that: roughly +1,000 to +1,350 per hit late game.',
      // The bonus is flat PER HIT, so multi-hit abilities multiply it - a
      // 5-hit ability gains +5,000-6,750. Flat damage also does not scale with
      // ultimate percentage multipliers, so its relative value declines as gear
      // and rotation improve, without ever becoming bad.
      estimatedGain: '+1,010 to +1,350 flat damage per hit (late game)',
      stageRank: { early: 2, mid: 2, late: 2 },
      scalesWithSkill: false,
      requiresShield: false,
      synergies: ['Splash Zone', 'Abyssal Cinders'],
      styleNotes: {
        necromancy:
          'Best T1 for necromancy - necro has the highest hit count in the game (conjures, DoTs, multi-hit spenders like Volley of Souls) and this pays out per hit.',
      },
    },
  },
  {
    name: "Teragard's Aegis",
    tier: 1,
    colour: 'blue',
    icon: 'icons/blessings/Teragard_Aegis.webp',
    effects: [
      'Your base ability damage is increased by 25% of your total armour value. This bonus is doubled while wielding a defender and tripled while wielding a shield.',
      'Your base health regeneration is increased by 2.5% of your maximum life points. This bonus is doubled while wielding a defender and tripled while wielding a shield.',
    ],
    compactPoints: [
      'Base ability damage +25% of total armour',
      'Base health regen +2.5% of max LP',
      'Both x2 with a defender, x3 with a shield',
    ],
    analysis: {
      summary:
        'The strongest single blessing in the set. At ~3,400 total armour a shield gives +2,550 ability damage - roughly doubling it - and because it feeds the BASE stat, every percentage-based ability and ultimate multiplier scales off it.',
      // The meta inversion: going main-hand + shield costs ~690 AD and three
      // abilities (Hurricane/Pulverise/Meteor Strike, Flurry/Bladed Dive), but
      // gains 2,550 - 725 = 1,825 AD. Net 2,785 -> 3,926 AD, i.e. +41%.
      // With this blessing, shields out-damage two-handers.
      estimatedGain: '+725 AD (2h) / +1,500 (defender) / +2,550 (shield), late game',
      stageRank: { early: 1, mid: 1, late: 1 },
      scalesWithSkill: false,
      requiresShield: false, // works without one, but triples with one
      shieldMultiplier: { none: 0.25, defender: 0.5, shield: 0.75 },
      synergies: ['Steadfast Will', 'Striking Light'],
      styleNotes: {
        necromancy:
          'Hard-capped at x1 (+725 AD, ~+34%): necromancy cannot equip a shield or defender, as the off-hand slot must hold a conduit (Skull lantern). Still good, no longer dominant.',
        melee:
          'Forfeits Ek-ZekKil (2h) and its Ashen Vow passive - run a t90-95 main-hand such as Dark Shard of Leng instead.',
        magic: 'Forfeits FSOA (2h) and its crit-damage passive, but Wild Magic still works with a shield.',
        ranged: 'Forfeits Bow of the Last Guardian (2h) - run Blightbound crossbow + Merciless kiteshield.',
      },
    },
  },

  // ---------------------------------------------------------------- TIER TWO
  {
    name: 'Abyssal Cinders',
    tier: 2,
    colour: 'red',
    icon: 'icons/blessings/Abyssal_Cinders.webp',
    effects: [
      'On hit: your attacks deal 15% of ability damage as bonus damage.',
      'On hit: your attacks have a 5% chance to trigger an Inferno of Zamorak.',
      'Inferno of Zamorak: deals 100-200% ability damage to a single target.',
    ],
    compactPoints: [
      'On hit: +15% of ability damage',
      'On hit: 5% chance of an Inferno of Zamorak',
      'Inferno: 100-200% ability damage, single target',
    ],
    analysis: {
      summary:
        'Clean unconditional damage with no build requirement: +310 (2h) to +590 (shield build) flat per hit, plus a ~150% AD proc worth 3,100-5,900.',
      // Proc rate depends on whether "on hit" rolls per hit or per attack - if
      // per hit, a 5-hit ability is 5 rolls (23% chance). Assumed per hit.
      //
      // KEY FRAMING vs Striking Light: this is an ABILITY-DAMAGE-scaling
      // blessing, Striking Light is an ARMOUR-scaling one. Teragard's Aegis
      // inflates ability damage, so Aegis makes this better and does almost
      // nothing for Striking Light's 250%-of-armour main term. Which wins comes
      // down to hits per 9s window (5 GCDs) at AD 3,957 / armour 3,400:
      //   melee  ~7.5 hits ->  6,681  (Striking Light 10,479 wins)
      //   magic  ~11  hits ->  9,799  (~tie)
      //   ranged ~12.5 hits -> 11,135 (Cinders wins)
      //   necro  ~12.5 hits -> 11,135 (Cinders wins)
      // Colour maths is unaffected: Aegis + Cinders + Steadfast Will is still
      // 2 blue -> Sacred Fervor.
      estimatedGain: '+594 per hit, plus a ~5,936 proc; ~11,135 per 9s in hit-dense rotations',
      stageRank: { early: 3, mid: 3, late: 2 },
      scalesWithSkill: false,
      requiresShield: false,
      synergies: ['Big Boned', "Teragard's Aegis"],
      styleNotes: {
        ranged: 'Best T2 for ranged - Rapid Fire and friends make it the most hit-dense style, which is exactly what this scales on.',
        necromancy: 'Beats Striking Light on raw damage for necromancy, but Striking Light is usually taken instead to route 1-of-each into Splash Zone.',
        melee: 'Loses to Striking Light - melee is hit-sparse (~1.5 hits/ability).',
      },
    },
  },
  {
    name: 'Barkscales',
    tier: 2,
    colour: 'green',
    icon: 'icons/blessings/Barkscales.webp',
    effects: [
      'Incoming damage is reduced by 10% of your armour value.',
      'After Barkscales reduces damage 5 times, unleash a Grasp of Guthix at your attackers location.',
      'Grasp of Guthix: deals poison damage equal to 80-120% of your ability damage in a 3x3 area.',
    ],
    compactPoints: [
      'Incoming damage -10% of armour value',
      'Every 5th reduction: Grasp of Guthix at the attacker',
      'Grasp: 80-120% ability damage as poison, 3x3',
    ],
    analysis: {
      summary:
        'Flat -300 damage per hit taken at ~3,000 armour. Most early- and mid-game monsters hit for under that, making you effectively immune to chip damage for most of a run.',
      // The flat reduction stacks additively on top of the multiplicative DR
      // from shields/prayers/tank armour. Grasp of Guthix fires constantly in
      // any busy fight and is genuine AoE damage, not a rider.
      estimatedGain: '-300 damage per hit taken; ~100% AD AoE proc every 5 hits',
      stageRank: { early: 2, mid: 2, late: 1 },
      // Overtakes Striking Light at endgame specifically because it makes the
      // 20 incoming hits Revenge needs survivable - see Steadfast Will.
      scalesWithSkill: false,
      requiresShield: false,
      synergies: ['Steadfast Will', 'Splash Zone'],
      styleNotes: {},
    },
  },
  {
    name: 'Striking Light',
    tier: 2,
    colour: 'blue',
    icon: 'icons/blessings/Striking_Light.webp',
    effects: [
      "Your basic attack's damage is increased by 40%",
      'Your basic attacks unleash a Light of Saradomin on your target. 9s cooldown.',
      'Light of Saradomin: deals damage equal to 40-60% of your ability damage, plus 250% of your armour value.',
    ],
    compactPoints: [
      'Basic attack damage +40%',
      'Basic attacks unleash Light of Saradomin, 9s cooldown',
      'Light: 40-60% ability damage + 250% of armour',
    ],
    analysis: {
      summary:
        'Light of Saradomin is ~10,400 damage every 9s late game (~4,100 even in early gear). Because basic attacks fire automatically in any rotation gap, the cooldown - not your skill - is the limiter.',
      // "Basic attack" is a specific defined term: the auto-triggered 1.8s basic
      // ability that replaced auto-attacks in the 2026 Combat Style
      // Modernisation. It is NOT all basic abilities, so line 1 buffs filler
      // only - meaningful early, near-irrelevant once a rotation is dense.
      // Line 2 is the real payload and never decays.
      estimatedGain: '~4,100 (early) / ~6,325 (mid) / ~10,463 (late) damage per 9s',
      stageRank: { early: 1, mid: 1, late: 2 },
      scalesWithSkill: false,
      requiresShield: false,
      synergies: ["Teragard's Aegis", 'Steadfast Will'],
      styleNotes: {
        necromancy:
          'Unaffected by the necromancy shield exclusion - it scales off armour, not off holding a shield. Full Deathwarden tank gives ~2,900 armour (~8,400 per proc), and Omni guard\'s Death Spark passive builds on Necromancy basic attacks, which line 1 buffs by 40%.',
      },
    },
  },

  // -------------------------------------------------------------- TIER THREE
  {
    name: 'Avernic Rampage',
    tier: 3,
    colour: 'red',
    icon: 'icons/blessings/Avernic_Rampage.webp',
    effects: [
      'On-attack: 5% chance to activate Avernic Rampage for 7.2s.',
      'Avernic Rampage: abilities and special attacks cost 0% adrenaline.',
    ],
    compactPoints: [
      'On attack: 5% chance to trigger, lasts 7.2s',
      'While active: abilities and specials cost 0% adrenaline',
    ],
    analysis: {
      summary:
        'A free SPECIAL ATTACK spam window. Specials have no global cooldown and can be cast back-to-back, so 7.2s of 0% adrenaline fits 3-4 specs: ~1,490% ability damage (~59,000) per window, free.',
      // The mechanic that makes this far better than it reads: per the wiki's
      // Special attack page, "no global cooldown exists" - since October 2022
      // specials cast back-to-back, and most have no cooldown at all (the only
      // listed exceptions are Seren godbow 30s, Zaros godsword 60s, Staff of
      // darkness 90s). So Rampage's 7.2s (12 ticks) at ~3 ticks/spec = 3-4 free
      // specials:
      //   Dragon claws "Slice & Dice"       50% adren, 400% AD avg, 4 hits
      //   Varanus's Mercy "The Final Flurry" 50% adren, 345% AD avg, +25-50% crit
      //   Statius's warhammer                35% adren, 160-180% + defence reduction
      // Alternate an EoF-stored spec with your wielded weapon's - a physical
      // copy of the weapon stored in your EoF can't be specced twice in a row.
      // Varanus's Mercy is a MAIN-HAND dagger, so it is shield-compatible and
      // slots straight into a Teragard's Aegis build.
      //
      // ~1.65 procs/min = ~97k damage/min gross, but it replaces ~12s of normal
      // rotation, so the honest net is ~+47k/min (+19%). Front-loaded burst,
      // which matters more for kill speed than the average suggests.
      estimatedGain: '~59,000 damage per window; ~+47k/min net (+19%)',
      stageRank: { early: 2, mid: 2, late: 2 },
      scalesWithSkill: true,
      requiresShield: false,
      synergies: ["Essence of Finality amulet", "Varanus's Mercy", 'Dragon claws'],
      styleNotes: {
        necromancy:
          'The only live T3 for necromancy, which cannot use Bash or Revenge. Necro also has two excellent spec weapons to spam (Omni guard, Devourer\'s Guard).',
      },
    },
  },
  {
    name: 'Eternal Sustenance',
    tier: 3,
    colour: 'green',
    icon: 'icons/blessings/Eternal_Sustenance.webp',
    effects: [
      'Food is no longer consumed when eaten.',
      'You no longer lose adrenaline when eating.',
    ],
    compactPoints: [
      'Food is not consumed when eaten',
      'No adrenaline lost when eating',
    ],
    analysis: {
      summary:
        'Infinite food from a single item and free eating (no -3% adrenaline). Enormous convenience and real effective survivability, but contributes zero damage.',
      // Usually a PLACEHOLDER, not a pick. With Soul Split (92 Prayer, reached
      // quickly in a Leagues run) and the damage output these blessings produce,
      // eating is rare enough that infinite food is close to a non-effect.
      //
      // The exception is the all-green immortality build (see The Undying in
      // blessingBuilds.js): Animate Dead (~308 flat DR from 5-piece Cryptbloom
      // at 99 Defence) plus Barkscales (~341) removes ~650 damage from every hit
      // BEFORE Cryptbloom's 24% percentage reduction, against a Big Boned life
      // pool of ~27,000. There, never consuming food and never losing adrenaline
      // to eating is the point rather than a consolation.
      estimatedGain: 'No damage contribution; near-nil once Soul Split is available',
      stageRank: { early: 1, mid: 3, late: 3 },
      scalesWithSkill: false,
      requiresShield: false,
      synergies: ['Adrenaline Junkie', 'Big Boned'],
      styleNotes: {},
    },
  },
  {
    name: 'Steadfast Will',
    tier: 3,
    colour: 'blue',
    icon: 'icons/blessings/Steadfast_Will.webp',
    effects: [
      "Empowers the 'Bash', 'Preparation', 'Reflect' and 'Revenge' abilities.",
      'Bash: deals additional damage equal to 350-450% of your armour value.',
      'Preparation: on activation reduces the cooldown of all abilities by 12s.',
      'Reflect: reflect 100% of incoming damage + 10-15% of your armour value as additional damage. Reflected damage hits up to 8 additional targets within 3 tiles of you.',
      'Revenge: the duration and cooldown of this ability is doubled. The maximum number of stacks is increased to 20.',
    ],
    compactPoints: [
      'Bash: +350-450% of armour value as damage',
      'Preparation: -12s off every ability cooldown',
      'Reflect: 100% of incoming damage +10-15% of armour',
      'Reflect also hits 8 extra targets within 3 tiles',
      'Revenge: double duration and cooldown, max 20 stacks',
    ],
    analysis: {
      summary:
        'The most powerful T3 by a wide margin. Revenge at 20 stacks is +100% damage (up from +50%), Bash gains +11,900-15,300, Preparation becomes a cooldown engine, and Reflect becomes an 8-target AoE.',
      // THE REVENGE ENGINE, the strongest interaction in the set:
      //   Revenge cd 90s -> 63s with Sacred Fervor, duration 39.6s.
      //   Preparation cd 20.4s -> 14.3s, each cast removing 12s from everything.
      //   Effective Revenge cd ~= 63 / (1 + 12/14.3) ~= 34s < 39.6s duration.
      // That is permanent 100% uptime on a +100% damage buff. Barkscales makes
      // the 20 incoming hits needed to reach max stacks nearly free.
      estimatedGain: 'Up to permanent +100% damage via Revenge, with Sacred Fervor + Preparation',
      stageRank: { early: 3, mid: 1, late: 1 },
      scalesWithSkill: true,
      requiresShield: true,
      synergies: ['Sacred Fervor', 'Barkscales', "Teragard's Aegis"],
      styleNotes: {
        necromancy:
          'Near-dead for necromancy: Bash and Revenge both require a real shield, which necro cannot equip. The Bone Shield incantation only enables non-offensive shield abilities, so only Preparation and Reflect work - roughly 35% of the card.',
      },
      caveats: [
        'Revenge is only 50% effective with a defender (+50% not +100%) - it wants a real shield.',
        'Bash requires a real shield; the Bone Shield incantation does not satisfy it, as Bash is tagged offensive.',
        'Requires actually taking hits - weaker at bosses you can fully avoid.',
      ],
    },
  },
];

// God Tier One powers, awarded automatically from the colours of your three
// blessing picks rather than chosen directly. Card text is verbatim; `analysis`
// is app-added.
export const GOD_TIER_BLESSINGS = [
  {
    name: "Demon's Mark",
    tier: 'god',
    colour: 'red',
    icon: 'icons/blessings/Demons_Mark.webp',
    effects: ["Your accuracy is always calculated using your target's weakness."],
    analysis: {
      summary:
        'Removes the combat triangle from the accuracy equation - you never take an accuracy penalty for using the "wrong" style.',
      // Strategically real under region locking: it lets you commit to ONE
      // style's gear and use it everywhere instead of maintaining four loadouts
      // from a limited region pool. But accuracy is the stat that saturates, so
      // its marginal value at BIS approaches zero.
      rank: 3,
      estimatedGain: 'Situational - highest value mid-game and for one-style accounts, near-zero at BIS',
    },
  },
  {
    name: 'Splash Zone',
    tier: 'god',
    colour: 'green',
    icon: 'icons/blessings/Splash_Zone.webp',
    effects: [
      'Area-of-effect and multi-target attacks deal 30% more damage.',
      'Area of effect abilities deal 5% more damage per tile the target occupies.',
    ],
    analysis: {
      summary:
        'Highest ceiling of the three. A clean +30% to a large slice of every rotation, plus a footprint bonus that is substantial against the large bosses RS3 endgame is built around.',
      // Per-tile reading is the big unknown: a 3x3 boss = 9 tiles = +45%
      // (assumed base case), a 5x5 boss = 25 tiles = +125%. Combined that is
      // +75% to +155% on AoE abilities against large bosses. Many of the
      // hardest-hitting abilities in the game are multi-target.
      //
      // CRITICAL DISTINCTION: multi-target is NOT multi-hit. Dragon claws is
      // 4 hits on ONE target, so Splash Zone does not boost it (same for
      // Varanus's Mercy). Real synergies: Seren godbow's Crystal Rain spec
      // (5 arrows, and available via EoF so it works in a shield build),
      // Steadfast Will's Reflect (8 additional targets - Steadfast Will
      // literally converts Reflect into an AoE ability), Barkscales' Grasp of
      // Guthix (3x3), necro's Death Skulls / Volley of Souls / Command
      // Skeleton Warrior, magic's Chain / Detonate / Corruption Blast,
      // ranged's Ricochet / Bombardment / Corruption Shot.
      rank: 2,
      estimatedGain: '+75% to +155% on AoE abilities vs large bosses (3x3 reading assumed)',
      caveats: [
        'The exact reading of "per tile" is unconfirmed and is the number most likely to be narrower than it sounds.',
        'Weaker at genuinely single-target 1x1 content.',
        'Boosts multi-TARGET attacks, not multi-HIT ones - it does nothing for dragon claws or Varanus\'s Mercy.',
        "Several of the best AoE abilities (Hurricane, Quake, Bombardment) are 2h-only, so this pulls toward a two-handed build while Teragard's Aegis pulls toward a shield. The two are opposed.",
      ],
    },
  },
  {
    name: 'Sacred Fervor',
    tier: 'god',
    colour: 'blue',
    icon: 'icons/blessings/Sacred_Fervor.webp',
    effects: [
      'Melee ability and special attack cooldowns are reduced by 30%.',
      'Magic ability and special attack cooldowns are reduced by 30%.',
      'Ranged ability and special attack cooldowns are reduced by 30%',
      'Necromancy ability and special attack cooldowns are reduced by 30%.',
    ],
    analysis: {
      summary:
        'Unconditional, universal, no drawback, benefits every style at every stage - and it is the multiplier that turns Steadfast Will\'s Preparation loop into permanent Revenge uptime.',
      rank: 1,
      estimatedGain: '+15-25% DPM standalone; enables the Revenge engine with Steadfast Will',
    },
  },
];

// Resolve which God Tier One power a set of picks awards.
// Rule: a colour with 2+ picks wins; 1-of-each falls back to green.
// `picks` is an array of blessing names, colours, or blessing objects.
export function resolveGodTier(picks) {
  const colours = (picks || [])
    .map((pick) => {
      if (!pick) return null;
      if (typeof pick === 'object') return pick.colour ?? null;
      if (BLESSING_COLOURS.includes(pick)) return pick;
      return BLESSINGS.find((blessing) => blessing.name === pick)?.colour ?? null;
    })
    .filter(Boolean);

  if (colours.length === 0) return null;

  const counts = colours.reduce((acc, colour) => {
    acc[colour] = (acc[colour] || 0) + 1;
    return acc;
  }, {});

  const majority = BLESSING_COLOURS.find((colour) => (counts[colour] || 0) >= 2);
  const winner = majority ?? 'green';

  return GOD_TIER_BLESSINGS.find((blessing) => blessing.colour === winner) ?? null;
}

// Curated 3-pick packages from the ranking analysis, in order. `picks` are
// blessing names; `godTier` is what resolveGodTier() returns for them.
export const BLESSING_PACKAGES = [
  {
    name: 'The Warden',
    picks: ["Teragard's Aegis", 'Barkscales', 'Steadfast Will'],
    godTier: 'Sacred Fervor',
    bestFor: ['melee', 'ranged', 'magic'],
    stage: 'late',
    summary:
      'The full armour-stacking shield build with Barkscales as the enabler. Sacred Fervor plus Preparation collapses Revenge\'s cooldown below its duration for permanent +100% damage, and Barkscales makes the incoming hits it needs nearly free.',
  },
  {
    name: 'The Bulwark',
    picks: ["Teragard's Aegis", 'Striking Light', 'Steadfast Will'],
    godTier: 'Sacred Fervor',
    bestFor: ['melee', 'ranged', 'magic'],
    stage: 'mid',
    summary:
      'Mono-blue. Every point of armour pays into three blessings at once. Better than The Warden in the mid game and in content where you take little incoming damage; worse where Revenge uptime matters more than proc damage.',
  },
  {
    name: 'The Titan',
    picks: ['Big Boned', 'Barkscales', 'Steadfast Will'],
    godTier: 'Splash Zone',
    bestFor: ['melee', 'ranged', 'magic'],
    stage: 'late',
    summary:
      'The deliberate route to Splash Zone. Reflect (8 extra targets) and Grasp of Guthix (3x3) are both multi-target so Splash Zone amplifies them, while Big Boned adds ~+1,100 to every splat. Without Aegis, though, taking a shield is a pure ability-damage loss.',
  },
  {
    name: 'The Furnace',
    picks: ['Adrenaline Junkie', 'Abyssal Cinders', 'Avernic Rampage'],
    godTier: "Demon's Mark",
    bestFor: ['necromancy', 'melee', 'ranged', 'magic'],
    stage: 'late',
    summary:
      'The only package requiring no build change at all - keep your two-hander and the standard meta rotation. Roughly +45-60% damage with zero setup cost, and Demon\'s Mark lets you commit to one style\'s gear for everything.',
  },
  {
    name: 'The Reaper',
    picks: ['Big Boned', 'Striking Light', 'Avernic Rampage'],
    godTier: 'Splash Zone',
    bestFor: ['necromancy'],
    stage: 'late',
    summary:
      "Necromancy's best-in-tier picks happen to be one of each colour, landing on Splash Zone - which suits necro well (Death Skulls, Volley of Souls, conjures, large bosses). Swap Big Boned for Teragard's Aegis to reach Sacred Fervor instead.",
  },
  {
    name: 'The Tourist',
    picks: ["Teragard's Aegis", 'Striking Light', 'Eternal Sustenance'],
    godTier: 'Sacred Fervor',
    bestFor: ['melee', 'ranged', 'magic', 'necromancy'],
    stage: 'early',
    summary:
      'The two strongest early blessings - both armour-scaled, and armour is disproportionately high relative to ability damage early - plus infinite food, still landing on Sacred Fervor. Run this for the first half of the league, then reset Eternal Sustenance.',
  },
];

// Armour maths lives in utils/gearStats.js, which the gear planner already
// uses - re-exported here so blessing code has one obvious import without
// duplicating the formula.
//
// Two things worth knowing, because an earlier version of this file got both
// wrong:
//   - `getArmourRating(item, style)` is STYLE-AWARE. `stats.defence` is keyed
//     by attack style, so a melee kiteshield genuinely has a large negative
//     magic rating. Taking Math.max() across the keys would silently credit a
//     melee shield's 491.6 to a magic loadout.
//   - `getSkillArmour(D)` = D^3/1250 + 4D + 40 is the flat baseline from the
//     Defence skill alone, before any gear (1212.24 at 99, shown in-game as
//     1213). Assume 99 Defence unless the player says otherwise.
// Extension is required, not optional: this module is imported by the og-image
// renderer (server/src/lib/shareBuild.js), which runs under plain `node` rather
// than Vite - Node's ESM resolver does not add `.js` for you, so an
// extensionless specifier here crashes that route at request time.
export { getArmourRating, getSkillArmour, getTotalArmour } from '../utils/gearStats.js';

// Recommended builds for the planned "Blessing guides" page.
//
// Deliberately NOT one entry per style: melee, magic and ranged all run the
// same shield build and differ only in a single T2 swap, so repeating it three
// times would be noise. `t2SwapRule` carries that one difference.
//
// Every loadout item name matches a gear.js entry exactly, so a UI can resolve
// them straight out of GEAR and reuse the existing region-tag components.
// gear.js remains the source of truth for actual availability.
export const BLESSING_BUILDS = [
  {
    id: 'warden',
    name: 'The Warden',
    styles: ['melee', 'magic', 'ranged'],
    // T2 is style-dependent - see t2SwapRule. Both options give 2+ blue, so the
    // god power is Sacred Fervor either way.
    picks: ["Teragard's Aegis", null, 'Steadfast Will'],
    godTier: 'Sacred Fervor',
    usesShield: true,
    summary:
      'The armour-stacking shield build. Aegis triples off any shield for ~+2,600 ability damage, Steadfast Will turns Revenge into a +100% damage buff, and Sacred Fervor plus Preparation holds it at near-permanent uptime.',
    // The ONLY difference between the three styles. Striking Light scales off
    // armour; Abyssal Cinders scales off ability damage x hit count. Numbers are
    // damage per 9s window (5 GCDs) at AD ~3,950 / armour ~3,470.
    t2SwapRule: {
      rule: 'Take Striking Light if your rotation averages under ~2 hits per ability, Abyssal Cinders if over ~2.5.',
      melee: { take: 'Striking Light', hitsPerAbility: 1.5, strikingLight: 10479, abyssalCinders: 6681 },
      magic: { take: 'either', hitsPerAbility: 2.2, strikingLight: 10479, abyssalCinders: 9799 },
      ranged: { take: 'Abyssal Cinders', hitsPerAbility: 2.5, strikingLight: 10479, abyssalCinders: 11135 },
    },
    // Aegis converts armour into damage, so tank armour is no longer a DPS loss:
    // Masterwork -> Teralith gains +238 AD from Aegis and loses ~112 damage
    // bonus, a net +126 AD plus far better survivability and a bigger LP pool.
    armourNote:
      'Prefer TANK armour over power. With Aegis, Teralith/Primal nets ~+126 ability damage over Masterwork AND survives far better.',
    tradeoffs: [
      'Melee loses Greater Flurry (dual-wield), which extends Berserk 19.8s -> 35.4s. The biggest single cost of this build.',
      'Melee also loses Hurricane, Meteor Strike and Bladed Dive.',
      'Magic forfeits FSOA and its crit passive; ranged forfeits Bow of the Last Guardian and Perfect Equilibrium.',
      'Partly offset by Sacred Fervor cutting Berserk cooldown 60s -> 42s: more frequent, shorter windows.',
    ],
    loadout: {
      late: {
        melee: { weapon: 'Abyssal Scourge', offhand: 'Malevolent Kiteshield', back: 'Igneous Kal-Ket' },
        magic: { weapon: 'Roar of Awakening', offhand: 'Elder rune round shield', back: 'Igneous Kal-Mej' },
        ranged: { weapon: 'Blightbound crossbow', offhand: 'Merciless kiteshield', back: 'Igneous Kal-Xil' },
        shared: { neck: 'Essence of Finality amulet (or)', pocket: 'Underworld Grimoire 4' },
      },
      midLate: {
        melee: { weapon: 'Drygore Rapier', offhand: 'Bandos Warshield' },
        magic: { weapon: 'Seismic wand', offhand: 'Arcane spirit shield' },
        ranged: { weapon: 'Ascension crossbow', offhand: 'Elder rune round shield' },
      },
    },
    regionNotes: [
      'Any shield triples Aegis, so the cheapest works: Elder rune round shield needs light animica (anachronia/tirannwn/kharidianDesert) OR the Endless Harvest / Transmutation relic, i.e. no region at all.',
      'Melee and magic main-hands are both Misthalin (Abyssal Scourge, Roar of Awakening). Ranged is the only style whose main-hand costs an optional region.',
      'Defenders are a trap: only Dragon defender (asgarnia) is realistically reachable, it gives x2 not x3, and Revenge is only 50% effective with one.',
    ],
  },
  {
    id: 'berserker',
    name: 'The Berserker',
    styles: ['melee', 'magic', 'ranged', 'necromancy'],
    picks: ['Adrenaline Junkie', 'Abyssal Cinders', 'Avernic Rampage'],
    godTier: "Demon's Mark",
    usesShield: false,
    summary:
      'Keeps the standard PvME rotation completely intact - dual-wield or two-hand, whatever the meta says. Nothing changes about how you play; the blessings just make it stronger.',
    // Adrenaline Junkie is at its best here specifically: Greater Flurry is a
    // threshold that EXTENDS Berserk, so more adrenaline literally means longer
    // Berserk. Cast at 150%, keep 50%, chain Greater Flurry toward 35.4s.
    tradeoffs: [
      'Lowest raw ceiling of the three builds - no armour scaling at all.',
      "Demon's Mark is the weakest god power at BIS, though it does fix melee's accuracy problem and lets one style's gear cover everything.",
    ],
    loadout: {
      late: {
        melee: { weapon: 'Dark Shard of Leng', offhand: 'Dark Sliver of Leng', back: 'Igneous Kal-Ket' },
        magic: { weapon: 'Fractured Staff of Armadyl', back: 'Igneous Kal-Mej' },
        ranged: { weapon: 'Bow of the Last Guardian', back: 'Igneous Kal-Xil' },
        necromancy: { weapon: 'Omni guard', offhand: 'Soulbound lantern', back: 'Igneous Kal-Mor' },
        shared: { neck: 'Essence of Finality amulet (or)', pocket: 'Underworld Grimoire 4' },
      },
    },
    regionNotes: [
      'Every weapon here is Misthalin except the Leng off-hand (Misthalin + wilderness) - this build is close to region-free.',
    ],
  },
  {
    id: 'avalanche',
    name: 'The Avalanche',
    styles: ['melee', 'magic', 'ranged', 'necromancy'],
    picks: ['Big Boned', 'Barkscales', 'Avernic Rampage'],
    godTier: 'Splash Zone',
    usesShield: false,
    summary:
      "Two-handed and AoE-focused. The coherent case for keeping a two-hander: Splash Zone's best abilities (Hurricane, Quake, Bombardment) are exactly the 2h-only ones a shield build gives up.",
    tradeoffs: [
      'Weakest single-target damage of the three - Avernic Rampage is in the build specifically to cover that.',
      "Multi-target is NOT multi-hit: Splash Zone does nothing for dragon claws or Varanus's Mercy.",
    ],
    loadout: {
      late: {
        melee: { weapon: 'Ek-ZekKil', back: 'Igneous Kal-Ket' },
        magic: { weapon: 'Fractured Staff of Armadyl', back: 'Igneous Kal-Mej' },
        ranged: { weapon: 'Bow of the Last Guardian', back: 'Igneous Kal-Xil' },
        necromancy: { weapon: 'Omni guard', offhand: 'Soulbound lantern', back: 'Igneous Kal-Mor' },
        shared: { neck: 'Essence of Finality amulet (or)', pocket: 'Underworld Grimoire 4' },
      },
    },
    regionNotes: [
      'EoF Seren godbow (Crystal Rain, 5 arrows) is a true multi-target spec, so Splash Zone boosts it - unlike dragon claws.',
    ],
  },
  {
    id: 'reaper',
    name: 'The Reaper',
    styles: ['necromancy'],
    picks: ['Big Boned', 'Striking Light', 'Avernic Rampage'],
    godTier: 'Splash Zone',
    usesShield: false,
    summary:
      'Necromancy cannot equip a shield, so The Warden was never available to it. Its best-in-tier picks land one-of-each, routing to Splash Zone - which suits necro perfectly (Death Skulls, Volley of Souls, conjures, large bosses).',
    tradeoffs: [
      "Abyssal Cinders actually out-damages Striking Light for necro (~83 hits/min), but taking it gives 2 red and trades Splash Zone for Demon's Mark. Swap only if you want pure single-target consistency.",
    ],
    loadout: {
      late: {
        necromancy: {
          weapon: 'Omni guard',
          offhand: 'Soulbound lantern',
          back: 'Igneous Kal-Mor',
          neck: 'Essence of Finality amulet (or)',
          ring: "Occultist's ring",
          pocket: 'Underworld Grimoire 4',
          ammo: "Zemouregal's nexus",
        },
      },
      midLate: {
        necromancy: { weapon: 'Death guard (tier 90)', offhand: 'Skull lantern (tier 90)' },
      },
    },
    regionNotes: [
      'Necromancy is nearly 100% Misthalin, so it costs ZERO optional regions - picking necro as your main frees all three optional picks for skilling/utility.',
    ],
  },
];
