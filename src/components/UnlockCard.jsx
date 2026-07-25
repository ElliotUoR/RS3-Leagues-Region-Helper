import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { isGearItemAvailable } from '../data/gearAvailability';
import { REGION_SHORT_LABELS } from '../data/regionColors';
import { wikiContextMenuHandler } from '../utils/wiki';

// Read-only unlock-status card for a spellbook/prayer-book (or a matched set
// unlocked together, e.g. the 5 Knight Waves prayers) - name, hard region
// tags (which gate greying-out, same as everywhere else), one or more icons,
// and an optional non-gating "possibly requires" soft tag. `extension`
// marks a card rendered under a parent by UnlockCardGroup - shrinks it
// slightly and adds an "Extends {parent}" badge instead of repeating the
// parent's own region tags.
export default function UnlockCard({ entry, isUnlocked, extension }) {
  const available = isGearItemAvailable(entry, isUnlocked);
  const multiIcon = entry.icons.length > 1;
  const classes = ['unlock-card', extension ? 'unlock-card-extension' : '', available ? '' : 'locked']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="unlock-card-header">
        <span className="unlock-card-name">
          {entry.name}
          {extension && (
            <span className="badge unlock-card-extension-badge" title={`Extends ${extension}`}>
              extension
            </span>
          )}
        </span>
        <RegionTags item={entry} isUnlocked={isUnlocked} />
      </div>

      <div className={`unlock-card-icons${multiIcon ? ' multi' : ''}`}>
        {entry.icons.map((ic) => (
          <div className="unlock-card-icon" key={ic.name} title={ic.name} onContextMenu={wikiContextMenuHandler(ic.name)}>
            <RetryImage src={ic.icon} alt="" loading="eager" />
            {multiIcon && <span className="unlock-card-icon-label">{ic.name}</span>}
          </div>
        ))}
      </div>

      {entry.source?.detail && <p className="unlock-card-detail">{entry.source.detail}</p>}

      {entry.softRegion && (
        <span className="region-tag region-tag-soft" title={entry.softNote}>
          Possibly {REGION_SHORT_LABELS[entry.softRegion] ?? entry.softRegion}
        </span>
      )}
    </div>
  );
}
