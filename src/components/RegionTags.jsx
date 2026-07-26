import { isGearItemImpossible, normalizeRegionGroups } from '../data/gearAvailability';
import { REGION_COLORS, REGION_SHORT_LABELS } from '../data/regionColors';
import TagTooltip from './TagTooltip';

function isRegionUnlocked(regionId, isUnlocked) {
  return regionId === 'global' || regionId === 'relic' || isUnlocked(regionId);
}

function RegionPill({ regionId, unlocked }) {
  const color = REGION_COLORS[regionId] ?? '#888888';
  const label = REGION_SHORT_LABELS[regionId] ?? regionId;
  return (
    <span
      className={`region-tag${unlocked ? '' : ' region-tag-locked'}`}
      style={unlocked ? { '--tag-color': color } : undefined}
    >
      {label}
    </span>
  );
}

// Collapses a wide OR-group (e.g. 5 regions that all yield the same ore)
// into a single named tag, so listing every alternative doesn't blow out the
// card layout. Lights up if any underlying region is unlocked; the tooltip
// spells out which regions actually satisfy it.
function ResourcePill({ label, regions, isUnlocked }) {
  const unlocked = regions.some((r) => isRegionUnlocked(r, isUnlocked));
  const regionNames = regions.map((r) => REGION_SHORT_LABELS[r] ?? r).join(' / ');
  return (
    <TagTooltip
      className={`region-tag region-tag-resource${unlocked ? ' region-tag-resource-unlocked' : ''}`}
      tooltip={`Requires: ${regionNames}`}
    >
      {label}
    </TagTooltip>
  );
}

export default function RegionTags({ item, isUnlocked }) {
  if (isGearItemImpossible(item)) {
    return (
      <span className="region-tags">
        <TagTooltip
          className="region-tag region-tag-impossible"
          tooltip={item.source?.impossibleReason ?? 'Requires more regions than a single Leagues run can unlock.'}
        >
          Not obtainable
        </TagTooltip>
      </span>
    );
  }

  const groups = normalizeRegionGroups(item);

  return (
    <span className="region-tags">
      {groups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <span className="region-tag-group" key={groupIndex}>
          {groupIndex > 0 && <span className="region-tag-and">+</span>}
          {group.label ? (
            <ResourcePill label={group.label} regions={group.regions} isUnlocked={isUnlocked} />
          ) : (
            group.regions.map((regionId, altIndex) => (
              <span className="region-tag-or-item" key={regionId}>
                {altIndex > 0 && <span className="region-tag-or">/</span>}
                <RegionPill regionId={regionId} unlocked={isRegionUnlocked(regionId, isUnlocked)} />
              </span>
            ))
          )}
        </span>
      ))}
      {item.source?.softRegion && (
        <TagTooltip className="region-tag region-tag-soft" tooltip={item.source.softNote}>
          Possibly {REGION_SHORT_LABELS[item.source.softRegion] ?? item.source.softRegion}
        </TagTooltip>
      )}
      {item.source?.softRegions?.map(({ region, note }) => (
        <TagTooltip key={region} className="region-tag region-tag-soft" tooltip={note}>
          Possibly {REGION_SHORT_LABELS[region] ?? region}
        </TagTooltip>
      ))}
    </span>
  );
}
