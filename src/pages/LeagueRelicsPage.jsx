import { useMemo } from 'react';
import LeagueRelicRow from '../components/LeagueRelicRow';
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
        {tierGroups.map(([tier, relics]) => (
          <section key={tier} className="league-relic-tier-group">
            <h2 className="league-relic-tier-heading">
              {tier === 'unknown' ? 'Unknown tier' : `Tier ${tier}`}
              <span className="league-relic-tier-note">{tier === 'unknown' ? 'pick any number' : 'pick one'}</span>
            </h2>
            <div className="gear-item-rows">
              {relics.map((relic) => (
                <LeagueRelicRow
                  key={relic.name}
                  relic={relic}
                  selected={selected.includes(relic.name)}
                  onToggleSelect={toggleLeagueRelic}
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
