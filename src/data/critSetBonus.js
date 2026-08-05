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
