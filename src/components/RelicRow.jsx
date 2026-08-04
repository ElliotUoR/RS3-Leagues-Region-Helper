import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
import { wikiContextMenuHandler } from '../utils/wiki';

// Row for a relic power: power name (primary) + relic/artefact name
// (subtitle), icon, region tags, effect text, and unlock detail. Unlike
// AbilityRow this one IS clickable - selecting/deselecting one of the
// player's 3 chosen relics - but right-click still opens the underlying
// relic's wiki page, same as everywhere else.
//
// `hasAntiquarian` is a second, region-independent unlock path (same
// pattern as UnlockCard's `hasCrystalGrace`): the Antiquarian league
// relic's own effect text is "All Archaeology relics are available to use
// after completing the Archaeology tutorial", so any non-global arch relic
// gets an extra tag alongside its region tags - unlit until the relic is
// actually picked, at which point `available` (computed by the caller)
// also bypasses the region gate entirely.
export default function RelicRow({ relic, available, isUnlocked, selected, selectable, onToggleSelect, hasAntiquarian }) {
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
        onContextMenu={wikiContextMenuHandler(relic.wikiName ?? relic.relicName)}
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
          <span className="unlock-card-tags">
            <RegionTags item={relic} isUnlocked={isUnlocked} />
            {hasAntiquarian !== undefined && relic.source?.region !== 'global' && (
              <TagTooltip
                className={`region-tag region-tag-antiquarian${hasAntiquarian ? ' region-tag-antiquarian-unlocked' : ''}`}
                tooltip="Antiquarian unlocks are arch relics"
              >
                Antiquarian
              </TagTooltip>
            )}
          </span>
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
