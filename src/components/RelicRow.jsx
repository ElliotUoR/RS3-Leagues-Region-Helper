import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { wikiContextMenuHandler } from '../utils/wiki';

// Row for a relic power: power name (primary) + relic/artefact name
// (subtitle), icon, region tags, effect text, and unlock detail. Unlike
// AbilityRow this one IS clickable - selecting/deselecting one of the
// player's 3 chosen relics - but right-click still opens the underlying
// relic's wiki page, same as everywhere else.
export default function RelicRow({ relic, available, isUnlocked, selected, selectable, onToggleSelect }) {
  const classes = [
    'gear-item-row',
    'ability-row',
    'relic-row',
    available ? '' : 'locked',
    selected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // A picked relic must stay removable even if it becomes locked afterwards
  // (e.g. the player deselects a region it depended on) - only a *new* pick
  // requires the relic to be available and a slot to be free.
  const canClick = selected || (available && selectable);

  return (
    <div className={classes}>
      <button
        type="button"
        className="gear-item-main ability-row-main relic-row-main"
        onClick={() => canClick && onToggleSelect(relic)}
        onContextMenu={wikiContextMenuHandler(relic.relicName)}
        aria-disabled={!canClick}
        aria-pressed={selected}
      >
        <div className="gear-item-top">
          <span className="gear-item-name-group">
            <span className="gear-item-name">
              {selected && <span className="gear-item-check">✓</span>}
              {relic.name}
            </span>
            <span className="relic-subname">{relic.relicName}</span>
          </span>
          <RegionTags item={relic} isUnlocked={isUnlocked} />
        </div>
        <div className="gear-item-bottom">
          <RetryImage src={relic.icon} alt="" loading="eager" />
          <span className="gear-item-info">
            {relic.effect && <span className="relic-effect">{relic.effect}</span>}
            <span className="gear-item-source">{relic.source?.detail}</span>
          </span>
        </div>
      </button>
    </div>
  );
}
