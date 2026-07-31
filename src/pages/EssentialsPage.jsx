import RegionTags from '../components/RegionTags';
import RetryImage from '../components/RetryImage';
import { ESSENTIALS } from '../data/essentials';
import { isGearItemAvailable } from '../data/gearAvailability';
import { wikiContextMenuHandler } from '../utils/wiki';

// Availability, tags and locked styling all come from the same helpers gear,
// abilities and relics use - an essential is just another region-gated thing,
// so it gets the same engine rather than a parallel one.
export default function EssentialsPage({ isUnlocked, selectedLeagueRelics = [] }) {
  const available = ESSENTIALS.map((entry) => ({
    entry,
    ok: isGearItemAvailable(entry, isUnlocked, { selectedLeagueRelics }),
  }));
  const readyCount = available.filter((e) => e.ok).length;

  return (
    <>
      <header>
        <h1>Essentials</h1>
        <p>
          The account-wide unlocks that set your combat ceiling but are not gear, abilities or
          prayers - potions, augmentation, familiars, prayer restore. Each one lights up once your
          regions and league relics actually support it.
        </p>
      </header>

      <main className="abilities-page">
        <p className="essentials-tally">
          <strong>{readyCount}</strong> of {ESSENTIALS.length} supported by your current picks
        </p>

        <div className="gear-item-rows">
          {available.map(({ entry, ok }) => (
            <div
              key={entry.name}
              className={`gear-item-row ability-row essential-row${ok ? '' : ' locked'}`}
            >
              <div
                className="gear-item-main ability-row-main"
                onContextMenu={wikiContextMenuHandler(entry.name)}
                aria-disabled={!ok}
              >
                <div className="gear-item-top">
                  <span className="gear-item-name">
                    {/* A tick rather than colour alone - the locked state is
                        otherwise only a dimming, which is easy to miss. */}
                    {ok && (
                      <span className="gear-item-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                    {entry.name}
                  </span>
                  <RegionTags
                    item={entry}
                    isUnlocked={isUnlocked}
                    selectedLeagueRelics={selectedLeagueRelics}
                  />
                </div>
                <div className="gear-item-bottom">
                  <RetryImage src={entry.icon} alt="" loading="eager" className="essential-icon" />
                  <span className="gear-item-info">
                    <span className="essential-summary">{entry.summary}</span>
                    <span className="essential-why">{entry.why}</span>
                    <span className="gear-item-source">{entry.source?.detail}</span>
                    {/* A practical footnote about something that IS available -
                        kept visually distinct from `caveat`, which flags a
                        requirement we are not sure of. */}
                    {entry.note && <span className="essential-note">{entry.note}</span>}
                    {entry.caveat && (
                      <span className="essential-caveat">
                        <span className="essential-caveat-label">Unconfirmed</span>
                        {entry.caveat}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
