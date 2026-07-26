import { useEffect, useState } from 'react';
import AbilitiesPage from './pages/AbilitiesPage';
import AssumptionsPage from './pages/AssumptionsPage';
import GearPage from './pages/GearPage';
import HomePage from './pages/HomePage';
import RelicsPage from './pages/RelicsPage';
import SpellbooksPage from './pages/SpellbooksPage';
import ReportIssueButton from './components/ReportIssueButton';
import { REGIONS_STORAGE_KEY, useRegionSelection } from './hooks/useRegionSelection';
import { GEAR_STORAGE_KEY, useGearLoadout } from './hooks/useGearLoadout';
import { RELICS_STORAGE_KEY, useRelicSelection } from './hooks/useRelicSelection';
import { parseShareParam, stripShareParam } from './utils/shareBuild';
import { trackPageview } from './utils/api';
import versionInfo from './data/version.json';

// Always renders in GMT/UTC (not the visitor's local timezone) so the
// timestamp reads the same for everyone, with the zone spelled out rather
// than left implicit.
function formatUpdatedAt(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatted} GMT`;
}

function currentRoute() {
  if (window.location.hash === '#gear') return 'gear';
  if (window.location.hash === '#abilities') return 'abilities';
  if (window.location.hash === '#relics') return 'relics';
  if (window.location.hash === '#spellbooks') return 'spellbooks';
  if (window.location.hash === '#assumptions') return 'assumptions';
  return 'home';
}

// Owns the region-selection and gear-loadout hooks. Rendered with a `key`
// tied to whether a shared build is active, so entering/exiting shared view
// fully remounts this subtree - the hooks re-run their seed logic from
// scratch (re-reading real localStorage on exit, or re-seeding from the
// shared payload on entry) instead of carrying over stale in-memory state.
function AppContent({ route, sharedBuild, onExitShared, onAdopted }) {
  const { selected, toggleRegion, isUnlocked, overLimit, clearRegions } = useRegionSelection({
    initialSelection: sharedBuild?.regions,
    persist: !sharedBuild,
  });
  const gear = useGearLoadout({
    initialEquippedNames: sharedBuild?.equippedNamesByStyle,
    initialEofWeaponNames: sharedBuild?.eofWeaponNamesByStyle,
    initialDefaultStyle: sharedBuild?.defaultStyle,
    persist: !sharedBuild,
  });
  const { selected: selectedRelics, toggleRelic } = useRelicSelection({
    initialSelection: sharedBuild?.relics,
    persist: !sharedBuild,
  });

  function handleAdopt() {
    window.localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(selected));
    window.localStorage.setItem(
      GEAR_STORAGE_KEY,
      JSON.stringify({
        equippedNames: gear.equippedNamesByStyle,
        eofWeaponNames: gear.eofWeaponNamesByStyle,
        defaultStyle: gear.defaultStyle,
        activeSlot: gear.activeSlot,
      }),
    );
    window.localStorage.setItem(RELICS_STORAGE_KEY, JSON.stringify(selectedRelics));
    stripShareParam();
    onAdopted();
  }

  return (
    <>
      {sharedBuild && (
        <div className="shared-banner">
          <span>
            You're viewing a shared build - your own saved regions and gear are unaffected. Feel
            free to explore; nothing here saves automatically.
          </span>
          <div className="shared-banner-actions">
            <button type="button" onClick={handleAdopt}>
              Load into my planner
            </button>
            <button type="button" onClick={onExitShared}>
              Exit shared view
            </button>
          </div>
        </div>
      )}

      <nav className="site-nav">
        <a href="#home" className={route === 'home' ? 'active' : ''}>
          Regions
        </a>
        <a href="#gear" className={route === 'gear' ? 'active' : ''}>
          Gear Planner
        </a>
        <a href="#abilities" className={route === 'abilities' ? 'active' : ''}>
          Abilities
        </a>
        <a href="#relics" className={route === 'relics' ? 'active' : ''}>
          Relics
        </a>
        <a href="#spellbooks" className={route === 'spellbooks' ? 'active' : ''}>
          Spellbooks & Prayers
        </a>
        <a href="#assumptions" className={route === 'assumptions' ? 'active' : ''}>
          Assumptions
        </a>
      </nav>

      {route === 'gear' && (
        <GearPage isUnlocked={isUnlocked} selected={selected} selectedRelics={selectedRelics} {...gear} />
      )}
      {route === 'abilities' && <AbilitiesPage isUnlocked={isUnlocked} />}
      {route === 'relics' && (
        <RelicsPage isUnlocked={isUnlocked} selected={selectedRelics} toggleRelic={toggleRelic} />
      )}
      {route === 'spellbooks' && <SpellbooksPage isUnlocked={isUnlocked} />}
      {route === 'assumptions' && <AssumptionsPage />}
      {route === 'home' && (
        <HomePage
          selected={selected}
          toggleRegion={toggleRegion}
          isUnlocked={isUnlocked}
          overLimit={overLimit}
          clearRegions={clearRegions}
        />
      )}
    </>
  );
}

function App() {
  const [route, setRoute] = useState(currentRoute);
  const [sharedBuild, setSharedBuild] = useState(parseShareParam);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Fires on every route change (including the initial mount) - a no-op
  // wherever the backend isn't deployed yet (e.g. GitHub Pages), see
  // utils/api.js.
  useEffect(() => {
    trackPageview(window.location.hash || '#home');
  }, [route]);

  function exitSharedView() {
    stripShareParam();
    setSharedBuild(null);
  }

  return (
    <div className="app">
      <AppContent
        key={sharedBuild ? 'shared' : 'own'}
        route={route}
        sharedBuild={sharedBuild}
        onExitShared={exitSharedView}
        onAdopted={() => setSharedBuild(null)}
      />
      <footer className="site-footer">
        <span>Fan made site - not affiliated with Jagex</span>
        <span className="site-version">
          {`· v${versionInfo.version}`}
          {formatUpdatedAt(versionInfo.updatedAt) && ` · Updated ${formatUpdatedAt(versionInfo.updatedAt)}`}
        </span>
        <ReportIssueButton />
      </footer>
    </div>
  );
}

export default App;
