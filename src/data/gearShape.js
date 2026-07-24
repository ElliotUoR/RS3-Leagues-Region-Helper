import { COMBAT_STYLES, GEAR_SLOTS } from './gear';

// Loadouts are stored/shared as item *names* (not full item objects) so that
// if gear.js data changes later, a saved or shared loadout re-resolves to
// the current stats for that item instead of replaying a stale snapshot.
export function emptyEquippedNames() {
  return { melee: {}, ranged: {}, magic: {}, necromancy: {} };
}

// Validates an arbitrary parsed object (from localStorage or a decoded share
// link) into a well-formed `{ style: { slot: itemName } }` map, dropping
// anything that doesn't match a known style/slot/string-name shape.
export function sanitizeEquippedNames(raw) {
  const equippedNames = emptyEquippedNames();
  if (!raw || typeof raw !== 'object') return equippedNames;
  for (const style of COMBAT_STYLES) {
    const bySlot = raw[style];
    if (!bySlot) continue;
    for (const slot of GEAR_SLOTS) {
      if (typeof bySlot[slot] === 'string') equippedNames[style][slot] = bySlot[slot];
    }
  }
  return equippedNames;
}

// Validates an arbitrary value (from localStorage or a decoded share link)
// down to a known combat style, falling back to 'melee'. Shared between
// useGearLoadout (localStorage) and shareBuild (share links) so both sides
// agree on what a valid default style looks like.
export function sanitizeStyle(style) {
  return COMBAT_STYLES.includes(style) ? style : 'melee';
}
