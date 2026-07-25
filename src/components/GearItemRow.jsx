import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { getArmourRating } from '../utils/gearStats';
import { wikiContextMenuHandler } from '../utils/wiki';

function describeSource(source) {
  if (!source) return '';
  const { type } = source;
  if (type === 'boss') return source.boss;
  if (type === 'quest') return `Quest: ${source.quest}`;
  if (type === 'shop') return source.shop;
  if (type === 'skilling' || type === 'skill') return source.detail || source.skill || 'Skilling';
  if (type === 'combination') return source.note || 'Combined sources';
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

function keyStats(item, style) {
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

export default function GearItemRow({ item, style, equipped, available, isUnlocked, onToggle, showSpecialAttack }) {
  const classes = [
    'gear-item-row',
    equipped ? 'equipped' : '',
    available ? '' : 'locked',
  ]
    .filter(Boolean)
    .join(' ');
  const stats = keyStats(item, style);

  let bottomInfo = item.stats?.setEffect && (
    <span className="gear-item-stats gear-item-passive">{item.stats.setEffect}</span>
  );
  if (showSpecialAttack) {
    bottomInfo = <span className="gear-item-stats gear-item-special">{item.specialAttack}</span>;
  } else if (stats.length > 0) {
    bottomInfo = (
      <span className="gear-item-stats">
        {stats.map((bit) => (
          <span key={bit.type} className={`gear-stat gear-stat-${bit.type}`}>
            {bit.text}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={classes}>
      <button
        type="button"
        className="gear-item-main"
        onClick={() => available && onToggle(item)}
        onContextMenu={wikiContextMenuHandler(item.name)}
        aria-disabled={!available}
      >
        <div className="gear-item-top">
          <span className="gear-item-name">
            {equipped && <span className="gear-item-check">✓</span>}
            {item.name}
            {item.twoHanded && <span className="gear-item-tag-2h">2H</span>}
          </span>
          <RegionTags item={item} isUnlocked={isUnlocked} />
        </div>
        <div className="gear-item-bottom">
          <RetryImage src={item.icon} alt="" loading="eager" />
          <span className="gear-item-info">
            {item.level && (
              <span className="gear-item-level">
                {item.level.skill} {item.level.level}
              </span>
            )}
            <span className="gear-item-source">{describeSource(item.source)}</span>
            {bottomInfo}
          </span>
        </div>
      </button>
      {!available && (
        <button
          type="button"
          className="gear-item-override"
          onClick={() => onToggle(item)}
          title="Equip this item anyway, ignoring its region requirement"
        >
          Ignore restrictions
        </button>
      )}
    </div>
  );
}
