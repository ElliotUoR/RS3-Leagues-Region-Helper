// Explicit .js extension: this module is reached from utils/gearStats.js, which
// is COPY'd into the server image, so Node has to resolve it without Vite's
// extensionless resolution. Same reason the rest of that chain carries them.
import { BLESSINGS } from '../data/blessings.js';

// The blessings that change a stat the rest of the app already computes, rather
// than adding a payout of their own.
//
// Everything else on the Leagues effects panel reads a total and states a share
// of it - Abyssal Cinders takes 15% of ability damage, Barkscales 10% of
// armour. These four go the other way: they move armour, life points, prayer
// bonus and ability damage themselves, so every one of those shares moves with
// them for free. That is the whole reason they live in one module instead of
// being four special cases inside the panel.
//
// ORDER OF OPERATIONS is an assumption, and a load-bearing one. Jagex's reveal
// cards state the effects but not how they compose, so this file fixes a single
// convention and every caller follows it:
//
//   flat bonuses first, then multipliers
//
// So True Equilibrium's +50 armour is granted, and Havoc Born's -25% then
// applies to the sum including it. The alternative (multiply the base, then add
// the flat) would make Havoc Born cheaper, and there is nothing in the card
// text to prefer it. Where two multipliers meet they commute, so Big Boned's
// x1.5 and Havoc Born's x0.75 need no ruling.

export const HAVOC_BORN = 'Havoc Born';
export const TRUE_EQUILIBRIUM = 'True Equilibrium';
export const HIGHER_POWER = 'Higher Power';
export const GENESIS_ESSENCE = 'Genesis Essence';

// "Your damage is increased by 20%. Your maximum life points are reduced by
// 25%. Your armour value is reduced by 25%."
export const HAVOC_BORN_DAMAGE_BONUS = 0.2;
export const HAVOC_BORN_PENALTY = 0.25;

// "Gain [these] for each relic alignment you have chosen." An alignment is a
// god COLOUR represented among your blessing picks, so the multiplier is the
// number of distinct colours you hold: all-green is 1x, green plus red is 2x,
// one of each is 3x.
export const TRUE_EQUILIBRIUM_PER_ALIGNMENT = {
  abilityDamage: 75,
  armour: 50,
  lifePoints: 500,
  critChance: 5,
  critDamage: 7.5,
  prayerBonus: 5,
};

// "Your base ability damage is increased by 30%." The ultimate lockout it is
// paid for with is not modelled - see the note in the panel's card.
export const HIGHER_POWER_ABILITY_DAMAGE = 0.3;

// "Your equipped weapons are treated as tier 120." Above the tier 95 ceiling
// everything else in this app tops out at.
export const GENESIS_ESSENCE_TIER = 120;

// Built on FIRST USE, not at module scope, and that is not a micro-optimisation
// - it is what keeps this module loadable at all.
//
// There is a genuine import cycle here: data/blessings.js re-exports the armour
// helpers from utils/gearStats.js, gearStats imports this module, and this
// module imports blessings.js. Under a bundler the cycle resolves quietly, but
// under plain Node - which is what the server's og-image renderer runs
// (server/src/lib/shareBuild.js) - `BLESSINGS` is still in its temporal dead
// zone while this module body executes, and touching it at module scope threw
// "Cannot access 'BLESSINGS' before initialization" and took that route down.
//
// Deferring the read past initialisation sidesteps it: by the time any function
// here is called, every module in the cycle has finished evaluating and the
// live binding is populated.
let byName = null;
function blessingByName(name) {
  if (!byName) byName = new Map(BLESSINGS.map((blessing) => [blessing.name, blessing]));
  return byName.get(name);
}

// Distinct blessing colours held. Looked up in BLESSINGS, which contains only
// the eighteen PICKED blessings - the god powers live in GOD_TIER_BLESSINGS and
// are deliberately not counted, since they are awarded by the colours rather
// than being alignments of their own.
export function alignmentCount(names = []) {
  const colours = new Set();
  for (const name of names) {
    const colour = blessingByName(name)?.colour;
    if (colour) colours.add(colour);
  }
  return colours.size;
}

// `names` may include awarded god powers alongside the picks - Genesis Essence
// is one, so it has to. alignmentCount ignores them by construction.
export function getBlessingModifiers(names = []) {
  const held = new Set(names.filter(Boolean));
  const havoc = held.has(HAVOC_BORN);
  const equilibrium = held.has(TRUE_EQUILIBRIUM);
  const higher = held.has(HIGHER_POWER);
  const genesis = held.has(GENESIS_ESSENCE);

  // Only counted when True Equilibrium is actually held: it is the sole
  // consumer, and a non-zero count on a build without it invites the panel to
  // show a multiplier that pays nothing.
  const alignments = equilibrium ? alignmentCount(names) : 0;
  const per = (key) => (equilibrium ? TRUE_EQUILIBRIUM_PER_ALIGNMENT[key] * alignments : 0);

  return {
    alignments,
    havoc,
    equilibrium,
    higher,
    genesis,

    armourFlat: per('armour'),
    armourMultiplier: havoc ? 1 - HAVOC_BORN_PENALTY : 1,

    lifeFlat: per('lifePoints'),
    lifeMultiplier: havoc ? 1 - HAVOC_BORN_PENALTY : 1,

    prayerFlat: per('prayerBonus'),

    abilityDamageFlat: per('abilityDamage'),
    abilityDamageMultiplier: higher ? 1 + HIGHER_POWER_ABILITY_DAMAGE : 1,

    // Damage DEALT, not the ability damage stat - the same kind of multiplier
    // Splash Zone applies, and it lands in the panel's "Effective ability
    // damage" figure rather than in the total.
    damageMultiplier: havoc ? 1 + HAVOC_BORN_DAMAGE_BONUS : 1,

    critChance: per('critChance'),
    critDamage: per('critDamage'),

    weaponTier: genesis ? GENESIS_ESSENCE_TIER : null,

    // Lets callers skip the whole apparatus - and, more importantly, lets the
    // panel keep showing precomputed figures untouched on a build holding none
    // of these, so nothing shifts for the seven curated guides.
    active: havoc || equilibrium || higher || genesis,
  };
}

// Applied by getTotalArmour / getTotalLifePoints / getTotalPrayerBonus so the
// convention at the top of this file lives in exactly one place.
export function applyFlatThenMultiplier(value, flat, multiplier) {
  return (value + flat) * multiplier;
}
