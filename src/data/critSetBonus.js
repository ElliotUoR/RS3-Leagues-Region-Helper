import { GEAR_SET_GROUPS } from './gearSets.js';

// The armour set effects that grant base critical strike chance.
//
// Two INDEPENDENT groups, each containing sets that share one bonus:
//
//   Tuska's Might / Sliske's Parody   - Warpriest of Tuska, Sliske's anima cores
//   Fracture Point                    - Tectonic, Elite Tectonic
//
// Within a group the sets do NOT stack - the build takes whichever is paying
// more and nothing else. Sliske's Parody replicates a Warpriest set effect
// rather than adding its own, and Elite Fracture Point is the upgraded form of
// Fracture Point, so in both cases wearing two is wearing one better one.
//
// ACROSS groups they DO stack: Tuska's Might and Fracture Point are different
// effects. It is a real loadout too - Warpriest is hybrid and covers hands,
// feet and back, which Tectonic's three robe slots leave free.
//
// Pieces only count toward THEIR OWN set. Three Tuska plus two Sliske is a
// three-piece Tuska set and a dead two-piece Sliske one, not a five-piece
// anything. Getting that wrong would badly overvalue a mixed loadout, which is
// exactly the loadout someone assembles by accident.

// Chaotic Insight (God Tier Two, red): "Each combat equipment item counts as 2
// additional pieces towards its set effect." So one worn piece counts as three.
export const CHAOTIC_INSIGHT = 'Chaotic Insight';
export const CHAOTIC_INSIGHT_EXTRA_PIECES = 2;

// Sets are declared by the gearSets.js GROUP names their pieces belong to, so
// membership lives in one place and adding armour is one edit there. A set can
// span several groups - the base and refined anima cores are the same armour at
// two upgrade levels (and refined degrades back into base), so splitting them
// would make a set effect vanish mid-degrade.
export const CRIT_SET_GROUPS = [
  {
    id: 'tuska',
    // Below three pieces this pays NOTHING - a threshold, not a gentle ramp:
    // two Tuska pieces are worth 0%, not 2%.
    minPieces: 3,
    // "+1% per piece from three up to six" - both sets share the ceiling.
    cap: 6,
    sets: [
      {
        name: 'Warpriest of Tuska',
        effect: "Tuska's Might",
        perPiece: 1,
        groups: ['Warpriest of Tuska'],
      },
      {
        name: "Sliske's anima core",
        effect: "Sliske's Parody",
        perPiece: 2,
        groups: ['Anima core armour of Sliske', 'Refined anima core armour of Sliske'],
      },
    ],
  },
  {
    id: 'fracture',
    // Every piece pays from the first - the effect text is "per piece worn"
    // with no minimum, unlike Tuska's Might.
    minPieces: 1,
    // NO CAP. Worn, the three robe slots limit Elite Tectonic to 6% on their
    // own, which is why its item text says "up to 6%" - but that is the slot
    // count talking, not a rule. Chaotic Insight counts each piece three times,
    // and nothing in the effect stops the total climbing: three Elite Tectonic
    // pieces count as nine and pay 18%.
    cap: null,
    sets: [
      {
        name: 'Tectonic armour',
        effect: 'Fracture Point',
        perPiece: 1,
        groups: ['Tectonic armour'],
      },
      {
        name: 'Elite Tectonic armour',
        effect: 'Elite Fracture Point',
        perPiece: 2,
        groups: ['Elite Tectonic armour'],
      },
    ],
  },
];

// Every armour set in this planner that carries a real SET BONUS, by the
// display name gearSets.js groups its pieces under.
//
// Curated rather than derived from `stats.setEffect`, because that field is
// also used for plain item notes - "Doesn't degrade", "Magic-only Lunar cape",
// "Base form of Khopesh of Tumeken". Filtering on its presence would list a
// dozen sets that have no bonus for Chaotic Insight to boost.
//
// Reconciled against runescape.wiki/w/Set_bonus. Two deliberate departures:
// 'Masterwork ranged armour' is included even though that page's Ranged column
// omits it, because the item pages themselves describe the effect; and the
// plain MELEE 'Masterwork armour' is excluded, being absent from the page with
// no set effect on its own article.
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
  'Deathwarden armour (tier 50)',
  'Deathwarden armour (tier 60)',
]);

// How many distinct items the planner carries for a set - its natural ceiling
// when worn. Derived rather than written down, so adding a piece to gear.js
// moves it. A set spanning two upgrade groups (the anima cores) would double
// count, so its groups are measured as one shared list of slots.
function setSize(set) {
  const names = new Set();
  for (const [item, group] of Object.entries(GEAR_SET_GROUPS)) {
    if (set.groups.includes(group)) names.add(item.replace(/^(Elite|Refined|Superior) /i, '').toLowerCase());
  }
  return names.size;
}

function wornCounts(equipped) {
  const counts = new Map();
  for (const item of Object.values(equipped)) {
    const group = GEAR_SET_GROUPS[item?.name];
    if (!group) continue;
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return counts;
}

// Every set-bonus armour set worn, and how many pieces of each - the input to
// Chaotic Insight's "+2 additional pieces per item".
//
// Sorted by piece count so the set the player has committed to leads.
export function getWornSetEffects(equipped = {}) {
  const counts = wornCounts(equipped);
  return [...counts.entries()]
    .filter(([group]) => SET_EFFECT_GROUPS.has(group))
    .map(([set, worn]) => ({ set, worn, granted: worn * CHAOTIC_INSIGHT_EXTRA_PIECES }))
    .sort((a, b) => b.worn - a.worn);
}

// What each crit set is worth, per group, and the total.
//
// `chaoticInsight` multiplies the COUNT, not the payout, which is the whole
// point of the effect - it is what lets one piece clear a three-piece gate, and
// what takes an uncapped set past what its slots could otherwise reach.
export function getCritSetBonus(equipped = {}, { chaoticInsight = false } = {}) {
  const counts = wornCounts(equipped);
  const multiplier = chaoticInsight ? 1 + CHAOTIC_INSIGHT_EXTRA_PIECES : 1;

  const groups = CRIT_SET_GROUPS.map((group) => {
    const sets = group.sets.map((set) => {
      const worn = set.groups.reduce((sum, name) => sum + (counts.get(name) ?? 0), 0);
      const counted = worn * multiplier;
      const active = worn > 0 && counted >= group.minPieces;
      const raw = counted * set.perPiece;
      let chance = 0;
      if (active) chance = group.cap == null ? raw : Math.min(raw, group.cap);
      return {
        set: set.name,
        effect: set.effect,
        groupId: group.id,
        // The gearSets.js groups this set is made of, so a caller holding a
        // worn group name can find its crit entry. The display name above is
        // not that name - "Sliske's anima core" covers two gear groups and
        // matches neither of them by string.
        groups: set.groups,
        // How many pieces of this set the planner actually has. Above it, a
        // total can only have come from counting pieces more than once.
        size: setSize(set),
        worn,
        counted,
        active,
        capped: group.cap != null && raw > group.cap,
        chance,
      };
    });
    // Shared, not summed - see the file header. Ties go to the first, which
    // only happens when both are already at the same figure anyway.
    const best = sets.reduce((a, b) => (b.chance > a.chance ? b : a), sets[0]);
    return { id: group.id, cap: group.cap, minPieces: group.minPieces, sets, best: best.chance > 0 ? best : null };
  });

  const active = groups.map((g) => g.best).filter(Boolean);
  return {
    chance: active.reduce((sum, b) => sum + b.chance, 0),
    // Every group that is paying, so the crit breakdown can list one line each
    // rather than collapsing two different effects into one number.
    bests: active,
    // Kept for callers that only ever showed one - the biggest contributor.
    best: active.reduce((a, b) => (a && a.chance >= b.chance ? a : b), null),
    groups,
    // Every worn crit set, whether or not it is the one paying.
    sets: groups.flatMap((g) => g.sets).filter((s) => s.worn > 0),
    chaoticInsight,
  };
}
