import RetryImage from './RetryImage';
import RelicDropTablePanel from './RelicDropTablePanel';
import { wikiUrlContextMenuHandler, wikiUrlWithAnchor } from '../utils/wiki';
import { RESOURCE_TAG_COLORS } from '../data/regionColors';

const LEAGUE_RELICS_WIKI_PAGE = 'Equilibrium League/Relics';

// One shared wiki page for every league relic, sectioned by tier heading
// (confirmed against the page's own anchors: "Tier_1", "Unknown_Tier", and
// presumably "Tier_2" etc as more are announced) - unlike Arch relics/gear/
// abilities, there's no per-relic page to link to individually.
function relicWikiUrl(relic) {
  const anchor = relic.tier != null ? `Tier_${relic.tier}` : 'Unknown_Tier';
  return wikiUrlWithAnchor(LEAGUE_RELICS_WIKI_PAGE, anchor);
}

// Shared between compact and detailed rendering - only the wording around
// the tags shrinks in compact mode (per the "keep the tags, summarise the
// words around them" brief), the tags/pills themselves are identical.
function RegionTagNote({ note, compact }) {
  return (
    <li className="league-relic-tag-note">
      {compact ? 'Can obtain:' : note.prefix}{' '}
      {note.tags.map((tag) => {
        const customColor = RESOURCE_TAG_COLORS[tag];
        return (
          <span
            key={tag}
            className="region-tag region-tag-resource region-tag-resource-unlocked"
            style={customColor ? { '--resource-color': customColor } : undefined}
          >
            {tag}
          </span>
        );
      })}
      {!compact && ' '}
      {!compact && note.suffix}
    </li>
  );
}

// Row for a league relic power - unlike RelicRow (Arch relics) there's no
// region-gating/locking here (league relics aren't tied to any region) and
// no overall pick cap, so every row is always clickable: selecting one
// either toggles it off, toggles it on, or (within a known tier) swaps out
// whatever else was picked there - see useLeagueRelicSelection.js.
//
// `compact` (see LeagueRelicsPage's toggle button, default on) swaps the
// full effects list for a single summarised line (data/leagueRelics.js's
// `summary` field) so 3 relics fit across a desktop row and one fits
// compactly per row on mobile. The drop-table toggle/panel is unaffected by
// this - it's rendered identically (and still a sibling of the row button,
// never nested inside it) in both modes.
export default function LeagueRelicRow({ relic, selected, onToggleSelect, compact }) {
  const classes = [
    'gear-item-row',
    'ability-row',
    'relic-row',
    'league-relic-row',
    compact ? 'league-relic-row-compact' : '',
    selected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (compact) {
    return (
      <div className={classes}>
        <button
          type="button"
          className="gear-item-main ability-row-main relic-row-main league-relic-row-main-compact"
          onClick={() => onToggleSelect(relic)}
          onContextMenu={wikiUrlContextMenuHandler(relicWikiUrl(relic))}
          aria-pressed={selected}
        >
          <div className="league-relic-compact-top">
            {relic.icon ? (
              <RetryImage src={relic.icon} alt="" loading="eager" />
            ) : (
              <span className="league-relic-icon-placeholder" aria-hidden="true" />
            )}
            <span className="gear-item-name">
              {selected && <span className="gear-item-check">✓</span>}
              {relic.name}
            </span>
          </div>
          {relic.summary && <p className="league-relic-summary">{relic.summary}</p>}
          {relic.regionTagNote && (
            <ul className="league-relic-effects league-relic-effects-compact">
              <RegionTagNote note={relic.regionTagNote} compact />
            </ul>
          )}
        </button>
        {relic.dropTable && <RelicDropTablePanel dropTable={relic.dropTable} relicName={relic.name} />}
      </div>
    );
  }

  return (
    <div className={classes}>
      <button
        type="button"
        className="gear-item-main ability-row-main relic-row-main"
        onClick={() => onToggleSelect(relic)}
        onContextMenu={wikiUrlContextMenuHandler(relicWikiUrl(relic))}
        aria-pressed={selected}
      >
        <div className="gear-item-top">
          <span className="gear-item-name-group">
            <span className="gear-item-name">
              {selected && <span className="gear-item-check">✓</span>}
              {relic.name}
            </span>
          </span>
        </div>
        <div className="gear-item-bottom">
          {/* Newly-announced relics can go a while without any icon at all
              (see data/leagueRelics.js) - a plain placeholder box beats
              RetryImage's indefinite retry loop against a src that will
              never resolve. */}
          {relic.icon ? (
            <RetryImage src={relic.icon} alt="" loading="eager" />
          ) : (
            <span className="league-relic-icon-placeholder" aria-hidden="true" />
          )}
          <ul className="league-relic-effects">
            {relic.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
            {/* App-added (not wiki-verbatim, see data/leagueRelics.js) - the
                tags rendered here are the exact same pill styling gear items
                use for these labels (see RegionTags.jsx's ResourcePill),
                including any custom per-tag colour (RESOURCE_TAG_COLORS), so
                picking this relic visibly reads as "unlocking" them. */}
            {relic.regionTagNote && <RegionTagNote note={relic.regionTagNote} />}
          </ul>
        </div>
      </button>
      {relic.dropTable && <RelicDropTablePanel dropTable={relic.dropTable} />}
    </div>
  );
}
