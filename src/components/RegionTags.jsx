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

// Archaeology dig-site-artefact-only requirement (see the `artefact` field
// docs in gearAvailability.js). Always single-region - label is derived
// ("Artefacts: X") rather than hand-written, and the tooltip is
// item-specific (what exactly gets skipped once the "Artefacts are not
// region-locked" toggle is on), falling back to a generic explanation.
function ArtefactPill({ regionId, note, isUnlocked }) {
  const unlocked = isRegionUnlocked(regionId, isUnlocked);
  const label = `Artefacts: ${REGION_SHORT_LABELS[regionId] ?? regionId}`;
  return (
    <TagTooltip
      className={`region-tag region-tag-artefact${unlocked ? ' region-tag-artefact-unlocked' : ''}`}
      tooltip={note ?? 'Region required to obtain artefacts.'}
    >
      {label}
    </TagTooltip>
  );
}

// A `region: 'relic'` item that names the specific League Relic that grants
// it (see the `leagueRelic` field docs in gearAvailability.js) - gates on
// that exact pick rather than always showing unlocked, unlike a plain
// 'relic' item with no relic named.
function LeagueRelicPill({ relicName, selectedLeagueRelics }) {
  const unlocked = selectedLeagueRelics.includes(relicName);
  return (
    <TagTooltip
      className={`region-tag region-tag-league-relic${unlocked ? ' region-tag-league-relic-unlocked' : ''}`}
      tooltip={`Requires picking the ${relicName} League Relic.`}
    >
      ★ {relicName}
    </TagTooltip>
  );
}

function RegionGroupPill({ group, isUnlocked, selectedLeagueRelics }) {
  if (group.leagueRelic) {
    return <LeagueRelicPill relicName={group.leagueRelic} selectedLeagueRelics={selectedLeagueRelics} />;
  }
  if (group.artefact) {
    return <ArtefactPill regionId={group.regions[0]} note={group.note} isUnlocked={isUnlocked} />;
  }
  if (group.label) {
    return <ResourcePill label={group.label} regions={group.regions} isUnlocked={isUnlocked} />;
  }
  return group.regions.map((regionId, altIndex) => (
    <span className="region-tag-or-item" key={regionId}>
      {altIndex > 0 && <span className="region-tag-or">/</span>}
      <RegionPill regionId={regionId} unlocked={isRegionUnlocked(regionId, isUnlocked)} />
    </span>
  ));
}

export default function RegionTags({ item, isUnlocked, selectedLeagueRelics = [] }) {
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
          <RegionGroupPill group={group} isUnlocked={isUnlocked} selectedLeagueRelics={selectedLeagueRelics} />
        </span>
      ))}
      {item.source?.softRegion && (
        <TagTooltip className="region-tag region-tag-soft" tooltip={item.source.softNote}>
          {item.source.softLabel ?? `Possibly ${REGION_SHORT_LABELS[item.source.softRegion] ?? item.source.softRegion}`}
        </TagTooltip>
      )}
      {item.source?.softRegions?.map(({ region, note, label }) => (
        <TagTooltip key={region} className="region-tag region-tag-soft" tooltip={note}>
          {label ?? `Possibly ${REGION_SHORT_LABELS[region] ?? region}`}
        </TagTooltip>
      ))}
    </span>
  );
}
