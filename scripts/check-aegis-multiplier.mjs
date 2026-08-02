#!/usr/bin/env node
// Keeps src/data/aegisMultiplier.js and gear.js in agreement, BOTH WAYS.
//
// That file classifies by NAME, because the alternative - a field on each of
// the ninety-three off-hand items - is ninety-three chances to typo something
// that changes a headline damage number by 50% or 200%. Name-keying has two
// failure modes and this script checks for both:
//
//   1. A listed name no longer exists in gear.js (renamed or removed). The item
//      silently drops to the x1 default with nothing on screen to say so.
//
//   2. gear.js gains a shield that nobody added to the list. Same silent x1,
//      arrived at from the opposite direction - and this is not hypothetical:
//      the Eagle-eye kiteshield sat unlisted, paying x1 instead of x3, until a
//      player noticed their build's damage was a third of what it should be.
//      Check 1 could never have caught it, because there was no name to check.
//
// The second check is a HEURISTIC on the item name, so it is allowed to be
// wrong - see NOT_SHIELDS for the deliberate exclusions. It only has to be
// noisy enough that a new shield cannot pass unremarked.
//
// Run by `npm run check:aegis-multiplier`.
import { GEAR } from '../src/data/gear.js';
import { DEFENDER_OFFHANDS, SHIELD_OFFHANDS, SHIELDBOW_WEAPONS } from '../src/data/aegisMultiplier.js';

// Words that mark a shield- or defender-class off-hand. Deliberately broad: the
// ranged and magic members of both families are named nothing like "shield"
// (reprisers, rebounders, wards, deflectors, bucklers, one shroud).
const SHIELD_CLASS_WORDS = /shield|kiteshield|buckler|deflector|ward|shroud|defender|repriser|rebounder|lantern/i;

// Names the heuristic flags that are genuinely NOT shields or defenders.
// Necromancy's lanterns are conduits: the style cannot equip a shield at all,
// because the off-hand slot has to hold one of these. They match only because
// the Ancient lantern - a real defender, despite sharing the word - forces
// "lantern" into the pattern above.
const NOT_SHIELDS = /lantern/i;
const IS_REAL_DEFENDER_LANTERN = /^Ancient lantern$/;

function namesInSlot(slot) {
  const names = new Set();
  for (const style of Object.keys(GEAR)) {
    for (const item of GEAR[style][slot] ?? []) names.add(item.name);
  }
  return names;
}

const offhandNames = namesInSlot('offhand');
const weaponNames = namesInSlot('weapon');

const problems = [];
for (const [label, names, valid, slot] of [
  ['DEFENDER_OFFHANDS', DEFENDER_OFFHANDS, offhandNames, 'off-hand'],
  ['SHIELD_OFFHANDS', SHIELD_OFFHANDS, offhandNames, 'off-hand'],
  ['SHIELDBOW_WEAPONS', SHIELDBOW_WEAPONS, weaponNames, 'weapon'],
]) {
  for (const name of names) {
    if (!valid.has(name)) problems.push(`  ${label}: "${name}" is not a ${slot} item in gear.js`);
  }
}

// The other direction: a shield in gear.js that nobody classified.
for (const style of Object.keys(GEAR)) {
  for (const item of GEAR[style].offhand ?? []) {
    if (DEFENDER_OFFHANDS.has(item.name) || SHIELD_OFFHANDS.has(item.name)) continue;
    if (!SHIELD_CLASS_WORDS.test(item.name)) continue;
    if (NOT_SHIELDS.test(item.name) && !IS_REAL_DEFENDER_LANTERN.test(item.name)) continue;
    problems.push(`  UNCLASSIFIED: "${item.name}" (${style} off-hand) reads as a shield or defender but is in neither set`);
  }
}

if (problems.length > 0) {
  console.error('aegisMultiplier.js and gear.js disagree:\n');
  for (const line of problems) console.error(line);
  console.error(
    "\nA listed name that gear.js no longer has was renamed (update the set) or\n" +
      'removed (drop it). An UNCLASSIFIED item is a shield gear.js gained that\n' +
      'nobody added - put it in SHIELD_OFFHANDS or DEFENDER_OFFHANDS, or if it is\n' +
      'genuinely neither, exclude it in NOT_SHIELDS with a comment saying why.\n' +
      "Left unfixed, that item counts as a plain weapon and Teragard's Aegis\n" +
      'quietly pays a half or a third of what it should.',
  );
  process.exit(1);
}

console.log(
  `aegis multiplier check passed - ${DEFENDER_OFFHANDS.size} defenders, ` +
    `${SHIELD_OFFHANDS.size} shields, ${SHIELDBOW_WEAPONS.size} shieldbow(s), all present in gear.js.`,
);
