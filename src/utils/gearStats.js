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

// Max life points at level 99 Hitpoints with no gear worn at all - RS3's own
// figure (99 * 100), not derived from a formula the way armour's skill
// baseline is. Gear's own `lifeBonus` stat then adds on top of this flat.
export const BASE_LIFE_POINTS_99_HP = 9900;

// Big Boned's first effect: "Your maximum life points are increased by 50%."
// Applied to the finished total (base + every piece's lifeBonus), so a tank
// setup gains more from it than a power one - which is the whole reason the
// blessing pairs with high-LP gear.
export const BIG_BONED_LIFE_MULTIPLIER = 1.5;

// `bigBoned` is not optional in spirit: this total is only ever displayed when
// Big Boned is picked (see LIFE_SCALING_BLESSINGS below and its callers), so
// leaving it out shows the visitor the number they would have had WITHOUT the
// blessing that caused the number to appear at all.
export function getTotalLifePoints(equipped, { bigBoned = false } = {}) {
  let bonus = 0;
  for (const item of Object.values(equipped)) {
    bonus += item.stats?.lifeBonus || 0;
  }
  const total = BASE_LIFE_POINTS_99_HP + bonus;
  return bigBoned ? Math.round(total * BIG_BONED_LIFE_MULTIPLIER) : total;
}

// Which of the two totals above a blessing actually reads its value from -
// used to decide whether showing that total next to a user-submitted
// build's loadout is meaningful or just clutter (see
// pages/CreateBuildPage.jsx and components/UserBuildCard.jsx). Curated
// builds in data/blessingBuilds.js always show armour regardless, since
// their own hand-picked builds are chosen specifically to make it relevant.
export const ARMOUR_SCALING_BLESSINGS = new Set([
  "Teragard's Aegis",
  'Striking Light',
  'Steadfast Will',
  'Barkscales',
]);
export const LIFE_SCALING_BLESSINGS = new Set(['Big Boned']);
