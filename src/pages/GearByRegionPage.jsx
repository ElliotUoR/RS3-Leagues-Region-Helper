import { useMemo, useState } from 'react';
import GearByRegionRow from '../components/GearByRegionRow';
import { REGIONS, REGION_IDS } from '../data/regions';
import { GEAR_SLOTS } from '../data/gear';
import { getGearForRegion } from '../utils/gearByRegion';

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
    .map(([slot, list]) => [slot, [...list].sort((a, b) => a.name.localeCompare(b.name))]);
}

export default function GearByRegionPage({ isUnlocked }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [subTab, setSubTab] = useState('direct');

  const { direct, combination } = useMemo(
    () => (selectedRegion ? getGearForRegion(selectedRegion) : { direct: [], combination: [] }),
    [selectedRegion],
  );

  const activeItems = subTab === 'direct' ? direct : combination;
  const groups = useMemo(() => groupBySlot(activeItems), [activeItems]);

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
                onClick={() => setSelectedRegion(id)}
              >
                {unlocked && <span className="region-unlocked-check">✓</span>}
                {region.name}
              </button>
            );
          })}
        </div>

        {!selectedRegion ? (
          <p className="gear-by-region-empty">Select a region above to view its gear.</p>
        ) : (
          <div className="gear-by-region-detail">
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

            {activeItems.length === 0 ? (
              <p className="gear-by-region-empty">
                No {subTab === 'direct' ? 'direct' : 'combination'} items found for {REGIONS[selectedRegion].name}.
              </p>
            ) : (
              groups.map(([slot, items]) => (
                <div key={slot} className="gear-by-region-slot-group">
                  <h3>{SLOT_LABELS[slot] ?? slot}</h3>
                  <div className="gear-item-rows">
                    {items.map((item) => (
                      <GearByRegionRow key={item.name} item={item} isUnlocked={isUnlocked} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
}
