import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { describeSource, keyStats } from '../utils/gearItemDisplay';
import { wikiContextMenuHandler } from '../utils/wiki';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// A read-only reference row for the Gear by Region page - unlike
// GearItemRow (Gear Planner) there's no equip/toggle interaction here, just
// browsing, so this is a plain non-interactive card rather than a clickable
// button. Reuses GearItemRow's `describeSource`/`keyStats` helpers and the
// same RegionTags component (so lock state/tag styling matches the Gear
// Planner exactly) rather than duplicating that logic.
export default function GearByRegionRow({ item, isUnlocked }) {
  // Armour rating is keyed by combat style (see utils/gearStats.js) - an
  // item usable by several styles picks its first applicable style as the
  // representative one for this summary line, since most armour of this
  // kind carries the same rating across every style it's usable for anyway.
  const stats = keyStats(item, item.applicableStyles[0]);

  return (
    <div className="gear-item-row gear-by-region-row" onContextMenu={wikiContextMenuHandler(item.wikiName ?? item.name)}>
      <div className="gear-item-main">
        <div className="gear-item-top">
          <span className="gear-item-name">
            {item.name}
            {item.twoHanded && <span className="gear-item-tag-2h">2H</span>}
          </span>
          <RegionTags item={item} isUnlocked={isUnlocked} />
        </div>
        <div className="gear-item-bottom">
          <RetryImage src={item.icon} alt="" loading="eager" />
          <span className="gear-item-info">
            <span className="gear-by-region-styles">
              {item.applicableStyles.map((style) => (
                <span key={style} className={`gear-by-region-style-pill style-pill-${style}`}>
                  {STYLE_LABELS[style]}
                </span>
              ))}
            </span>
            {item.level && (
              <span className="gear-item-level">
                {item.level.skill} {item.level.level}
              </span>
            )}
            <span className="gear-item-source">{describeSource(item.source)}</span>
            {stats.length > 0 && (
              <span className="gear-item-stats">
                {stats.map((bit) => (
                  <span key={bit.type} className={`gear-stat gear-stat-${bit.type}`}>
                    {bit.text}
                  </span>
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
