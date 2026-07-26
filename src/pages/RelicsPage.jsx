import { useMemo, useState } from 'react';
import RelicRow from '../components/RelicRow';
import { RELIC_CATEGORIES, RELICS } from '../data/relics';
import { isGearItemAvailable } from '../data/gearAvailability';
import { MAX_RELICS } from '../hooks/useRelicSelection';

const CATEGORY_LABELS = {
  combat: 'Combat',
  skilling: 'Skilling',
  misc: 'Misc',
};

const TABS = [...RELIC_CATEGORIES, 'all'];
const MAX_SELECTED = MAX_RELICS;

export default function RelicsPage({ isUnlocked, selected, toggleRelic }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [ignoreArtefactRegions, setIgnoreArtefactRegions] = useState(false);

  function isRelicAvailable(relic) {
    return isGearItemAvailable(relic, isUnlocked, { ignoreArtefactRegions });
  }

  const displayRelics = useMemo(() => {
    const categoryFiltered = tab === 'all' ? RELICS : RELICS.filter((r) => r.category === tab);
    const query = search.trim().toLowerCase();
    const searched = query
      ? categoryFiltered.filter(
          (r) => r.name.toLowerCase().includes(query) || r.relicName.toLowerCase().includes(query),
        )
      : categoryFiltered;

    // Picked relics are promoted to the top (in the order they were picked);
    // everything else keeps the usual unlocked-before-locked convention.
    const picked = selected.map((name) => searched.find((r) => r.name === name)).filter(Boolean);
    const rest = searched.filter((r) => !selected.includes(r.name));
    const available = rest.filter((r) => isRelicAvailable(r));
    const locked = rest.filter((r) => !isRelicAvailable(r));
    return [...picked, ...available, ...locked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, selected, isUnlocked, ignoreArtefactRegions]);

  const tabLabel = tab === 'all' ? 'relics' : `${CATEGORY_LABELS[tab].toLowerCase()} relics`;

  return (
    <>
      <header>
        <h1>Relics</h1>
        <p>
          Archaeology relic powers, greyed out until you've picked the region(s) their dig site or
          collection requires. Pick up to {MAX_SELECTED} to plan your final loadout - click a
          picked relic again to free up its slot.
        </p>
      </header>

      <main className="abilities-page">
        <div className="abilities-controls">
          <div className="style-tabs" role="tablist">
            {TABS.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={tab === c}
                className={`style-tab${tab === c ? ' active' : ''}`}
                onClick={() => setTab(c)}
              >
                {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="gear-search"
            placeholder="Search relics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="abilities-toggles">
            <label
              className="hide-locked-toggle"
              title="Archaeology materials can be gathered remotely via Research, without visiting the dig site itself - treats 'Artefacts: X' tags as satisfied. A relic's collector hand-in location, and any non-Archaeology component, still gates as normal."
            >
              <input
                type="checkbox"
                checked={ignoreArtefactRegions}
                onChange={(e) => setIgnoreArtefactRegions(e.target.checked)}
              />
              <span>Artefacts are not region-locked</span>
            </label>
          </div>
        </div>

        <p className="relic-pick-count">
          {selected.length}/{MAX_SELECTED} relics picked
        </p>

        {displayRelics.length > 0 ? (
          <div className="gear-item-rows">
            {displayRelics.map((relic) => (
              <RelicRow
                key={relic.name}
                relic={relic}
                available={isRelicAvailable(relic)}
                isUnlocked={isUnlocked}
                selected={selected.includes(relic.name)}
                selectable={selected.length < MAX_SELECTED}
                onToggleSelect={toggleRelic}
              />
            ))}
          </div>
        ) : (
          <p className="gear-empty">No unlockable {tabLabel}.</p>
        )}
      </main>
    </>
  );
}
