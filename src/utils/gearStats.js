// Plain armour has no flat accuracy bonus in RS3 - `stats.accuracy` is
// genuinely ~always 0 for it, only weapons carry it. What armour *does*
// have is a per-style defence/armour rating - `stats.defence` is keyed by
// attack style rather than by armour type, so which key represents "this
// item's own armour rating" depends on which combat style tab it's being
// viewed under. Necromancy has no dedicated key in this dataset and
// piggybacks on `magic`, matching the convention used for its weapons.
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
