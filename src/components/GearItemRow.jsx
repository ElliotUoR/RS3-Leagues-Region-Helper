import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
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

function keyStats(item) {
  const s = item.stats;
  if (!s) return [];
  const isWeaponStat = WEAPON_SLOTS.has(item.slot);
  const bits = [];
  if (s.damage) bits.push(isWeaponStat ? `${s.damage} dmg rating` : `+${s.damage} dmg`);
  if (s.accuracy) bits.push(isWeaponStat ? `${s.accuracy} acc rating` : `+${s.accuracy} acc`);
  if (s.lifeBonus) bits.push(`+${s.lifeBonus} LP`);
  if (s.prayerBonus) bits.push(`+${s.prayerBonus} prayer`);
  return bits;
}

export default function GearItemRow({ item, equipped, available, isUnlocked, onToggle }) {
  const classes = [
    'gear-item-row',
    equipped ? 'equipped' : '',
    available ? '' : 'locked',
  ]
    .filter(Boolean)
    .join(' ');

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
            {keyStats(item).length > 0 ? (
              <span className="gear-item-stats">{keyStats(item).join(' · ')}</span>
            ) : (
              item.stats?.setEffect && (
                <span className="gear-item-stats gear-item-passive">{item.stats.setEffect}</span>
              )
            )}
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
