import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
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
//
// `hasCrystalGrace` (spellbooks only - SpellbooksPage passes `undefined` on
// the Prayers tab, never `false`) is a second, region-independent unlock
// path: the Crystal Grace league relic's own effect text is "Unlocks all
// Magic spells across all spellbooks", so any card that isn't already
// globally available gets an extra "Crystal Grace" tag alongside its region
// tags - unlit until the relic is actually picked, at which point it also
// bypasses the region gate entirely (see `available` below).
export default function UnlockCard({ entry, isUnlocked, extension, hasCrystalGrace }) {
  const regionAvailable = isGearItemAvailable(entry, isUnlocked);
  const showCrystalGraceTag = hasCrystalGrace !== undefined && entry.source?.region !== 'global';
  const available = regionAvailable || Boolean(hasCrystalGrace);
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
            <TagTooltip className="badge unlock-card-extension-badge" tooltip={`Extends ${extension}`}>
              extension
            </TagTooltip>
          )}
        </span>
        <span className="unlock-card-tags">
          <RegionTags item={entry} isUnlocked={isUnlocked} />
          {showCrystalGraceTag && (
            <TagTooltip
              className={`region-tag region-tag-crystal-grace${hasCrystalGrace ? ' region-tag-crystal-grace-unlocked' : ''}`}
              tooltip="Crystal Grace (League Relic) unlocks every spellbook and spell, bypassing the usual region requirement."
            >
              Crystal Grace
            </TagTooltip>
          )}
        </span>
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
        <TagTooltip className="region-tag region-tag-soft" tooltip={entry.softNote}>
          Possibly {REGION_SHORT_LABELS[entry.softRegion] ?? entry.softRegion}
        </TagTooltip>
      )}
    </div>
  );
}
