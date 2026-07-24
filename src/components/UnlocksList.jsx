import BossRow from './BossRow';
import { BOSSES, FIXED_REGIONS, REGIONS, REGION_IDS } from '../data/regions';

export default function UnlocksList({ isUnlocked }) {
  const unlockedIds = REGION_IDS.filter((id) => isUnlocked(id));

  return (
    <div className="unlocks-list">
      <h2>Your unlocks</h2>
      {unlockedIds.map((id) => {
        const region = REGIONS[id];
        const bosses = BOSSES.filter((b) => b.region === id && !b.quest);
        return (
          <div key={id} className="unlock-region">
            <h3>
              {region.name}
              {FIXED_REGIONS.includes(id) && <span className="badge">always unlocked</span>}
            </h3>
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
              <p className="region-empty">No boss data added for this region yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
