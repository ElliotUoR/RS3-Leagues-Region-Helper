import { isGearItemDisabled, isGearItemImpossible, normalizeLeagueRelicList, normalizeRegionGroups } from '../data/gearAvailability';
import { REGION_COLORS, REGION_SHORT_LABELS, RESOURCE_TAG_COLORS } from '../data/regionColors';
import TagTooltip from './TagTooltip';

function isRegionUnlocked(regionId, isUnlocked) {
  return regionId === 'global' || regionId === 'relic' || regionId === 'tier6' || isUnlocked(regionId);
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
// spells out which regions actually satisfy it. A group can also carry one
// or more `leagueRelic` alternatives alongside its regions (see
// gearAvailability.js's normalizeLeagueRelicList) - e.g. Endless Harvest's
// Mining tier-upgrade chance AND Transmutation's resource-conversion spells
// each independently produce Luminate/Oricalchite/Light animica ore without
// visiting any of the listed regions, so either relic being picked lights
// the tag up too.
function ResourcePill({ label, regions, isUnlocked, leagueRelic, selectedLeagueRelics = [] }) {
  const relicOptions = normalizeLeagueRelicList(leagueRelic);
  const relicSatisfied = relicOptions.some((relic) => selectedLeagueRelics.includes(relic));
  const unlocked = relicSatisfied || regions.some((r) => isRegionUnlocked(r, isUnlocked));
  const regionNames = regions.map((r) => REGION_SHORT_LABELS[r] ?? r).join(' / ');
  let tooltip = `Requires: ${regionNames}`;
  if (relicOptions.length > 0) {
    const relicWord = relicOptions.length > 1 ? 'Relics' : 'Relic';
    const relicNames = relicOptions.map((r) => `"${r}"`).join(' / ');
    tooltip = `${tooltip} (or the League ${relicWord} ${relicNames} - see its effects for how it produces this without the region)`;
  }
  const customColor = RESOURCE_TAG_COLORS[label];
  return (
    <TagTooltip
      className={`region-tag region-tag-resource${unlocked ? ' region-tag-resource-unlocked' : ''}`}
      style={unlocked && customColor ? { '--resource-color': customColor } : undefined}
      tooltip={tooltip}
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
  // A pure `region: 'relic'` group (no real region alternative) always
  // renders as the dedicated relic pill. A group that carries a
  // `leagueRelic` *alongside* real regions (e.g. the ore-upgrade tags) falls
  // through to the normal label/region rendering below instead, just with
  // the relic wired in as an extra way to light up.
  const isPureRelicGroup = group.leagueRelic && group.regions.length === 1 && group.regions[0] === 'relic';
  if (isPureRelicGroup) {
    return <LeagueRelicPill relicName={group.leagueRelic} selectedLeagueRelics={selectedLeagueRelics} />;
  }
  if (group.artefact) {
    return <ArtefactPill regionId={group.regions[0]} note={group.note} isUnlocked={isUnlocked} />;
  }
  if (group.label) {
    return (
      <ResourcePill
        label={group.label}
        regions={group.regions}
        isUnlocked={isUnlocked}
        leagueRelic={group.leagueRelic}
        selectedLeagueRelics={selectedLeagueRelics}
      />
    );
  }
  return group.regions.map((regionId, altIndex) => (
    <span className="region-tag-or-item" key={regionId}>
      {altIndex > 0 && <span className="region-tag-or">/</span>}
      <RegionPill regionId={regionId} unlocked={isRegionUnlocked(regionId, isUnlocked)} />
    </span>
  ));
}

export default function RegionTags({ item, isUnlocked, selectedLeagueRelics = [] }) {
  if (isGearItemDisabled(item)) {
    return (
      <span className="region-tags">
        <TagTooltip
          className="region-tag region-tag-disabled"
          tooltip={item.source?.disabledReason ?? 'Disabled for the Leagues game mode.'}
        >
          Disabled
        </TagTooltip>
      </span>
    );
  }

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
