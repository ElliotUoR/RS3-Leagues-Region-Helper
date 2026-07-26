import { useEffect, useState } from 'react';
import BossRow from './BossRow';
import { ACTIVITIES, BOSSES, FIXED_REGIONS, MONSTERS, REGIONS, REGION_IDS } from '../data/regions';

// Purely a local display preference (which regions' unlock lists are
// collapsed) - persisted so it survives reloads, but deliberately kept out
// of shareBuild.js's payload since it's not part of the build being shared.
const MINIMISED_STORAGE_KEY = 'rs3-leagues-unlocks-minimised';

function loadInitialMinimised() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(MINIMISED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export default function UnlocksList({ isUnlocked }) {
  const unlockedIds = REGION_IDS.filter((id) => isUnlocked(id));
  const [minimised, setMinimised] = useState(loadInitialMinimised);

  useEffect(() => {
    window.localStorage.setItem(MINIMISED_STORAGE_KEY, JSON.stringify([...minimised]));
  }, [minimised]);

  const toggleMinimised = (id) => {
    setMinimised((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="unlocks-list">
      <h2>Your unlocks</h2>
      <div className="unlocks-list-body">
      {unlockedIds.map((id) => {
        const region = REGIONS[id];
        const bosses = BOSSES.filter((b) => b.region === id && !b.quest);
        const activities = ACTIVITIES.filter((a) => a.region === id);
        const monsters = MONSTERS.filter((m) => m.region === id);
        const isMinimised = minimised.has(id);
        return (
          <div key={id} className="unlock-region">
            <h3>
              <button
                type="button"
                className="unlock-region-toggle"
                onClick={() => toggleMinimised(id)}
                aria-expanded={!isMinimised}
                aria-label={`${isMinimised ? 'Expand' : 'Minimise'} ${region.name} unlocks`}
              >
                {isMinimised ? '+' : '−'}
              </button>
              {region.name}
              {FIXED_REGIONS.includes(id) && <span className="badge">always unlocked</span>}
            </h3>
            {!isMinimised && (
              <>
                {region.includes && (
                  <p className="region-includes">Includes: {region.includes.join(', ')}</p>
                )}
                {bosses.length > 0 ? (
                  <ul className="boss-list">
                    {bosses.map((b) => (
                      <BossRow key={b.name} boss={b} />
                    ))}
                  </ul>
                ) : (
                  activities.length === 0 &&
                  monsters.length === 0 && <p className="region-empty">No boss data added for this region yet.</p>
                )}
                {activities.length > 0 && (
                  <>
                    <h4 className="unlock-region-subheading">Other unlocks</h4>
                    <ul className="boss-list">
                      {activities.map((a) => (
                        <BossRow key={a.name} boss={a} />
                      ))}
                    </ul>
                  </>
                )}
                {monsters.length > 0 && (
                  <>
                    <h4 className="unlock-region-subheading">Monster drops</h4>
                    <ul className="boss-list">
                      {monsters.map((m) => (
                        <BossRow key={m.name} boss={m} />
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
