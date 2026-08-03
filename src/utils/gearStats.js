// Plain armour has no flat accuracy bonus in RS3 - `stats.accuracy` is
// genuinely ~always 0 for it, only weapons carry it. What armour *does*
// have is a per-style defence/armour rating - `stats.defence` is keyed by
// attack style rather than by armour type, so which key represents "this
// item's own armour rating" depends on which combat style tab it's being
// viewed under. Necromancy has no dedicated key in this dataset and
// piggybacks on `magic`, matching the convention used for its weapons.
// Explicit .js extensions: this module is COPY'd into the server image (see
// server/Dockerfile) and Node's ESM resolver, unlike Vite's, will not guess them.
import { getAegisClass, getAegisMultiplier } from '../data/aegisMultiplier.js';
import { GEAR } from '../data/gear.js';

// A slot -> item-name map (what both kinds of build store) resolved to the
// actual gear entries the stat helpers below need. Unknown names are dropped
// rather than faked, so an item renamed since a build was written degrades to
// an empty slot instead of poisoning a total.
export function equippedItemsFor(style, slots) {
  const equipped = {};
  for (const [slot, itemName] of Object.entries(slots ?? {})) {
    const item = GEAR[style]?.[slot]?.find((entry) => entry.name === itemName);
    if (item) equipped[slot] = item;
  }
  return equipped;
}

export const DEFENCE_KEY_BY_STYLE = { melee: 'stab', ranged: 'ranged', magic: 'magic', necromancy: 'magic' };

export function getArmourRating(item, style) {
  return item.stats?.defence?.[DEFENCE_KEY_BY_STYLE[style]] || 0;
}

// The in-game "Total Armour" figure on the Equipment Stats screen isn't just
// worn gear - it also includes a flat, style-agnostic baseline purely from
// the Defence skill level (D), before any armour is even worn. RS3's own
// formula for that baseline is D^3/1250 + 4D + 40; the combined total is
// shown ceiled to a whole number in-game (verified against a level-99
// Defence, no-armour-equipped screenshot: formula gives 1212.24, in-game
// shows 1213).
export function getSkillArmour(defenceLevel) {
  const d = defenceLevel;
  return (d ** 3) / 1250 + 4 * d + 40;
}

export function getTotalArmour(equipped, style, defenceLevel) {
  let gearArmour = 0;
  for (const item of Object.values(equipped)) {
    gearArmour += getArmourRating(item, style);
  }
  return Math.ceil(getSkillArmour(defenceLevel) + gearArmour);
}

// Max life points at level 99 Hitpoints with no gear worn at all - RS3's own
// figure (99 * 100), not derived from a formula the way armour's skill
// baseline is. Gear's own `lifeBonus` stat then adds on top of this flat.
export const BASE_LIFE_POINTS_99_HP = 9900;

// Big Boned's first effect: "Your maximum life points are increased by 50%."
// Applied to the finished total (base + every piece's lifeBonus), so a tank
// setup gains more from it than a power one - which is the whole reason the
// blessing pairs with high-LP gear.
export const BIG_BONED_LIFE_MULTIPLIER = 1.5;

// The Arch relic "Font of Life" (The Mortal Cup): "Increases the player's
// maximum life points by 500." It is the only Arch relic that raises the
// MAXIMUM - the others in that area are healing or damage-threshold effects,
// which do not belong in this total.
export const FONT_OF_LIFE_RELIC = 'Font of Life';
export const FONT_OF_LIFE_LIFE_POINTS = 500;

// `bigBoned` is not optional in spirit: this total is only ever displayed when
// Big Boned is picked (see LIFE_SCALING_BLESSINGS below and its callers), so
// leaving it out shows the visitor the number they would have had WITHOUT the
// blessing that caused the number to appear at all.
//
// `archRelics` is the build's Arch relic picks. Font of Life is added BEFORE
// Big Boned's multiplier, not after: "maximum life points are increased by 50%"
// scales the finished maximum, so the relic's 500 is worth 750 here - and
// because Big Boned's bonus damage is a share of this same total, that 750
// carries into damage as well.
//
// `extraLifePoints` is the same story for the build's Extras (the Totem of
// Vitality's +1,500 - see data/buildExtras.js), and lands in the same place for
// the same reason: 1,500 becomes 2,250 under Big Boned, and +112.5 bonus damage
// per hit on top. Passed in as a plain number rather than a list of names
// because this module is COPY'd into the server image by name (see
// server/Dockerfile) and importing the catalogue here would drag another file
// into that list.
export function getTotalLifePoints(equipped, { bigBoned = false, archRelics = [], extraLifePoints = 0 } = {}) {
  let bonus = extraLifePoints;
  for (const item of Object.values(equipped)) {
    bonus += item.stats?.lifeBonus || 0;
  }
  if (archRelics.includes(FONT_OF_LIFE_RELIC)) bonus += FONT_OF_LIFE_LIFE_POINTS;
  const total = BASE_LIFE_POINTS_99_HP + bonus;
  return bigBoned ? Math.round(total * BIG_BONED_LIFE_MULTIPLIER) : total;
}

// Big Boned's second effect: "All damage you deal gains 5% of your maximum life
// points as bonus damage." Flat and PER HIT, so a multi-hit ability collects it
// once per hit - which is why it is worth stating next to the health total that
// drives it rather than leaving the reader to take 5% of a number themselves.
export const BIG_BONED_DAMAGE_SHARE = 0.05;

export function getBigBonedBonusDamage(totalLifePoints) {
  return Math.round(totalLifePoints * BIG_BONED_DAMAGE_SHARE);
}

// Teragard's Aegis: "Your base ability damage is increased by 25% of your total
// armour value. This bonus is doubled while wielding a defender and tripled
// while wielding a shield."
//
// `totalArmour` is the same figure the loadout displays, Defence-skill baseline
// included - that baseline is part of the in-game Total Armour stat, which is
// what the blessing reads. It follows that boosting Defence raises this: an
// overload is worth ~+540 armour and an elder overload ~+849, so the bonus is
// quoted at each state rather than only unboosted (see getAegisAbilityDamage's
// callers).
export const AEGIS_ARMOUR_SHARE = 0.25;

export function getAegisAbilityDamage(totalArmour, multiplier) {
  return Math.round(totalArmour * AEGIS_ARMOUR_SHARE * multiplier);
}

// Icyenic Faith (tier 7) grants the Tome of the Icyene - a pocket item worth
// +50 Prayer bonus that also converts your TOTAL prayer bonus into damage:
//
//   "When worn, gain 0.2% critical strike chance per 1 Prayer bonus you have."
//   "When worn, gain 0.2% base ability damage per 1 Prayer bonus you have."
//
// Both scale off the same number and at the same rate, so they are reported as
// one figure rather than two identical ones.
export const ICYENIC_FAITH_RELIC = 'Icyenic Faith';
export const TOME_OF_THE_ICYENE = 'Tome of the Icyene';
export const ICYENE_PERCENT_PER_PRAYER = 0.2;

export function getTotalPrayerBonus(equipped) {
  let total = 0;
  for (const item of Object.values(equipped)) total += item.stats?.prayerBonus || 0;
  return total;
}

// "WHEN WORN" is load-bearing, not decoration. Picking the relic grants the
// tome; it only pays out while the tome is actually in the pocket slot. A
// loadout with 40 prayer from other gear and no tome gets nothing, so quoting
// 8% there would be inventing a bonus the build does not have.
export function isIcyeneTomeWorn(equipped) {
  return equipped?.pocket?.name === TOME_OF_THE_ICYENE;
}

// One decimal: prayer bonuses are whole numbers and 0.2% of one is 0.2%, so
// anything finer is false precision.
export function getIcyeneBonusPercent(equipped) {
  if (!isIcyeneTomeWorn(equipped)) return null;
  return Number((getTotalPrayerBonus(equipped) * ICYENE_PERCENT_PER_PRAYER).toFixed(1));
}

// Elder overloads are Meilyr potions: reachable via Tirannwn (Prifddinas) or
// the Divine Druid league relic, which unlocks every Meilyr recipe. Derived
// from a build's own picks rather than stored, so it stays correct when those
// picks change.
// Elder overloads need TWO things, and a build has to have both.
//
//   1. The Meilyr recipes. Elder overload (Herblore 106) and the supreme
//      overload it is brewed from (98) are both bought from the Meilyr recipe
//      shop in Prifddinas.
//   2. Crystal flasks. The elder step does not take one - "a crystal flask is
//      not required" - but it consumes a SIX-DOSE supreme overload, and six-dose
//      is the crystal-flask form: supreme overload lists a crystal flask among
//      its ingredients. So the flask is a hard requirement one step up the
//      chain, which is exactly the kind of gate that is easy to miss.
//
// This used to treat Divine Druid as sufficient on its own. It is not: the relic
// unlocks the recipes and nothing else, so a build holding it without a flask
// source was being shown elder armour, Aegis and ability damage figures it could
// never actually reach.
export const ELDER_OVERLOAD_REGION = 'tirannwn';
export const ELDER_RECIPE_RELIC = 'Divine Druid';
// Superheated's Blessed Fire Spirits table drops "Crystal & Potion Flasks";
// Voidwalker's own table grants access to that same fire spirit table, so it
// reaches them second-hand. Tirannwn covers both gates by itself - Prifddinas
// has the shop, and crystal flasks are crafted there.
export const ELDER_FLASK_RELICS = ['Superheated', 'Voidwalker'];

function elderRecipeSource(leagueRelics, regions) {
  if (regions.includes(ELDER_OVERLOAD_REGION)) return 'Tirannwn';
  return leagueRelics.includes(ELDER_RECIPE_RELIC) ? ELDER_RECIPE_RELIC : null;
}

function elderFlaskSource(leagueRelics, regions) {
  if (regions.includes(ELDER_OVERLOAD_REGION)) return 'Tirannwn';
  return ELDER_FLASK_RELICS.find((relic) => leagueRelics.includes(relic)) ?? null;
}

// The sources actually being relied on, or [] when either gate is unmet - which
// is what every caller reads as "no elder overload for this build". Tirannwn
// collapses to one entry because naming it twice would imply two requirements
// where one pick satisfies both.
export function getElderOverloadSources({ leagueRelics = [], regions = [] } = {}) {
  const recipes = elderRecipeSource(leagueRelics, regions);
  const flasks = elderFlaskSource(leagueRelics, regions);
  if (!recipes || !flasks) return [];
  return recipes === flasks ? [recipes] : [recipes, flasks];
}

// Defence levels each potion state puts you at, relative to 99. Elder overload
// is only reachable with a source above.
export const OVERLOAD_DEFENCE_BONUS = { none: 0, overload: 17, elder: 25 };

// Everything a loadout needs to state its Teragard's Aegis bonus, in one shape:
// the multiplier and what earned it, the bonus at each potion state, and the
// armour each of those was derived FROM - the bonus is meaningless without the
// number it is a quarter of, and an overloaded figure quoted beside armour
// measured at 99 Defence would silently not add up.
//
// A null at any state means "not applicable here": `elder` is null when the
// build has no way to brew one, so the row simply does not appear rather than
// quoting a number it cannot reach.
export function getAegisFromArmour({ weaponName, offhandName, base, overloaded = null, elder = null }) {
  const hands = { weaponName, offhandName };
  const multiplier = getAegisMultiplier(hands);
  const damageAt = (armour) => (armour == null ? null : getAegisAbilityDamage(armour, multiplier));
  return {
    multiplier,
    source: getAegisClass(hands),
    armour: { base, overloaded, elder },
    base: damageAt(base),
    overloaded: damageAt(overloaded),
    elder: damageAt(elder),
  };
}

// The same, derived from the worn gear rather than from precomputed totals -
// what a user-submitted build needs, since nobody hand-supplies its armour.
export function getAegisBreakdown({ equipped, style, weaponName, offhandName, hasElder }) {
  const armourAt = (defenceLevel) => getTotalArmour(equipped, style, defenceLevel);
  return getAegisFromArmour({
    weaponName,
    offhandName,
    base: armourAt(99),
    overloaded: armourAt(99 + OVERLOAD_DEFENCE_BONUS.overload),
    elder: hasElder ? armourAt(99 + OVERLOAD_DEFENCE_BONUS.elder) : null,
  });
}

// Which of the two totals above a blessing actually reads its value from -
// used to decide whether showing that total next to a user-submitted
// build's loadout is meaningful or just clutter (see
// pages/CreateBuildPage.jsx and components/UserBuildCard.jsx). Curated
// builds in data/blessingBuilds.js always show armour regardless, since
// their own hand-picked builds are chosen specifically to make it relevant.
export const ARMOUR_SCALING_BLESSINGS = new Set([
  "Teragard's Aegis",
  'Striking Light',
  'Steadfast Will',
  'Barkscales',
]);
export const LIFE_SCALING_BLESSINGS = new Set(['Big Boned']);
