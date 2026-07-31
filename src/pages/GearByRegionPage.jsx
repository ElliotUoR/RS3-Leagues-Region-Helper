import { useEffect, useMemo, useState } from 'react';
import GearByRegionRow from '../components/GearByRegionRow';
import { REGIONS, REGION_IDS } from '../data/regions';
import { GEAR_SLOTS } from '../data/gear';
import { getGearForRegion, searchAllGear } from '../utils/gearByRegion';
import { applyCombineSets } from '../data/gearSets';

// On by default (per the brief) on both desktop and mobile - unlike
// GearPage's own compact-mode checkbox (hidden on mobile there, since it
// relies on a hover tooltip that touch devices can't reach), this page's
// compact rows keep everything visible without hover (see
// GearByRegionRow), so there's no reason to hide the toggle on small
// screens. Persisted so the choice survives reloads.
const COMPACT_MODE_STORAGE_KEY = 'rs3-leagues-gear-by-region-compact';
// Same on-by-default/persisted treatment as compact mode above.
const COMBINE_SETS_STORAGE_KEY = 'rs3-leagues-gear-by-region-combine-sets';

function loadInitialCompactMode() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(COMPACT_MODE_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function loadInitialCombineSets() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(COMBINE_SETS_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

const SLOT_LABELS = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  ammo: 'Ammo',
  head: 'Head',
  torso: 'Torso',
  legs: 'Legs',
  hands: 'Hands',
  feet: 'Feet',
  back: 'Back',
  neck: 'Neck',
  ring: 'Ring',
  pocket: 'Pocket',
};

// "Kharidian Desert" -> "Desert" applies on both desktop and mobile (it's
// just too long a name for these pill buttons at any width) - every other
// region keeps its full regions.js name on desktop, only switching to the
// shorter form below `.region-name-short`/`.region-name-full`'s CSS
// breakpoint (see index.css, same show/hide-at-700px technique as
// site-title-full/site-title-short).
const REGION_DISPLAY_NAME = { kharidianDesert: 'Desert' };
const REGION_SHORT_NAME = {
  misthalin: 'Misth',
  karamja: 'Karam',
  havenhythe: 'Haven',
  morytania: 'Mory',
  anachronia: 'Ana',
  kharidianDesert: 'Desert',
  asgarnia: 'Asg',
  wilderness: 'Wildy',
  fremennikProvince: 'Fremmy',
  kandarin: 'Kan',
  tirannwn: 'Tira',
};

// Region button colours match the interactive region map's own palette
// exactly (regions.js's `color` field) rather than the separately-tuned
// gear-tag palette (regionColors.js) - this page's buttons are meant to
// visually echo the map itself. Wilderness's map colour (#080808, near
// black) has essentially no contrast as text-on-tinted-background the way
// every other region's colour does, so it alone gets a solid-fill treatment
// with light text instead of the light-tint-with-coloured-text look the
// other ten use - see the `.region-select-button.region-wilderness` override.
function groupBySlot(items) {
  const bySlot = new Map();
  for (const slot of GEAR_SLOTS) bySlot.set(slot, []);
  for (const item of items) {
    if (!bySlot.has(item.slot)) bySlot.set(item.slot, []);
    bySlot.get(item.slot).push(item);
  }
  return [...bySlot.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([slot, list]) => [
      slot,
      [...list].sort((a, b) => (b.level?.level ?? 0) - (a.level?.level ?? 0) || a.name.localeCompare(b.name)),
    ]);
}

export default function GearByRegionPage({ isUnlocked }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [subTab, setSubTab] = useState('direct');
  const [compactMode, setCompactMode] = useState(loadInitialCompactMode);
  const [combineSets, setCombineSets] = useState(loadInitialCombineSets);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.localStorage.setItem(COMPACT_MODE_STORAGE_KEY, String(compactMode));
  }, [compactMode]);

  useEffect(() => {
    window.localStorage.setItem(COMBINE_SETS_STORAGE_KEY, String(combineSets));
  }, [combineSets]);

  const { direct, combination } = useMemo(
    () => (selectedRegion ? getGearForRegion(selectedRegion) : { direct: [], combination: [] }),
    [selectedRegion],
  );

  // Search deliberately OVERRIDES the region view rather than filtering it:
  // the point of this bar is to answer "where does X come from" without
  // knowing its region first, so results span every region. The selected
  // region is kept in state (its pill stays lit) so clearing the search
  // returns you exactly where you were.
  const searching = search.trim().length > 0;
  const searchResults = useMemo(() => (searching ? searchAllGear(search) : []), [search, searching]);

  const regionItems = subTab === 'direct' ? direct : combination;
  const activeItems = searching ? searchResults : regionItems;

  // With combine sets on, slot no longer means much for the pieces that got
  // folded into a set (e.g. "Barrows Items" spans head/torso/legs/weapon at
  // once), so the whole list - sets and any leftover singles alike - is
  // shown as one flat list ordered by level instead of split into slot
  // sections. With it off, `sets` is always empty (see applyCombineSets)
  // and the page falls back to the familiar per-slot breakdown.
  const { sets, singles } = useMemo(() => applyCombineSets(activeItems, { combine: combineSets }), [activeItems, combineSets]);
  const groups = useMemo(() => groupBySlot(singles), [singles]);
  const flatSorted = useMemo(
    () =>
      [...sets, ...singles].sort(
        (a, b) => (b.level?.level ?? 0) - (a.level?.level ?? 0) || a.name.localeCompare(b.name),
      ),
    [sets, singles],
  );

  // Picking a region clears the search, so the region you just clicked is
  // actually what you see - otherwise the click would appear to do nothing.
  function selectRegion(id) {
    setSearch('');
    setSelectedRegion(id);
  }

  return (
    <>
      <header>
        <h1>Gear by Region</h1>
        <p>
          Pick a region to see every piece of gear tied to it, across every combat style and slot. "Direct" items are
          obtainable from this region alone; "Combination" items also need at least one other region unlocked.
        </p>
      </header>

      <main className="gear-by-region-page">
        <div className="gear-by-region-search">
          <input
            type="search"
            className="gear-search"
            placeholder="Search all gear by name (ignores region)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search all gear by name, across every region"
          />
          {searching && (
            <button type="button" className="gear-search-clear" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>

        <div className="region-select-grid">
          {REGION_IDS.map((id) => {
            const region = REGIONS[id];
            const unlocked = isUnlocked(id);
            const classes = [
              'region-select-button',
              `region-${id}`,
              selectedRegion === id ? 'active' : '',
              unlocked ? 'region-unlocked' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={id}
                type="button"
                className={classes}
                style={{ '--region-color': region.color }}
                onClick={() => selectRegion(id)}
              >
                {unlocked && <span className="region-unlocked-check">✓</span>}
                <span className="region-name-full">{REGION_DISPLAY_NAME[id] ?? region.name}</span>
                <span className="region-name-short">{REGION_SHORT_NAME[id]}</span>
              </button>
            );
          })}
        </div>

        {!searching && !selectedRegion ? (
          <p className="gear-by-region-empty">Select a region above, or search for a specific item.</p>
        ) : (
          <div className="gear-by-region-detail">
            <div className="gear-by-region-controls">
              {/* The Direct/Combination split is a per-region idea - it means
                  "this region alone is enough" vs "also needs another region"
                  - so it has no meaning for a search spanning every region.
                  Replaced with a plain result count while searching. */}
              {searching ? (
                <p className="gear-by-region-search-summary">
                  {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'} matching
                  {' '}&ldquo;{search.trim()}&rdquo; across <strong>all regions</strong>
                </p>
              ) : (
                <div className="sort-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subTab === 'direct'}
                    className={`sort-tab${subTab === 'direct' ? ' active' : ''}`}
                    onClick={() => setSubTab('direct')}
                  >
                    Direct ({direct.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subTab === 'combination'}
                    className={`sort-tab${subTab === 'combination' ? ' active' : ''}`}
                    onClick={() => setSubTab('combination')}
                  >
                    Combination ({combination.length})
                  </button>
                </div>
              )}
              <label className="gear-by-region-compact-toggle">
                <input
                  type="checkbox"
                  checked={combineSets}
                  onChange={(e) => setCombineSets(e.target.checked)}
                />
                <span>Combine sets</span>
              </label>
              <label className="gear-by-region-compact-toggle">
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                />
                <span>Compact mode</span>
              </label>
            </div>

            {activeItems.length === 0 && (
              <p className="gear-by-region-empty">
                {searching
                  ? `No gear matches "${search.trim()}".`
                  : `No ${subTab} items found for ${REGIONS[selectedRegion].name}.`}
              </p>
            )}
            {activeItems.length > 0 && combineSets && (
              <div className={`gear-item-rows${compactMode ? ' compact' : ''}`}>
                {flatSorted.map((item) => (
                  <GearByRegionRow key={item.name} item={item} isUnlocked={isUnlocked} compact={compactMode} />
                ))}
              </div>
            )}
            {activeItems.length > 0 &&
              !combineSets &&
              groups.map(([slot, items]) => (
                <div key={slot} className="gear-by-region-slot-group">
                  <h3>{SLOT_LABELS[slot] ?? slot}</h3>
                  <div className={`gear-item-rows${compactMode ? ' compact' : ''}`}>
                    {items.map((item) => (
                      <GearByRegionRow key={item.name} item={item} isUnlocked={isUnlocked} compact={compactMode} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </>
  );
}
