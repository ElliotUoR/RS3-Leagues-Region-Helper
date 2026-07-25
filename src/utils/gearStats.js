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
