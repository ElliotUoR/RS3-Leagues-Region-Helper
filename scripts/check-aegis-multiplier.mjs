#!/usr/bin/env node
// Asserts every item named in src/data/aegisMultiplier.js still exists in
// gear.js, in the slot it is classified for.
//
// That file classifies by NAME, because the alternative - a field on each of
// the ninety-three off-hand items - is ninety-three chances to typo something
// that changes a headline damage number by 50% or 200%. The cost of name-keying
// is that renaming an item in gear.js silently drops it back to the x1 default
// with nothing on screen to say so. This is what stops that.
//
// Run by `npm run check:aegis-multiplier`.
import { GEAR } from '../src/data/gear.js';
import { DEFENDER_OFFHANDS, SHIELD_OFFHANDS, SHIELDBOW_WEAPONS } from '../src/data/aegisMultiplier.js';

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

if (problems.length > 0) {
  console.error('aegisMultiplier.js names that no longer match gear.js:\n');
  for (const line of problems) console.error(line);
  console.error(
    '\nEither the item was renamed (update aegisMultiplier.js to match) or it was\n' +
      'removed (drop it). Left unfixed, that item counts as a plain weapon and\n' +
      "Teragard's Aegis quietly pays half or a third of what it should.",
  );
  process.exit(1);
}

console.log(
  `aegis multiplier check passed - ${DEFENDER_OFFHANDS.size} defenders, ` +
    `${SHIELD_OFFHANDS.size} shields, ${SHIELDBOW_WEAPONS.size} shieldbow(s), all present in gear.js.`,
);
