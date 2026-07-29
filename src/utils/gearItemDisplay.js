import { getArmourRating } from './gearStats';

export function describeSource(source) {
  if (!source) return '';
  const { type } = source;
  if (type === 'boss') return source.boss;
  if (type === 'quest') return `Quest: ${source.quest}`;
  if (type === 'shop') return source.shop;
  if (type === 'skilling' || type === 'skill') {
    const base = source.detail || source.skill || 'Skilling';
    return source.note ? `${base} - ${source.note}` : base;
  }
  if (type === 'combination') return source.note || 'Combined sources';
  if (type === 'treasure trail') return `Treasure Trail: ${source.detail || ''}`;
  return '';
}

// `damage`/`accuracy` are flat rating numbers on every item type, not
// percentages - RS3's modern combat system doesn't express them as %.
const WEAPON_SLOTS = new Set(['weapon', 'offhand', 'ammo']);

// A negative bonus (e.g. -3 prayer on some magic armour) already carries its
// own minus sign - prefixing every value with "+" unconditionally produces
// "+-3" instead of "-3".
function formatSigned(n) {
  return n < 0 ? `${n}` : `+${n}`;
}

export function keyStats(item, style) {
  const s = item.stats;
  if (!s) return [];
  const isWeaponStat = WEAPON_SLOTS.has(item.slot);
  const bits = [];
  if (s.damage) {
    bits.push({ type: 'dmg', text: isWeaponStat ? `${s.damage} dmg rating` : `${formatSigned(s.damage)} dmg` });
  }
  if (isWeaponStat) {
    if (s.accuracy) bits.push({ type: 'acc', text: `${s.accuracy} acc rating` });
  } else {
    const armour = getArmourRating(item, style);
    if (armour) bits.push({ type: 'armour', text: `${armour} armour` });
  }
  if (s.lifeBonus) bits.push({ type: 'lp', text: `${formatSigned(s.lifeBonus)} LP` });
  if (s.prayerBonus) bits.push({ type: 'prayer', text: `${formatSigned(s.prayerBonus)} prayer` });
  return bits;
}
