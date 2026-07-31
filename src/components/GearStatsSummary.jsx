import { useEffect, useState } from 'react';
import TagTooltip from './TagTooltip';
import { getTotalArmour } from '../utils/gearStats';

// `damage`/`accuracy` are flat rating numbers on every item type, not
// percentages. Weapon/offhand/ammo ratings are on a much larger numeric
// scale than armour/accessory ratings, so they're still tracked separately
// to keep the totals readable - but neither is a "%".
const WEAPON_SLOTS = new Set(['weapon', 'offhand', 'ammo']);

// Purely a local display preference (mirrors RegionPicker's per-region
// minimise state) - persisted so it survives reloads.
const MINIMISED_STORAGE_KEY = 'rs3-leagues-gear-stats-minimised';

// Defence level feeds the Total Armour formula (see getSkillArmour) - it's
// a single account-wide setting, not per-style, so it's stored separately
// from the per-style equipped loadout and shared across all 4 style tabs.
const DEFENCE_LEVEL_STORAGE_KEY = 'rs3-leagues-gear-stats-defence-level';
const MAX_SKILL_LEVEL = 99;

// Overload/Elder Overload potions grant a flat virtual Defence level boost -
// applied only to the Total Armour formula (see getSkillArmour), not to the
// stored/displayed Defence level itself, since it's a temporary buff rather
// than the player's real level. The two are mutually exclusive (Elder
// Overload replaces Overload entirely rather than stacking with it), so
// this is a single three-way mode rather than two independent toggles.
// Persisted like the other display prefs on this panel.
const OVERLOAD_MODE_STORAGE_KEY = 'rs3-leagues-gear-stats-overload-mode';
// Pre-Elder-Overload storage key, a plain boolean - read as a fallback below
// so an already-active plain Overload carries forward as 'overload' instead
// of silently resetting to 'none' for anyone with it already set.
const LEGACY_OVERLOAD_BOOLEAN_KEY = 'rs3-leagues-gear-stats-overload';
const OVERLOAD_DEFENCE_BONUS_BY_MODE = { none: 0, overload: 17, elder: 25 };

function loadInitialOverloadMode() {
  if (typeof window === 'undefined') return 'none';
  try {
    const stored = window.localStorage.getItem(OVERLOAD_MODE_STORAGE_KEY);
    if (stored === 'overload' || stored === 'elder') return stored;
    if (window.localStorage.getItem(LEGACY_OVERLOAD_BOOLEAN_KEY) === 'true') return 'overload';
    return 'none';
  } catch {
    return 'none';
  }
}

function loadInitialDefenceLevel() {
  if (typeof window === 'undefined') return MAX_SKILL_LEVEL;
  try {
    const stored = window.localStorage.getItem(DEFENCE_LEVEL_STORAGE_KEY);
    const parsed = stored !== null ? Number(stored) : Number.NaN;
    if (!Number.isFinite(parsed)) return MAX_SKILL_LEVEL;
    return Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.round(parsed)));
  } catch {
    return MAX_SKILL_LEVEL;
  }
}

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

export default function GearStatsSummary({ equipped, style }) {
  const [minimised, setMinimised] = useState(loadInitialMinimised);
  const [defenceLevel, setDefenceLevel] = useState(loadInitialDefenceLevel);
  const [overloadMode, setOverloadMode] = useState(loadInitialOverloadMode);

  useEffect(() => {
    window.localStorage.setItem(MINIMISED_STORAGE_KEY, String(minimised));
  }, [minimised]);

  useEffect(() => {
    window.localStorage.setItem(DEFENCE_LEVEL_STORAGE_KEY, String(defenceLevel));
  }, [defenceLevel]);

  useEffect(() => {
    window.localStorage.setItem(OVERLOAD_MODE_STORAGE_KEY, overloadMode);
  }, [overloadMode]);

  function toggleMinimised() {
    setMinimised((prev) => !prev);
  }

  // Clicking the already-active one turns it off; clicking the other one
  // switches straight to it (never both at once).
  function selectOverloadMode(mode) {
    setOverloadMode((prev) => (prev === mode ? 'none' : mode));
  }

  function handleDefenceLevelChange(e) {
    const parsed = Number(e.target.value);
    if (!Number.isFinite(parsed)) return;
    setDefenceLevel(Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.round(parsed))));
  }

  const totals = sumStats(equipped);
  const itemCount = Object.keys(equipped).length;
  const effectiveDefenceLevel = defenceLevel + OVERLOAD_DEFENCE_BONUS_BY_MODE[overloadMode];
  const totalArmour = getTotalArmour(equipped, style, effectiveDefenceLevel);

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

          <div className="gear-stats-row gear-stats-defence-level-row">
            <span className="gear-stats-defence-level-label">
              <label htmlFor="gear-stats-defence-level">Defence level</label>
              <TagTooltip className="info-icon" tooltip="Defence levels add armour">
                ?
              </TagTooltip>
            </span>
            <input
              id="gear-stats-defence-level"
              type="number"
              min={1}
              max={MAX_SKILL_LEVEL}
              value={defenceLevel}
              onChange={handleDefenceLevelChange}
            />
          </div>
          <div className="gear-stats-row">
            <span className="gear-stats-armour-label">
              <span>Total Armour</span>
              <button
                type="button"
                className={`gear-stats-ovl-toggle${overloadMode === 'overload' ? ' active' : ''}`}
                onClick={() => selectOverloadMode('overload')}
                aria-pressed={overloadMode === 'overload'}
                title="Overload potions add 17 Defence levels"
              >
                Ovl
              </button>
              <button
                type="button"
                className={`gear-stats-ovl-toggle${overloadMode === 'elder' ? ' active' : ''}`}
                onClick={() => selectOverloadMode('elder')}
                aria-pressed={overloadMode === 'elder'}
                title="Elder Overload potions add 25 Defence levels"
              >
                E-Ovl
              </button>
            </span>
            <strong>{totalArmour}</strong>
          </div>

          <div className="gear-stats-row">
            <span>Armour damage</span>
            <strong>{totals.armourDamage.toFixed(1)}</strong>
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
        </>
      )}
    </div>
  );
}
