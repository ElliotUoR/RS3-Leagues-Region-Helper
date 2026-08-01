#!/usr/bin/env node
// Asserts every item named in src/data/offhandClass.js still exists in gear.js,
// in the off-hand slot.
//
// That file classifies off-hands by NAME, because the alternative - a field on
// each of the ninety-three off-hand items - is ninety-three chances to typo
// something that changes a headline damage number by 50% or 200%. The cost of
// name-keying is that renaming an item in gear.js silently drops it back to the
// x1 default with nothing on screen to say so. This is what stops that.
//
// Run by `npm run check:data`.
import { GEAR } from '../src/data/gear.js';
import { DEFENDER_OFFHANDS, SHIELD_OFFHANDS } from '../src/data/offhandClass.js';

const offhandNames = new Set();
for (const style of Object.keys(GEAR)) {
  for (const item of GEAR[style].offhand ?? []) offhandNames.add(item.name);
}

const problems = [];
for (const [label, names] of [
  ['DEFENDER_OFFHANDS', DEFENDER_OFFHANDS],
  ['SHIELD_OFFHANDS', SHIELD_OFFHANDS],
]) {
  for (const name of names) {
    if (!offhandNames.has(name)) problems.push(`  ${label}: "${name}" is not an off-hand item in gear.js`);
  }
}

if (problems.length > 0) {
  console.error('offhandClass.js names that no longer match gear.js:\n');
  for (const line of problems) console.error(line);
  console.error(
    '\nEither the item was renamed (update offhandClass.js to match) or it was\n' +
      'removed (drop it). Left unfixed, that item counts as a plain weapon and\n' +
      "Teragard's Aegis quietly pays half or a third of what it should.",
  );
  process.exit(1);
}

console.log(
  `offhand class check passed - ${DEFENDER_OFFHANDS.size} defenders, ` +
    `${SHIELD_OFFHANDS.size} shields, all present in gear.js.`,
);
