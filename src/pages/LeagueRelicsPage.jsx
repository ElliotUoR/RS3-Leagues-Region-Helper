import { useMemo, useState } from 'react';
import LeagueRelicRow from '../components/LeagueRelicRow';
import RelicPassivesModal from '../components/RelicPassivesModal';
import { LEAGUE_RELICS } from '../data/leagueRelics';

// Groups relics by tier - numeric tiers ascending, then a trailing "unknown"
// group for relics with `tier: null` (see data/leagueRelics.js). Recomputed
// once (LEAGUE_RELICS is static reference data, not state), not per render.
function groupByTier(relics) {
  const byTier = new Map();
  for (const relic of relics) {
    const key = relic.tier ?? 'unknown';
    if (!byTier.has(key)) byTier.set(key, []);
    byTier.get(key).push(relic);
  }
  return [...byTier.entries()].sort(([a], [b]) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return a - b;
  });
}

export default function LeagueRelicsPage({ selected, toggleLeagueRelic }) {
  const tierGroups = useMemo(() => groupByTier(LEAGUE_RELICS), []);
  // Compact is the default view on both desktop and mobile (per the brief) -
  // a plain button rather than GearPage's checkbox since there's only one
  // relevant state here, and "toggle to X mode" reads clearer as an action
  // than a checked/unchecked label would.
  const [compactMode, setCompactMode] = useState(true);

  return (
    <>
      <header>
        <h1>League Relics</h1>
        <p>
          Relics chosen directly from the league's own relic tree, not tied to any region - pick one
          per tier. Relics whose tier isn't confirmed yet are listed separately with no pick limit.
        </p>
      </header>

      <main className="abilities-page">
        {tierGroups.map(([tier, relics], index) => (
          <section key={tier} className="league-relic-tier-group">
            <h2 className="league-relic-tier-heading">
              {tier === 'unknown' ? 'Unknown tier' : `Tier ${tier}`}
              <span className="league-relic-tier-note">{tier === 'unknown' ? 'pick any number' : 'pick one'}</span>
              {/* Lives on the first tier heading rather than the page header
                  so it sits inline, right-aligned, on the same row as "Tier
                  1 - pick one" instead of stacked above it. */}
              {index === 0 && (
                <>
                  <RelicPassivesModal />
                  <button
                    type="button"
                    className="league-relic-mode-toggle"
                    onClick={() => setCompactMode((prev) => !prev)}
                  >
                    {compactMode ? 'Toggle to detailed mode' : 'Toggle to compact mode'}
                  </button>
                </>
              )}
            </h2>
            <div className={`gear-item-rows${compactMode ? ' compact' : ''}`}>
              {relics.map((relic) => (
                <LeagueRelicRow
                  key={relic.name}
                  relic={relic}
                  selected={selected.includes(relic.name)}
                  onToggleSelect={toggleLeagueRelic}
                  compact={compactMode}
                />
              ))}
            </div>
          </section>
        ))}

        <section className="dev-note">
          <p>
            For developers: relics support deep-link import from other sites -{' '}
            <a className="notice-link" href="#relic-import-docs">
              see the docs
            </a>.
          </p>
        </section>
      </main>
    </>
  );
}
