import { useEffect, useState } from 'react';
import BuildGuideCard from '../components/BuildGuideCard';
import TierList from '../components/TierList';
import {
  BLESSING_BUILDS_EXAMPLES,
  BLESSING_TIER_LIST,
  LEAGUE_RELIC_TIER_LIST,
  RELIC_COLOURS,
} from '../data/blessingBuilds';
import { BLESSINGS, GOD_TIER_BLESSINGS } from '../data/blessings';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { isBuildTextEditable, isBuildVisible } from '../utils/buildTextEdit';

const BLESSING_ICONS = new Map([...BLESSINGS, ...GOD_TIER_BLESSINGS].map((b) => [b.name, b.icon]));
const LEAGUE_RELIC_ICONS = new Map(LEAGUE_RELICS.map((r) => [r.name, r.icon]));

// The tier lists store only grades and notes; icons and the relic accent hue
// are joined on here so TierList itself stays dataset-agnostic.
const blessingTierEntries = BLESSING_TIER_LIST.entries.map((entry) => ({
  ...entry,
  icon: BLESSING_ICONS.get(entry.name),
}));

const relicTierEntries = LEAGUE_RELIC_TIER_LIST.entries.map((entry) => ({
  ...entry,
  icon: LEAGUE_RELIC_ICONS.get(entry.name),
  hue: RELIC_COLOURS[entry.name]?.hue,
}));

function BlessingBadges(entry) {
  return (
    <>
      {entry.kind === 'god' ? (
        <span className="tier-badge tier-badge-god">God</span>
      ) : (
        <span className="tier-badge">T{entry.tier}</span>
      )}
    </>
  );
}

function RelicBadges(entry) {
  return (
    <>
      <span className="tier-badge">{entry.relicTier != null ? `T${entry.relicTier}` : '?'}</span>
      {entry.unlocksGear > 0 && (
        <span className="tier-badge tier-badge-unlocks">unlocks {entry.unlocksGear} items</span>
      )}
    </>
  );
}

// The route is `#build-guides`; an open build appends its id, e.g.
// `#build-guides/the-ironclad`. Sharing that link opens the page with that
// build already expanded, which is the main reason to put it in the URL.
const VISIBLE_BUILDS = BLESSING_BUILDS_EXAMPLES.filter(isBuildVisible);
const BUILD_IDS = new Set(VISIBLE_BUILDS.map((b) => b.id));

function buildIdFromHash() {
  const id = window.location.hash.split('/')[1];
  return id && BUILD_IDS.has(id) ? id : null;
}

// `import.meta.env.DEV` is a compile-time literal, so in production this folds
// to `false && ...` -> `false`, the toggle JSX below becomes unreachable, and
// isBuildTextEditable falls out of the bundle entirely.
const CAN_EDIT = import.meta.env.DEV && isBuildTextEditable();

export default function BuildGuidesPage() {
  const [editing, setEditing] = useState(false);
  // Multiple cards may be open at once - readers commonly want to compare two
  // builds side by side, so this is a Set rather than a single active id. Only
  // the most recently opened one is reflected in the URL.
  const [expanded, setExpanded] = useState(() => {
    const id = buildIdFromHash();
    return new Set(id ? [id] : []);
  });

  // Back/forward and hand-edited URLs both go through the hash, so listen for
  // changes rather than only reading it once on mount.
  useEffect(() => {
    function onHashChange() {
      const id = buildIdFromHash();
      if (id) setExpanded((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      const opening = !next.has(id);
      if (opening) next.add(id);
      else next.delete(id);
      // replaceState rather than assigning location.hash: this should be a
      // shareable address, not a history entry per card you poke at.
      const hash = opening ? `#build-guides/${id}` : '#build-guides';
      window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
      return next;
    });
  }

  return (
    <>
      <header>
        <h1>Build Guides</h1>
        <p>
          Complete example builds - gear, league relics, Arch relics, blessings, abilities, spellbook
          and prayers. Every build fits inside one Leagues run: the three fixed regions (Misthalin,
          Karamja, Havenhythe) plus at most three optional picks, one blessing per tier, one Tier 1
          league relic and up to two unknown-tier ones.
        </p>
      </header>

      <main className="build-guides-page">
        <p className="build-coming-soon">
          <span className="build-coming-soon-badge">
            <span aria-hidden="true">🚧</span> Coming soon: build your own guide
          </span>
        </p>

        {CAN_EDIT && (
          <div className="build-edit-bar">
            <label className="build-edit-toggle">
              <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
              <span>Edit text</span>
            </label>
            <span className="build-edit-note">
              Localhost only. Edits write straight back into <code>src/data/blessingBuilds.js</code>.
            </span>
          </div>
        )}

        <section className="build-list">
          {VISIBLE_BUILDS.map((build) => (
            <BuildGuideCard
              key={build.id}
              build={build}
              expanded={expanded.has(build.id)}
              onToggle={() => toggle(build.id)}
              editing={editing}
            />
          ))}
        </section>

        <TierList
          title="Blessing tier list"
          standfirst="Each blessing and god power graded on its own isolated power, deliberately ignoring the combos above."
          grades={BLESSING_TIER_LIST.grades}
          entries={blessingTierEntries}
          renderBadges={BlessingBadges}
          footnote="* Demon's Mark is graded on the weaker reading of its effect - tap it for detail."
        />

        <TierList
          title="League relic tier list"
          standfirst={LEAGUE_RELIC_TIER_LIST.scopeNote}
          grades={LEAGUE_RELIC_TIER_LIST.grades}
          entries={relicTierEntries}
          renderBadges={RelicBadges}
        />
      </main>
    </>
  );
}
