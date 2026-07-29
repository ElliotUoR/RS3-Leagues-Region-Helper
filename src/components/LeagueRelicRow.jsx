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

// Row for a league relic power - unlike RelicRow (Arch relics) there's no
// region-gating/locking here (league relics aren't tied to any region) and
// no overall pick cap, so every row is always clickable: selecting one
// either toggles it off, toggles it on, or (within a known tier) swaps out
// whatever else was picked there - see useLeagueRelicSelection.js.
export default function LeagueRelicRow({ relic, selected, onToggleSelect }) {
  const classes = ['gear-item-row', 'ability-row', 'relic-row', 'league-relic-row', selected ? 'selected' : '']
    .filter(Boolean)
    .join(' ');

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
            {relic.regionTagNote && (
              <li className="league-relic-tag-note">
                {relic.regionTagNote.prefix}{' '}
                {relic.regionTagNote.tags.map((tag) => {
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
                })}{' '}
                {relic.regionTagNote.suffix}
              </li>
            )}
          </ul>
        </div>
      </button>
      {relic.dropTable && <RelicDropTablePanel dropTable={relic.dropTable} />}
    </div>
  );
}
