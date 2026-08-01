// What Teragard's Aegis sees in your hands, and the multiplier it pays:
//
//   "Your base ability damage is increased by 25% of your total armour value.
//    This bonus is doubled while wielding a defender and tripled while
//    wielding a shield."
//
// x3 shield, x2 defender, x1 anything else (a weapon, or an empty off-hand).
//
// BOTH HANDS, not just the off-hand. A shieldbow is a two-handed weapon, so it
// occupies the WEAPON slot and leaves the off-hand empty - but it counts as a
// shield here, which is the entire premise of the Shield-Bow-er build. Reading
// only the off-hand would quietly pay that build x1 instead of x3.
//
// WHY A LOOKUP RATHER THAN A FIELD ON EACH ITEM. Ninety-three items sit in the
// off-hand slot across the four styles and the overwhelming majority are
// weapons, so tagging every one by hand would be ninety-three chances to typo
// a field that changes a headline damage number by 50% or 200%. Only the
// exceptional classes are listed; everything unlisted is a plain weapon.
//
// WHY NOT MATCH ON THE NAME. The ranged and magic members of a defender set are
// not called "defender" - they are reprisers, rebounders and, for the Ancient
// set, a lantern. A `name.includes('defender')` test would silently miss six of
// the ten and halve the bonus for every ranged, magic and Ancient-set build,
// with nothing on screen to say it had happened. Shields are no better: wards,
// deflectors, bucklers and one shroud are all shield-class.
//
// scripts/check-aegis-multiplier.mjs asserts every name below still exists in
// gear.js, so a rename there cannot quietly drop an item back to x1.

// The full defender family. Melee members are "defender", ranged are
// "repriser", magic are "rebounder" - except the Ancient set's magic member,
// which is the Ancient lantern (a defender despite the name it shares with the
// necromancy weapon lanterns).
export const DEFENDER_OFFHANDS = new Set([
  'Dragon defender',
  'Kalphite Defender',
  'Kalphite repriser',
  'Kalphite rebounder',
  'Corrupted defender',
  'Tainted repriser',
  'Blighted rebounder',
  'Ancient defender',
  'Ancient repriser',
  'Ancient lantern',
]);

// Shield-class off-hands: shields, kiteshields, spirit shields, wards (magic),
// deflectors and the buckler (ranged), and the necromancy shroud.
export const SHIELD_OFFHANDS = new Set([
  // melee
  'Dragon kiteshield',
  'Orikalkum kiteshield',
  'Elder rune round shield + 5',
  'Bane square shield',
  'Bandos Warshield',
  'Dragonfire shield',
  'Chaotic kiteshield',
  'Attuned crystal shield',
  'Spirit shield',
  'Divine spirit shield',
  'Malevolent Kiteshield',
  'Primal kiteshield + 5',
  // ranged
  'Armadyl buckler',
  'Vengeful kiteshield',
  'Elysian spirit shield',
  'Dragonfire deflector',
  'Crystal deflector',
  'Attuned crystal deflector',
  // magic
  'Farseer kiteshield',
  'Grifolic shield',
  'Ward of subjugation',
  'Dragonfire ward',
  'Crystal ward',
  'Attuned crystal ward',
  'Arcane spirit shield',
  'Merciless kiteshield',
  // necromancy
  'Spectral spirit shield',
  'Dragonfire shroud',
]);

// Two-handed weapons that count as a shield. Listed explicitly because the one
// in this dataset does not say so in its name - the Strykebow is a shieldbow.
// isShieldbow() ALSO accepts any name containing "shieldbow", so the ordinary
// ones (elder rune shieldbow, crystal shieldbow, ...) are covered the moment
// they are added to gear.js without an edit here. The two rules exist for
// opposite reasons: the set catches shieldbows that do not say it, the name
// test catches the ones that do.
export const SHIELDBOW_WEAPONS = new Set(['Strykebow']);

export function isShieldbow(weaponName) {
  if (typeof weaponName !== 'string') return false;
  return SHIELDBOW_WEAPONS.has(weaponName) || /shieldbow/i.test(weaponName);
}

// 'shieldbow' is reported separately from 'shield' only so the UI can say which
// one earned the x3 - they pay identically.
export const AEGIS_MULTIPLIER_BY_CLASS = { weapon: 1, defender: 2, shield: 3, shieldbow: 3 };

// `weaponName`/`offhandName` are whatever is in those slots, or null for empty.
// Returns 'weapon' for anything unrecognised, which is both the correct default
// and the safe one: an unlisted item understates the bonus rather than
// inventing one.
export function getAegisClass({ weaponName, offhandName } = {}) {
  if (isShieldbow(weaponName)) return 'shieldbow';
  if (typeof offhandName === 'string') {
    if (DEFENDER_OFFHANDS.has(offhandName)) return 'defender';
    if (SHIELD_OFFHANDS.has(offhandName)) return 'shield';
  }
  return 'weapon';
}

export function getAegisMultiplier(hands) {
  return AEGIS_MULTIPLIER_BY_CLASS[getAegisClass(hands)];
}
