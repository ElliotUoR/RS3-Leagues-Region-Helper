// Which ranged weapons take ammunition, and which are their own ammunition.
//
// A leaf module on purpose: utils/abilityDamage.js and utils/critChance.js both
// need this, and critChance already sits downstream of gearStats. Putting the
// data here rather than in either of them keeps a new cycle from forming (see
// the note in utils/blessingModifiers.js for what that costs).

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

// runescape.wiki/w/Ammunition states the rule positively: bows and crossbows
// take arrows and bolts. Nothing else does - a thrown weapon IS the
// ammunition, wielded in the weapon slot, which is why chinchompas, darts,
// javelins, throwing axes, chakrams and glaives have no ammunition to be held
// back by.
//
// Written as an allow-list of what DOES consume ammo rather than a list of
// thrown weapons, because the wiki states that side of it and the thrown list
// is the one that would go stale as weapons are added.
//
// This matters most under Genesis Essence: it promotes every weapon to tier
// 120, and min(tier, ammoTier) would otherwise drag a tier-120 chinchompa down
// to whatever happened to be sitting in the ammo slot - a penalty the game
// never applies, because the chinchompa never reads that slot.
export function usesAmmunition(weaponName) {
  if (typeof weaponName !== 'string') return false;
  return isBow(weaponName) || /crossbow/i.test(weaponName);
}
