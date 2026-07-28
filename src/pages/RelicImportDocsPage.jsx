import { LEAGUE_RELICS } from '../data/leagueRelics';
import { LIVE_SITE_URL } from '../utils/deployTarget';

// Unlisted - deliberately has no site-nav link (see App.jsx's currentRoute/
// AppContent) since this is a reference page for external developers, not
// something a regular visitor needs in the tab bar. Reached via the "see the
// docs" link at the bottom of LeagueRelicsPage, or a direct #relic-import-docs
// link. Kept short on purpose (see docs/import-relics-api.md for the full
// version) - just enough for someone building against the API to get moving.
const EXAMPLE_URL = `${LIVE_SITE_URL}?import-relics=Endless%20Harvest,Crystal%20Grace`;

export default function RelicImportDocsPage() {
  return (
    <>
      <header>
        <h1>Relic import API docs</h1>
        <p>For developers building relic pickers on other sites who want to deep-link picks in here.</p>
      </header>

      <main className="docs-page">
        <section className="docs-group">
          <h2>Usage</h2>
          <p>
            Send a visitor to this URL with a comma-separated, URL-encoded list of relic names in the{' '}
            <code>import-relics</code> query param:
          </p>
          <p className="docs-code">{`${LIVE_SITE_URL}?import-relics=<name>,<name>,...`}</p>
          <p>
            Matching is case-insensitive and whitespace-trimmed. This replaces the visitor's entire League
            Relics selection, switches them to this tab, and shows a one-time confirmation - it doesn't merge
            with whatever they had picked before.
          </p>
        </section>

        <section className="docs-group">
          <h2>Example</h2>
          <p className="docs-code">
            <a href={EXAMPLE_URL}>{EXAMPLE_URL}</a>
          </p>
        </section>

        <section className="docs-group">
          <h2>Available relics</h2>
          <ul className="docs-relic-list">
            {LEAGUE_RELICS.map((relic) => (
              <li key={relic.name}>
                <span className="docs-relic-name">{relic.name}</span>
                <span className="docs-relic-tier">{relic.tier == null ? 'Unknown tier' : `Tier ${relic.tier}`}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
