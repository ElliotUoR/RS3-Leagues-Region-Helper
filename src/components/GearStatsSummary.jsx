import { useEffect, useState } from 'react';

const ATTACK_STYLES = ['stab', 'slash', 'crush', 'magic', 'ranged'];

// Abbreviated so the table fits the panel's narrow fixed width (matches the
// equip-grid's width, per the gear-planning-revamp brief) without wrapping
// or clipping the last column.
const ATTACK_STYLE_LABELS = { stab: 'Stb', slash: 'Sla', crush: 'Cru', magic: 'Mag', ranged: 'Rng' };

// `damage`/`accuracy` are flat rating numbers on every item type, not
// percentages. Weapon/offhand/ammo ratings are on a much larger numeric
// scale than armour/accessory ratings, so they're still tracked separately
// to keep the totals readable - but neither is a "%".
const WEAPON_SLOTS = new Set(['weapon', 'offhand', 'ammo']);

// Purely a local display preference (mirrors RegionPicker's per-region
// minimise state) - persisted so it survives reloads.
const MINIMISED_STORAGE_KEY = 'rs3-leagues-gear-stats-minimised';

// Same "mobile" cutoff already used site-wide (see .app's padding/.site-nav
// breakpoint in index.css) - only used as the *fallback* default below, so
// an explicit stored preference (once the player's toggled it themselves)
// always wins regardless of viewport.
const MOBILE_BREAKPOINT_QUERY = '(max-width: 700px)';

function loadInitialMinimised() {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(MINIMISED_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
  } catch {
    return false;
  }
}

function sumStats(equipped) {
  const totals = {
    attack: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
    defence: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
    armourDamage: 0,
    armourAccuracy: 0,
    weaponDamageRating: 0,
    weaponAccuracyRating: 0,
    lifeBonus: 0,
    prayerBonus: 0,
  };
  for (const [slot, item] of Object.entries(equipped)) {
    const s = item?.stats;
    if (!s) continue;
    for (const key of ATTACK_STYLES) {
      totals.attack[key] += s.attack?.[key] || 0;
      totals.defence[key] += s.defence?.[key] || 0;
    }
    if (WEAPON_SLOTS.has(slot)) {
      totals.weaponDamageRating += s.damage || 0;
      totals.weaponAccuracyRating += s.accuracy || 0;
    } else {
      totals.armourDamage += s.damage || 0;
      totals.armourAccuracy += s.accuracy || 0;
    }
    totals.lifeBonus += s.lifeBonus || 0;
    totals.prayerBonus += s.prayerBonus || 0;
  }
  return totals;
}

export default function GearStatsSummary({ equipped }) {
  const [minimised, setMinimised] = useState(loadInitialMinimised);

  useEffect(() => {
    window.localStorage.setItem(MINIMISED_STORAGE_KEY, String(minimised));
  }, [minimised]);

  function toggleMinimised() {
    setMinimised((prev) => !prev);
  }

  const totals = sumStats(equipped);
  const itemCount = Object.keys(equipped).length;

  return (
    <div className="gear-stats-summary">
      <h3>
        <button
          type="button"
          className="unlock-region-toggle"
          onClick={toggleMinimised}
          aria-expanded={!minimised}
          aria-label={`${minimised ? 'Expand' : 'Minimise'} Loadout`}
        >
          {minimised ? '+' : '−'}
        </button>
        <button type="button" className="gear-stats-title-text" onClick={toggleMinimised}>
          Loadout
        </button>
      </h3>
      {!minimised && (
        <>
          <p className="gear-stats-count">{itemCount} item{itemCount === 1 ? '' : 's'} equipped</p>

          <div className="gear-stats-row">
            <span>Armour damage</span>
            <strong>{totals.armourDamage.toFixed(1)}</strong>
          </div>
          <div className="gear-stats-row">
            <span>Armour accuracy</span>
            <strong>{totals.armourAccuracy.toFixed(1)}</strong>
          </div>
          <div className="gear-stats-row">
            <span>Weapon damage rating</span>
            <strong>{totals.weaponDamageRating.toFixed(1)}</strong>
          </div>
          <div className="gear-stats-row">
            <span>Weapon accuracy rating</span>
            <strong>{totals.weaponAccuracyRating.toFixed(1)}</strong>
          </div>
          <div className="gear-stats-row">
            <span>Life points</span>
            <strong>+{totals.lifeBonus}</strong>
          </div>
          <div className="gear-stats-row">
            <span>Prayer bonus</span>
            <strong>+{totals.prayerBonus}</strong>
          </div>

          <div className="gear-stats-table-scroll">
            <table className="gear-stats-table">
              <thead>
                <tr>
                  <th></th>
                  {ATTACK_STYLES.map((k) => (
                    <th key={k} title={k}>{ATTACK_STYLE_LABELS[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Attack</td>
                  {ATTACK_STYLES.map((k) => (
                    <td key={k}>{totals.attack[k].toFixed(1)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Defence</td>
                  {ATTACK_STYLES.map((k) => (
                    <td key={k}>{totals.defence[k].toFixed(1)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
