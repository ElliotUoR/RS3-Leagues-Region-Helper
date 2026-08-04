// RS3's ability damage, derived properly rather than summed.
//
// The obvious reading of the loadout panel - "armour damage + weapon damage" -
// is only PART of the figure. The real formula (see
// `opus combat notes/01-combat-mechanics.md`) is:
//
//   main-hand:   floor(2.5*f(S)) + floor(w + b)
//   two-handed:  floor(2.5*f(S)) + floor(1.25*f(S)) + floor(w + 1.5b)
//   dual wield:  main-hand + floor(main-hand-computed-with-the-off-hand / 2)
//
//     f(level) = 145 * ln(1 + 0.6*level/145) / ln(1.6)
//     S = the style's combat stat (Strength / Ranged / Magic / Necromancy)
//     w = the weapon's own damage rating
//     b = summed damage bonus from every non-weapon slot
//
// Two things fall out of that which a plain sum gets wrong:
//
//  1. THE LEVEL TERM. floor(2.5*f(99)) is 264, and a two-hander gets 397. That
//     is a flat contribution no item provides and no sum of item stats will
//     ever produce.
//
//  2. OVERLOADS ACTUALLY DO SOMETHING HERE. They are worth +17 combat levels
//     (+25 elder), which only reaches ability damage through f(S) - the weapon
//     term is capped at min(tier, level) and a t90 weapon at level 99 is
//     already capped. So an overload is +38 ability damage one-handed and +56
//     two-handed; an elder is +55 and +82. Small next to Teragard's Aegis, but
//     it is the honest answer to "what do my potions do to my damage", and
//     without this module the toggle would have moved armour and left damage
//     stubbornly still.
import { DEFENDER_OFFHANDS, SHIELD_OFFHANDS, getAegisClass } from '../data/aegisMultiplier.js';
import { GEAR_SET_GROUPS } from '../data/gearSets.js';

// The slots whose `damage` is a WEAPON rating (w) rather than an equipment
// damage bonus (b). Same split GearStatsSummary makes, for the same reason -
// the two are on completely different numeric scales.
export const WEAPON_DAMAGE_SLOTS = new Set(['weapon', 'offhand', 'ammo']);

export function levelBonus(level) {
  return (145 * Math.log(1 + (0.6 * level) / 145)) / Math.log(1.6);
}

// Base combat stat, and what each potion state puts it at. Mirrors
// gearStats.js's OVERLOAD_DEFENCE_BONUS - the same potion boosts Defence and
// the offensive stat by the same amount, they are just read by different
// formulas.
export const BASE_COMBAT_LEVEL = 99;
export const OVERLOAD_COMBAT_BONUS = { none: 0, overload: 17, elder: 25 };

// The Sliver of Edicts (Naragi Edict relic) is not a potion and does not stack
// with one: it SETS every combat stat to 255 rather than adding to 99, so it is
// an absolute level and not another entry in the bonus table above. At 255 the
// formula's level term is worth roughly twice what it is at 99, which is why it
// gets a state of its own instead of being waved at in prose.
//
// It is a 16.8-second window on a 90-second cooldown, so this state answers
// "what does my burst look like", not "what do I sustain". The panel labels it
// as such - see components/LeaguesEffectsPanel.jsx.
export const SLIVER_COMBAT_LEVEL = 255;

export function combatLevelFor(potionState) {
  if (potionState === 'sliver') return SLIVER_COMBAT_LEVEL;
  return BASE_COMBAT_LEVEL + (OVERLOAD_COMBAT_BONUS[potionState] ?? 0);
}

// gear.js stores each weapon's damage with the coefficient ALREADY APPLIED:
// Drygore Rapier (t90, one-handed) is 864 = 9.6*90, Ek-ZekKil (t95, two-handed)
// is 1368 = 14.4*95. So `w` above is read straight off the item and never
// recomputed from its tier.
//
// Which coefficient a weapon was stored with is what decides whether the
// 1.25*f term and the 1.5b multiplier apply, and for weapons flagged
// `twoHanded: true` that is checked against the data rather than trusted. The
// Strykebow is `twoHanded: true` yet carries 816 = 9.6*85, the ONE-handed
// coefficient, consistent with the rest of the app treating a shieldbow as a
// main-hand-plus-shield (see data/aegisMultiplier.js). Trusting the flag there
// would pay it a two-handed level bonus on top of one-handed weapon damage,
// which is a figure the game never produces.
//
// The check is ONE-DIRECTIONAL: it can demote a weapon the flag calls
// two-handed, never promote one the flag calls one-handed. Symmetric
// "whichever coefficient is nearer" was wrong, because plenty of genuine
// one-handers sit above the 9.6*tier line and it read that as evidence of a
// second hand:
//
//   - Both chinchompas. Thrown AoE weapons are off-curve by design - the wiki
//     says outright that a black chinchompa (tier 65, 869.8) "has damage
//     approximately equal to a tier 71 weapon". Nearest-coefficient made them
//     two-handed, which paid them a level bonus and a 1.5x armour multiplier
//     the game does not, and told getWeaponMode to ignore their off-hand -
//     they are main-hand weapons and can hold a shield.
//   - Death guard (tier 10), where `level.level` is the Necromancy
//     REQUIREMENT (1), not the tier (10). 96 = 9.6*10 is exactly the
//     one-handed coefficient; measured against tier 1 it looked enormous.
//     Necromancy main-hands pair with a conduit lantern, so promoting it also
//     silently dropped the off-hand half of that style's damage.
//
// That last case is the general hazard: `level.level` is a wield requirement
// and only usually equals the tier. Demotion survives it because a weapon
// carrying LESS than 9.6*requirement cannot be a two-hander whatever its real
// tier is; promotion does not.
const MAIN_HAND_COEFFICIENT = 9.6;
const TWO_HANDED_COEFFICIENT = 14.4;

export function usesTwoHandedScale(weapon) {
  if (!weapon) return false;
  if (!weapon.twoHanded) return false;
  const tier = weapon.level?.level;
  const damage = weapon.stats?.damage;
  if (!tier || !damage) return true;
  return (
    Math.abs(damage - TWO_HANDED_COEFFICIENT * tier) <= Math.abs(damage - MAIN_HAND_COEFFICIENT * tier)
  );
}

// A shield or defender in the off-hand is not a second weapon, so it does not
// earn the dual-wield half-contribution. Anything else there does - including
// necromancy's conduit lanterns, which genuinely are the off-hand half of that
// style's damage rather than a shield substitute.
export function getWeaponMode(equipped = {}) {
  if (usesTwoHandedScale(equipped.weapon)) return 'twoHanded';
  const offhandName = equipped.offhand?.name;
  const offhandIsWeapon =
    Boolean(offhandName) && !DEFENDER_OFFHANDS.has(offhandName) && !SHIELD_OFFHANDS.has(offhandName);
  return offhandIsWeapon ? 'dualWield' : 'mainHand';
}

export const WEAPON_MODE_LABELS = {
  mainHand: 'main-hand',
  twoHanded: 'two-handed',
  dualWield: 'dual wield',
};

// AMMUNITION DEALS NO DAMAGE OF ITS OWN. This is the single most
// counter-intuitive part of the formula and the easiest thing in the world to
// get wrong, so it is spelled out: `a` in min(t, a) is the ammo's TIER, and the
// whole of its contribution is to cap the weapon's tier. Its damage rating is
// never added to the weapon's, and per the wiki it does not feed `b` either.
//
//   ranged main-hand:  floor(2.5*f(R)) + floor(9.6*min(t_mh, a) + b)
//
// Adding it instead - which is what the numbers look like they want, since
// gear.js stores ammo at 14.4 x tier, the same scale as a two-handed weapon -
// roughly DOUBLES every crossbow build. A t92 crossbow plus t99 bolts came out
// at 2,208 weapon damage against a t92 melee main-hand's 907, which is not a
// gap ranged has ever had over melee.
//
// The observable consequence therefore runs the OPPOSITE way to how it is
// usually described. "Tier 95 arrows in a tier 85 bow only do tier 85 damage"
// is true, and costs nothing, because the arrows were never contributing
// anything to cap. What actually bites is LOW-tier ammo in a HIGH-tier weapon:
// rune arrows in a t95 bow drag it to 14.4 x 50, less than half its rating.
//
// gear.js's ranged ammo all carries a tier. An ammo-SLOT item without one is
// not ammunition at all (melee spike harnesses and the like) and its damage is
// an ordinary equipment bonus - see damageRatings.
export function ammoTierCap(weapon, ammo) {
  const weaponTier = weapon?.level?.level;
  const ammoTier = ammo?.level?.level;
  if (!weaponTier || !ammoTier || ammoTier >= weaponTier) return null;
  return {
    name: ammo.name,
    weapon: weapon.name,
    weaponTier,
    ammoTier,
    // The stored damage is already the coefficient times the weapon's tier, so
    // scaling by the tier ratio yields coefficient x min(t, a) whatever that
    // coefficient is - which matters, because a handful of weapons sit off the
    // 9.6/14.4 curve and a hardcoded coefficient would misprice them.
    scale: ammoTier / weaponTier,
  };
}

// The Achto set bonus: "adds 5% per piece (25% at five) of a tier-equivalent
// main-hand's damage to your Strength Bonus, but only while the off-hand acts
// as a shield". Achto is tier 90, so a tier-equivalent main-hand is 9.6 x 90 =
// 864 and five pieces are worth +216 to the equipment damage bonus.
//
// It is why the shield builds in blessingBuilds.js pair Achto with Teragard's
// Aegis: both pay only with a shield, so the same off-hand is bought twice.
// A DEFENDER does not qualify - it earns Aegis its x2 but is not a shield, and
// the two conditions are deliberately not the same test.
export const ACHTO_TIER = 90;
export const ACHTO_SHARE_PER_PIECE = 0.05;
const ACHTO_SET_PREFIX = 'Achto ';
const ACHTO_SHIELD_CLASSES = new Set(['shield', 'shieldbow']);

export function getAchtoBonus(equipped = {}) {
  // Counted per SET, not by name prefix, so three Teralith pieces plus two
  // Tempest ones is two incomplete sets rather than one full one.
  const pieces = new Map();
  for (const item of Object.values(equipped)) {
    const set = GEAR_SET_GROUPS[item?.name];
    if (!set?.startsWith(ACHTO_SET_PREFIX)) continue;
    pieces.set(set, (pieces.get(set) ?? 0) + 1);
  }
  if (pieces.size === 0) return null;

  const [set, count] = [...pieces.entries()].sort((a, b) => b[1] - a[1])[0];
  const shieldClass = getAegisClass({ weaponName: equipped.weapon?.name, offhandName: equipped.offhand?.name });
  const active = ACHTO_SHIELD_CLASSES.has(shieldClass);
  return {
    set,
    pieces: count,
    shieldClass,
    active,
    // Reported even when inactive, so the panel can say what a shield WOULD be
    // worth to a build already wearing the armour for it.
    bonus: count * ACHTO_SHARE_PER_PIECE * MAIN_HAND_COEFFICIENT * ACHTO_TIER,
  };
}

// Everything the formula needs from a loadout, in one pass.
function damageRatings(equipped) {
  let armour = 0;
  for (const [slot, item] of Object.entries(equipped)) {
    if (WEAPON_DAMAGE_SLOTS.has(slot)) continue;
    armour += item?.stats?.damage || 0;
  }

  // An ammo-slot item with no tier is not ammunition - it is a damage-bonus
  // trinket like the Nodon spike harness, whose 24.1 is plainly on the armour
  // scale rather than the 14.4-per-tier ammunition one. Those belong in b.
  const ammoItem = equipped.ammo;
  if (ammoItem && ammoItem.level?.level == null) armour += ammoItem.stats?.damage || 0;

  // The tier cap applies per hand, against that hand's own tier.
  const mainCap = ammoTierCap(equipped.weapon, ammoItem);
  const offCap = ammoTierCap(equipped.offhand, ammoItem);
  const rate = (item, cap) => (item?.stats?.damage || 0) * (cap ? cap.scale : 1);

  return {
    armour,
    // Reported so the panel can name the culprit when a weapon is being held
    // back by what is loaded into it.
    ammoCap: mainCap ?? offCap,
    mainHand: rate(equipped.weapon, mainCap),
    offHand: rate(equipped.offhand, offCap),
  };
}

// Base ability damage - BEFORE Teragard's Aegis and the Tome of the Icyene,
// both of which modify this figure rather than being part of it.
//
// `parts` exists because the panel shows the working: "396 level + 1,368 weapon
// + 150 armour" answers "why is this bigger than the two stats above it"
// without anyone having to ask. The parts are built to SUM EXACTLY to the
// total - the last one absorbs whatever the formula's floors took off, so the
// arithmetic on screen is never a rounding-error apart from the headline.
export function getBaseAbilityDamage(equipped = {}, { combatLevel = BASE_COMBAT_LEVEL } = {}) {
  const f = levelBonus(combatLevel);
  const mode = getWeaponMode(equipped);
  const { armour: gearArmour, mainHand, offHand, ammoCap } = damageRatings(equipped);
  const levelTerm = Math.floor(2.5 * f);

  // Achto lands in the equipment damage bonus (b), which is what "adds to your
  // Strength Bonus" means, so it flows through the formula exactly as worn
  // armour damage does rather than being bolted onto the total afterwards.
  const achto = getAchtoBonus(equipped);
  const achtoBonus = achto?.active ? achto.bonus : 0;
  const armour = gearArmour + achtoBonus;

  const finish = (total, level, weapon) => {
    const parts = [
      { key: 'level', label: 'level', value: level },
      { key: 'weapon', label: 'weapon', value: weapon },
      // The armour part absorbs whatever the formula's floors took off, so the
      // working on screen always sums to the headline.
      { key: 'armour', label: 'armour', value: total - level - weapon - achtoBonus },
    ];
    if (achtoBonus) parts.push({ key: 'achto', label: 'Achto set', value: achtoBonus });
    return { mode, combatLevel, total, parts, achto, ammoCap };
  };

  if (mode === 'twoHanded') {
    // The 1.5 on b is not a rounding detail - at 150 armour damage it is worth
    // another 75, and it is why a two-hander's armour is worth more to it than
    // the same armour on a shield build.
    const level = levelTerm + Math.floor(1.25 * f);
    return finish(level + Math.floor(mainHand + 1.5 * armour), level, mainHand);
  }

  const main = levelTerm + Math.floor(mainHand + armour);
  if (mode === 'dualWield') {
    // "Off-hand ability damage is half of main-hand" taken literally: the whole
    // main-hand expression recomputed with the off-hand's own rating, halved.
    // The equipment bonus therefore lands 1.5 times in total, which is the
    // reading the formula gives and the one most likely to be right.
    const off = Math.floor((levelTerm + Math.floor(offHand + armour)) / 2);
    return finish(main + off, levelTerm + Math.floor(levelTerm / 2), mainHand + Math.floor(offHand / 2));
  }

  return finish(main, levelTerm, mainHand);
}

// Teragard's Aegis adds a flat amount to base ability damage; the Tome of the
// Icyene adds a percentage OF base ability damage. Whether the percentage sees
// the Aegis-inflated figure or the original is not established, and the gap is
// large enough to matter (at +2,700 Aegis and +16% tome it is ~430 damage), so
// both readings are returned and the panel labels them rather than picking one
// and being quietly wrong.
export function getTotalAbilityDamage({ base, aegisBonus = 0, icyenePercent = 0 }) {
  const withAegis = base + (aegisBonus || 0);
  const share = (icyenePercent || 0) / 100;
  return {
    base,
    aegisBonus: aegisBonus || 0,
    withAegis,
    // Icyenic reads the raised figure - the optimistic reading.
    compounding: Math.round(withAegis * (1 + share)),
    // Icyenic reads the untouched base - the conservative reading.
    additive: Math.round(withAegis + base * share),
    // No tome means the two readings are the same number; the panel uses this
    // to show one row instead of two.
    split: share > 0 && (aegisBonus || 0) > 0,
  };
}

// ---------------------------------------------------------------- ADRENALINE

// Leagues raises the cap before any pick is made - this is the number a build
// with none of the below still has, and quoting the live game's 100% here would
// understate every build on the site.
export const LEAGUES_BASE_MAX_ADRENALINE = 125;
export const ADRENALINE_JUNKIE_MAX_BONUS = 50;
export const ADRENALINE_JUNKIE_GENERATION_BONUS = 50;
export const HEIGHTENED_SENSES_RELIC = 'Heightened Senses';
export const HEIGHTENED_SENSES_MAX_BONUS = 10;
export const ADRENALINE_JUNKIE_BLESSING = 'Adrenaline Junkie';

// Arch relic, Goblin Warpaints: "All basic abilities will generate 1% more
// adrenaline." A GENERATION effect like Adrenaline Junkie's, not a maximum, so
// it belongs on the same card and not in the max total.
export const FURY_OF_THE_SMALL_RELIC = 'Fury of the Small';

// Maximum adrenaline and the parts that built it. Generation is a SEPARATE
// stat - a bigger tank versus filling it faster - so it is reported alongside
// rather than folded in.
export function getAdrenaline({ blessings = [], archRelics = [] } = {}) {
  const junkie = blessings.includes(ADRENALINE_JUNKIE_BLESSING);
  const senses = archRelics.includes(HEIGHTENED_SENSES_RELIC);
  const fury = archRelics.includes(FURY_OF_THE_SMALL_RELIC);
  if (!junkie && !senses && !fury) return null;

  const parts = [`${LEAGUES_BASE_MAX_ADRENALINE}% Leagues base`];
  let max = LEAGUES_BASE_MAX_ADRENALINE;
  if (junkie) {
    max += ADRENALINE_JUNKIE_MAX_BONUS;
    parts.push(`+${ADRENALINE_JUNKIE_MAX_BONUS}% Adrenaline Junkie`);
  }
  if (senses) {
    max += HEIGHTENED_SENSES_MAX_BONUS;
    parts.push(`+${HEIGHTENED_SENSES_MAX_BONUS}% Heightened Senses`);
  }
  return {
    max,
    parts,
    generation: junkie ? ADRENALINE_JUNKIE_GENERATION_BONUS : null,
    fury,
    // Which pick the card should be named and iconed for: the blessing when
    // there is one, otherwise whichever relic is actually doing the work.
    driver: (junkie && ADRENALINE_JUNKIE_BLESSING) || (senses && HEIGHTENED_SENSES_RELIC) || FURY_OF_THE_SMALL_RELIC,
  };
}

// ------------------------------------------------------- BLESSING PAYOUT MATHS

// Abyssal Cinders. The Inferno rolls 100-200% of ability damage, so 150% is its
// average - stated as "~" everywhere it is shown, since no single hit is 150%.
export const ABYSSAL_CINDERS_ON_HIT_SHARE = 0.15;
export const INFERNO_OF_ZAMORAK_AVERAGE_SHARE = 1.5;

// Barkscales. The reduction reads TOTAL armour (the same figure the panel shows,
// Defence baseline included), so it moves with the potion toggle. Grasp of
// Guthix rolls 80-120% of ability damage; 100% is its average.
export const BARKSCALES_REDUCTION_SHARE = 0.1;
export const GRASP_OF_GUTHIX_AVERAGE_SHARE = 1.0;

// Striking Light. "Basic attack" is the auto-triggered 1.8s basic ability, and
// its damage band differs by style - melee hits harder because it has no range.
// The blessing adds 40 PERCENTAGE POINTS to the band, not a 1.4x multiplier.
export const BASIC_ATTACK_BAND = {
  melee: [110, 130],
  ranged: [90, 110],
  magic: [90, 110],
  necromancy: [90, 110],
};
export const STRIKING_LIGHT_BASIC_BONUS = 40;
// Light of Saradomin rolls 40-60% of ability damage plus a flat 250% of armour;
// 50% is the average of that band.
export const LIGHT_OF_SARADOMIN_AVERAGE_AD_SHARE = 0.5;
export const LIGHT_OF_SARADOMIN_ARMOUR_SHARE = 2.5;

// Splash Zone: "Area-of-effect and multi-target attacks deal 30% more damage."
//
// Chinchompas are an AoE ATTACK rather than an AoE ability, so every hit they
// land qualifies - not just the handful of abilities that would normally
// trigger the god power. Holding them turns a conditional bonus into an
// unconditional one, which is worth saying out loud because nothing else on the
// panel would reveal it.
export const SPLASH_ZONE_GOD_POWER = 'Splash Zone';
export const SPLASH_ZONE_AOE_BONUS = 30;
export const CHINCHOMPA_WEAPONS = new Set(['Mechanised chinchompa', 'Black chinchompa']);

export function isChinchompa(weaponName) {
  return typeof weaponName === 'string' && CHINCHOMPA_WEAPONS.has(weaponName);
}

// Both halves are required: the god power without chins is the ordinary
// conditional AoE bonus, and chins without the god power are just chins.
export function hasChinchompaSplashZone(godPower, equipped = {}) {
  return godPower === SPLASH_ZONE_GOD_POWER && isChinchompa(equipped.weapon?.name);
}

export function getBasicAttackBand(style) {
  const band = BASIC_ATTACK_BAND[style] ?? BASIC_ATTACK_BAND.magic;
  return {
    base: band,
    boosted: [band[0] + STRIKING_LIGHT_BASIC_BONUS, band[1] + STRIKING_LIGHT_BASIC_BONUS],
  };
}
