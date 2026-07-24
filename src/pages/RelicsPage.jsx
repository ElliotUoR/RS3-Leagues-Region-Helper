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
    const available = rest.filter((r) => isGearItemAvailable(r, isUnlocked));
    const locked = rest.filter((r) => !isGearItemAvailable(r, isUnlocked));
    return [...picked, ...available, ...locked];
  }, [tab, search, selected, isUnlocked]);

  const tabLabel = tab === 'all' ? 'relics' : `${CATEGORY_LABELS[tab].toLowerCase()} relics`;

  return (
    <>
      <header>
        <h1>Relics</h1>
        <p>
          Archaeology relic powers, greyed out until you've picked the region(s) their dig site or
          collection requires. Pick up to {MAX_SELECTED} to plan your final loadout — click a
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
                available={isGearItemAvailable(relic, isUnlocked)}
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
