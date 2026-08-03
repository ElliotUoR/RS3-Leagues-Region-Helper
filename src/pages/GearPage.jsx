import GearLoadoutPlanner from '../components/GearLoadoutPlanner';
import { useBuildShare } from '../hooks/useBuildShare';

// A local copy rather than importing one from the planner: a component file
// that also exports constants breaks Fast Refresh for itself, and this codebase
// already keeps per-page copies of this map for the same reason.
const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// The planner's working area now lives in components/GearLoadoutPlanner.jsx,
// shared with My Build - see that file for why. What is left here is this
// page's own header: the title and the Clear/Share pair, which My Build does
// differently (it clears the whole setup, not one style's gear, and it has an
// Import into Build Guide button beside them).
export default function GearPage({
  isUnlocked,
  selected,
  gatewaySelected,
  selectedRelics,
  selectedLeagueRelics,
  selectedBlessings,
  clearLoadout,
  ...gear
}) {
  const share = useBuildShare({
    payload: {
      regions: selected,
      gatewaySelected,
      equippedNamesByStyle: gear.equippedNamesByStyle,
      eofWeaponNamesByStyle: gear.eofWeaponNamesByStyle,
      relics: selectedRelics,
      leagueRelics: selectedLeagueRelics,
      blessings: selectedBlessings,
      defaultStyle: gear.defaultStyle,
    },
    setDefaultStyle: gear.setDefaultStyle,
  });

  const hasEquippedItems = Object.keys(gear.equipped).length > 0;

  function handleClearLoadout() {
    if (!hasEquippedItems) return;
    if (window.confirm(`Clear your entire ${STYLE_LABELS[gear.style]} loadout?`)) {
      clearLoadout();
    }
  }

  return (
    <>
      <header>
        <div className="gear-page-heading">
          <h1>Gear Planner</h1>
          <div className="gear-page-actions">
            <button
              type="button"
              className="clear-loadout-button"
              onClick={handleClearLoadout}
              disabled={!hasEquippedItems}
            >
              Clear loadout
            </button>
            <button type="button" className="share-button" onClick={share.share} disabled={share.disabled}>
              {share.label}
            </button>
          </div>
        </div>
      </header>

      <main className="gear-page">
        <GearLoadoutPlanner isUnlocked={isUnlocked} selectedLeagueRelics={selectedLeagueRelics} {...gear} />
      </main>
    </>
  );
}
