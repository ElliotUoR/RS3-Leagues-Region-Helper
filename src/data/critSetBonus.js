import { GEAR_SET_GROUPS } from './gearSets.js';
// The armour set effects that grant base critical strike chance, and the rules
// governing how they combine.
//
// Two sets pay into ONE bonus. Warpriest of Tuska's own effect is Tuska's
// Might; Sliske's Parody replicates a Warpriest set effect rather than adding
// its own, which is why the two do not stack - wearing both does not give 12%.
// The build takes whichever set is paying more, and nothing else.
//
// Pieces only count toward THEIR OWN set. Three Tuska plus two Sliske is a
// three-piece Tuska set (3%) and a dead two-piece Sliske one, not a five-piece
// anything. Getting that wrong would badly overvalue a mixed loadout, which is
// exactly the loadout someone assembles by accident.

// The ceiling both sets share. Tuska reaches it with six pieces, Sliske with
// three - which is the whole difference between them.
export const CRIT_SET_CAP = 6;

// Below this, a set pays nothing at all. It is a threshold rather than a
// gentle ramp: two Tuska pieces are worth 0%, not 2%.
export const CRIT_SET_MIN_PIECES = 3;

export const CRIT_SETS = [
  {
    name: 'Warpriest of Tuska',
    effect: "Tuska's Might",
    // "+1% base critical strike chance per piece, from three pieces up to six."
    perPiece: 1,
    pieces: [
      'Warpriest of Tuska helm',
      'Warpriest of Tuska cuirass',
      'Warpriest of Tuska robe legs',
      'Warpriest of Tuska gauntlets',
      'Warpriest of Tuska boots',
      'Warpriest of Tuska cape',
    ],
  },
  {
    name: "Sliske's anima core",
    effect: "Sliske's Parody",
    // Three pieces for the full 6%, so each is worth double a Tuska piece.
    perPiece: 2,
    // Base and refined count as ONE set. They are the same armour at two
    // upgrade levels rather than two competing sets, and the refined pieces
    // degrade back into the base ones - so a player mid-degrade would
    // otherwise watch their set effect vanish.
    pieces: [
      'Anima core helm of Sliske',
      'Anima core body of Sliske',
      'Anima core legs of Sliske',
      'Refined anima core helm of Sliske',
      'Refined anima core body of Sliske',
      'Refined anima core legs of Sliske',
    ],
  },
];

// Chaotic Insight (God Tier Two, red): "Each combat equipment item counts as 2
// additional pieces towards its set effect." So one worn piece counts as three
// - which is enough on its own to clear the three-piece threshold, and makes a
// single Sliske core worth the full 6%.
export const CHAOTIC_INSIGHT = 'Chaotic Insight';
export const CHAOTIC_INSIGHT_EXTRA_PIECES = 2;

// Every armour set in this planner that carries a real SET BONUS, by the
// display name gearSets.js groups its pieces under.
//
// Curated rather than derived from `stats.setEffect`, because that field is
// also used for plain item notes - "Doesn't degrade", "Magic-only Lunar cape",
// "Base form of Khopesh of Tumeken". Filtering on its presence would list a
// dozen sets that have no bonus for Chaotic Insight to boost.
//
// The list names sets, never pieces: membership stays in GEAR_SET_GROUPS so
// there is one place to add armour. Nothing here needs a modelled effect - the
// point is to say "+N pieces to this set", which is true whether or not this
// app knows what the set does. Only the three in CRIT_SETS and Achto have their
// resulting effect costed out; see the Chaotic Insight card.
// Reconciled against runescape.wiki/w/Set_bonus, which lists the sets that
// have one. Names here are gearSets.js GROUP names, which do not always match
// the wiki's wording ("Superior tetsu armour" is 'Superior tetsu gear' here,
// the six Barrows sets are one 'Barrows Items' group).
//
// Two deliberate departures from that page:
//   - 'Masterwork ranged armour' is included even though the page's Ranged
//     column omits it, because the item pages themselves describe the effect
//     (Masterwork ranged body: "per piece worn, 10% of the incoming damage is
//     delayed"). A per-item page beats a summary table.
//   - 'Masterwork armour' - the plain MELEE set - is excluded. It is absent
//     from that page and its own article describes no set effect; the
//     masterwork melee benefit is Masterworked Mending on the weapons.
export const SET_EFFECT_GROUPS = new Set([
  'Achto Primeval armour',
  'Achto Tempest armour',
  'Achto Teralith armour',
  'Anima core armour of Sliske',
  'Refined anima core armour of Sliske',
  'Cryptbloom armour',
  'Deathdealer armour (tier 70)',
  'Deathdealer armour (tier 80)',
  'Deathdealer armour (tier 90)',
  'Deathwarden armour (tier 70)',
  'Deathwarden armour (tier 80)',
  'Deathwarden armour (tier 90)',
  'Dino boots',
  'Enhanced Dino boots',
  // Ranged and magic only. The MELEE Masterwork set has no set effect - its
  // wiki page describes none, and the masterwork weapons carry Masterworked
  // Mending instead - so 'Masterwork armour' and 'Trimmed masterwork armour'
  // are deliberately absent.
  'Masterwork ranged armour',
  'Masterwork mage armour',
  'Elite Tectonic armour',
  'Tectonic armour',
  "First Necromancer's gear",
  'Primeval armour',
  'Tempest armour',
  "Tumeken's resplendence",
  'Vestments of havoc',
  'Warpriest of Tuska',
  // All six Barrows brothers are one group here, and every one of them has a
  // set effect.
  'Barrows Items',
  'Teralith armour',
  'Trimmed masterwork armour',
  'Dracolich armour',
  'Elite dracolich armour',
  'Sirenic armour',
  'Elite sirenic armour',
  'Superior Death Lotus armour',
  "Superior seasinger's gear",
  'Superior tetsu gear',
  // The lower Deathwarden tiers carry the same per-piece dodge effect as the
  // three already listed above, just at a smaller percentage.
  'Deathwarden armour (tier 50)',
  'Deathwarden armour (tier 60)',
]);

// Every set-bonus armour set worn, and how many pieces of each - the input to
// Chaotic Insight's "+2 additional pieces per item".
//
// Sorted by piece count so the set the player has committed to leads.
export function getWornSetEffects(equipped = {}) {
  const counts = new Map();
  for (const item of Object.values(equipped)) {
    const set = GEAR_SET_GROUPS[item?.name];
    if (!set || !SET_EFFECT_GROUPS.has(set)) continue;
    counts.set(set, (counts.get(set) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([set, worn]) => ({ set, worn, granted: worn * CHAOTIC_INSIGHT_EXTRA_PIECES }))
    .sort((a, b) => b.worn - a.worn);
}

// How many pieces of a set are worn, and what that is worth.
//
// `chaoticInsight` multiplies the COUNT, not the payout, which is the whole
// point of the effect - it is what lets one piece clear a three-piece gate.
export function getCritSetBonus(equipped = {}, { chaoticInsight = false } = {}) {
  const wornNames = new Set(
    Object.values(equipped)
      .map((item) => item?.name)
      .filter(Boolean),
  );

  const results = CRIT_SETS.map((set) => {
    const worn = set.pieces.filter((piece) => wornNames.has(piece)).length;
    const counted = chaoticInsight ? worn * (1 + CHAOTIC_INSIGHT_EXTRA_PIECES) : worn;
    const active = counted >= CRIT_SET_MIN_PIECES;
    return {
      set: set.name,
      effect: set.effect,
      worn,
      counted,
      active,
      chance: active ? Math.min(counted * set.perPiece, CRIT_SET_CAP) : 0,
    };
  });

  // Shared, not summed - see the file header. Ties go to the first, which only
  // happens when both are already at the cap and the answer is the same either
  // way.
  const best = results.reduce((a, b) => (b.chance > a.chance ? b : a));
  return {
    chance: best.chance,
    best: best.chance > 0 ? best : null,
    sets: results.filter((r) => r.worn > 0),
    chaoticInsight,
  };
}
