import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { wikiContextMenuHandler } from '../utils/wiki';

// Read-only counterpart to GearItemRow: no equip/toggle interaction, just
// name, icon, region tags, and unlock detail — greyed out when locked.
// Right-click still opens the ability's wiki page, same as gear rows.
export default function AbilityRow({ ability, available, isUnlocked }) {
  const classes = ['gear-item-row', 'ability-row', available ? '' : 'locked'].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div
        className="gear-item-main ability-row-main"
        onContextMenu={wikiContextMenuHandler(ability.name)}
        aria-disabled={!available}
      >
        <div className="gear-item-top">
          <span className="gear-item-name">{ability.name}</span>
          <RegionTags item={ability} isUnlocked={isUnlocked} />
        </div>
        <div className="gear-item-bottom">
          <RetryImage src={ability.icon} alt="" loading="eager" />
          <span className="gear-item-info">
            <span className="gear-item-source">{ability.source?.detail}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
