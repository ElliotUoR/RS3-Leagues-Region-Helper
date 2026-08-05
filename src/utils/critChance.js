import { getTotalPrayerBonus, ICYENE_PERCENT_PER_PRAYER, isIcyeneTomeWorn } from './gearStats.js';
import { getBlessingModifiers, TRUE_EQUILIBRIUM_PER_ALIGNMENT } from './blessingModifiers.js';
import { CHAOTIC_INSIGHT, getCritSetBonus } from '../data/critSetBonus.js';

// Critical strike chance and damage, assembled from everything in this app that
// moves either.
//
// Kept out of gearStats.js because it is the one stat that reads from all three
// pick systems at once - worn gear, blessings and league relics - and because
// Unholy Critual's cap makes it the only stat where a source can stop paying
// into the thing it says it pays into and start paying into something else.

// RS3's own baseline for a player with nothing equipped. Crit damage is the
// EXTRA a critical strike deals, not the total, which is why 50 rather than 150.
export const BASE_CRIT_CHANCE = 10;
export const BASE_CRIT_DAMAGE = 50;

// Worn items with a critical strike chance effect. The values live here rather
// than in gear.js's `stats` because they are all conditional in a way the stat
// block has no room for - the grimoires only pay while charged and active, and
// the Stalker's ring only with a bow - and because `setEffect` already carries
// the prose. Keeping the number in one machine-readable place is what lets the
// panel add them up instead of asking the reader to.
//
// Champion's ring is deliberately absent: its +3% is "vs bleeding targets",
// which is a per-fight condition rather than a loadout one, and quoting it in a
// flat total would overstate what the build actually has.
export const ITEM_CRIT_CHANCE = [
  { name: "Erethdor's grimoire", chance: 12, note: 'while active' },
  { name: 'Chaotic grimoire', chance: 7, note: 'while active' },
  { name: "Reaver's ring", chance: 5, note: 'Reckless Assault, -5% accuracy' },
  { name: "Stalker's ring", chance: 3, note: "Shadow's Mercy, bows only", requiresBow: true },
];

// Bows, as runescape.wiki/w/Category:Bows classifies them - which explicitly
// EXCLUDES crossbows ("all bows are two-handed weapons, but not all crossbows
// are"), thrown weapons and blowpipes. Listed by name rather than matched on
// "bow" in the string, because that pattern catches every crossbow and misses
// Seercull and Decimation, both of which are in the category.
//
// Vanquish (ranged) and Sunspear (ranged) are NOT in it and are deliberately
// absent here despite being two-handed ranged weapons.
export const BOW_WEAPONS = new Set([
  'Bow of the Last Guardian',
  'Seren godbow',
  'Noxious longbow',
  'Zaryte bow',
  'Seercull',
  'Gloomfire Bow',
  'Masterwork bow',
  'Decimation',
  'Dark Bow',
  'Strykebow',
  'Zamorak Bow',
  'Eternal magic shortbow Mk. 5',
  'Eternal Magic longbow',
  'Elder shortbow',
  'Elder longbow',
  'Crystal bow',
  'Attuned crystal bow',
  'Hexhunter bow',
]);

export function isBow(weaponName) {
  return typeof weaponName === 'string' && BOW_WEAPONS.has(weaponName);
}

// "Gain +15% critical strike chance. Your critical strike chance is capped at
// 50%. All excess critical strike chance is converted into critical strike
// damage at a 1:1 ratio."
export const UNHOLY_CRITUAL = 'Unholy Critual';
export const UNHOLY_CRITUAL_CRIT_CHANCE = 15;
export const UNHOLY_CRITUAL_CAP = 50;

// The cap is PART OF the blessing, not a game-wide rule, so it is only applied
// when the blessing is held. Without it this returns the raw sum - which is the
// honest answer, since nothing else in the data says what happens past 50%.
export function getCritBreakdown({ equipped = {}, blessings = [], leagueRelics = [] } = {}) {
  const mods = getBlessingModifiers(blessings);
  // Chaotic Insight is a god power, so it arrives in `blessings` alongside the
  // picks (the panel passes both - see modBlessings).
  const chaoticInsight = blessings.includes(CHAOTIC_INSIGHT);
  const critSets = getCritSetBonus(equipped, { chaoticInsight });
  const weaponName = equipped.weapon?.name;
  const chanceParts = [{ key: 'base', label: 'base', value: BASE_CRIT_CHANCE }];
  const damageParts = [{ key: 'base', label: 'base', value: BASE_CRIT_DAMAGE }];

  for (const item of ITEM_CRIT_CHANCE) {
    const worn = Object.values(equipped).some((piece) => piece?.name === item.name);
    if (!worn) continue;
    // The Stalker's ring is worn but paying nothing without a bow. Recorded as
    // a zero-value part rather than skipped, so the panel can say why.
    const applies = !item.requiresBow || isBow(weaponName);
    chanceParts.push({
      key: item.name,
      label: item.name,
      value: applies ? item.chance : 0,
      note: applies ? item.note : 'needs a bow equipped',
      inactive: !applies,
    });
  }

  // Armour set effects - Tuska's Might and Sliske's Parody, which share one
  // bonus rather than stacking. See data/critSetBonus.js.
  if (critSets.best) {
    chanceParts.push({
      key: 'crit-set',
      label: critSets.best.effect,
      value: critSets.chance,
      note: chaoticInsight
        ? `${critSets.best.worn} ${critSets.best.set} pieces counting as ${critSets.best.counted} via ${CHAOTIC_INSIGHT}`
        : `${critSets.best.worn} ${critSets.best.set} pieces`,
    });
  }

  // Icyenic Faith's Tome of the Icyene: 0.2% critical strike chance per point
  // of prayer bonus. Only while the tome is actually in the pocket slot - the
  // relic alone does nothing (see isIcyeneTomeWorn).
  if (leagueRelics.includes('Icyenic Faith') && isIcyeneTomeWorn(equipped)) {
    const prayer = getTotalPrayerBonus(equipped, { blessings });
    chanceParts.push({
      key: 'icyenic',
      label: 'Tome of the Icyene',
      value: Number((prayer * ICYENE_PERCENT_PER_PRAYER).toFixed(1)),
      note: `0.2% per prayer bonus, from ${prayer}`,
    });
  }

  if (mods.equilibrium) {
    chanceParts.push({
      key: 'true-equilibrium',
      label: `True Equilibrium (${mods.alignments}x)`,
      value: mods.critChance,
    });
    damageParts.push({
      key: 'true-equilibrium',
      label: `True Equilibrium (${mods.alignments}x)`,
      value: TRUE_EQUILIBRIUM_PER_ALIGNMENT.critDamage * mods.alignments,
    });
  }

  const unholy = blessings.includes(UNHOLY_CRITUAL);
  if (unholy) {
    chanceParts.push({
      key: 'unholy-critual',
      label: UNHOLY_CRITUAL,
      value: UNHOLY_CRITUAL_CRIT_CHANCE,
    });
  }

  const rawChance = round1(chanceParts.reduce((sum, part) => sum + part.value, 0));

  // The conversion, and the only reason this function returns a `capped` figure
  // separate from the raw one: past 50% a point of crit chance is worth a point
  // of crit damage instead, so the two figures stop being independent.
  const overflow = unholy ? round1(Math.max(0, rawChance - UNHOLY_CRITUAL_CAP)) : 0;
  if (overflow > 0) {
    damageParts.push({
      key: 'unholy-overflow',
      label: `${UNHOLY_CRITUAL} overflow`,
      value: overflow,
      note: `${overflow}% over the ${UNHOLY_CRITUAL_CAP}% cap, converted 1:1`,
    });
  }

  return {
    chance: unholy ? Math.min(rawChance, UNHOLY_CRITUAL_CAP) : rawChance,
    rawChance,
    capped: unholy,
    cap: UNHOLY_CRITUAL_CAP,
    overflow,
    damage: round1(damageParts.reduce((sum, part) => sum + part.value, 0)),
    chanceParts,
    damageParts,
    critSets,
  };
}

// One decimal throughout: the Tome contributes 0.2% per prayer bonus and True
// Equilibrium 7.5% per alignment, so halves are real and anything finer is
// floating-point noise.
function round1(value) {
  return Math.round(value * 10) / 10;
}
