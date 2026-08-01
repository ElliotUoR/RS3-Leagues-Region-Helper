// Which class of off-hand item is equipped - the only thing that decides
// Teragard's Aegis' multiplier:
//
//   "Your base ability damage is increased by 25% of your total armour value.
//    This bonus is doubled while wielding a defender and tripled while
//    wielding a shield."
//
// A weapon (or nothing, or a two-handed main-hand, which leaves the slot
// unusable) is the plain x1 case.
//
// WHY A LOOKUP RATHER THAN A FIELD ON EACH ITEM. Ninety-three items sit in the
// off-hand slot across the four styles and the overwhelming majority are
// weapons, so tagging every one of them by hand would be ninety-three chances
// to typo a field that changes a headline damage number by 50% or 200%. Only
// the two exceptional classes are listed, and everything unlisted is a weapon.
//
// WHY NOT MATCH ON THE NAME. The ranged and magic members of a defender set are
// not called "defender" - they are reprisers, rebounders and, for the Ancient
// set, a lantern. A `name.includes('defender')` test would silently miss six of
// the ten and halve the bonus for every ranged, magic and Ancient-set build,
// with nothing on screen to say it had happened. Shields are no better: wards,
// deflectors, bucklers and one shroud are all shield-class.
//
// scripts/check-offhand-class.mjs asserts every name below still exists in
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

export const AEGIS_MULTIPLIER_BY_CLASS = { weapon: 1, defender: 2, shield: 3 };

// `offhandName` is whatever is in the off-hand slot, or null/undefined for an
// empty slot. Returns 'weapon' for anything unrecognised, which is both the
// correct default and the safe one: an unlisted item understates the bonus
// rather than inventing one.
export function getOffhandClass(offhandName) {
  if (typeof offhandName !== 'string') return 'weapon';
  if (DEFENDER_OFFHANDS.has(offhandName)) return 'defender';
  if (SHIELD_OFFHANDS.has(offhandName)) return 'shield';
  return 'weapon';
}

export function getAegisMultiplier(offhandName) {
  return AEGIS_MULTIPLIER_BY_CLASS[getOffhandClass(offhandName)];
}
