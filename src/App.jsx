import { useEffect, useState } from 'react';
import AbilitiesPage from './pages/AbilitiesPage';
import AssumptionsPage from './pages/AssumptionsPage';
import GearPage from './pages/GearPage';
import HomePage from './pages/HomePage';
import RelicsPage from './pages/RelicsPage';
import LeagueRelicsPage from './pages/LeagueRelicsPage';
import SpellbooksPage from './pages/SpellbooksPage';
import ReportIssueButton from './components/ReportIssueButton';
import ReportIssueModal from './components/ReportIssueModal';
import ReportIssueUnavailableModal from './components/ReportIssueUnavailableModal';
import PagesMigrationModal from './components/PagesMigrationModal';
import { GATEWAY_STORAGE_KEY, REGIONS_STORAGE_KEY, useRegionSelection } from './hooks/useRegionSelection';
import { GEAR_STORAGE_KEY, useGearLoadout } from './hooks/useGearLoadout';
import { RELICS_STORAGE_KEY, useRelicSelection } from './hooks/useRelicSelection';
import { LEAGUE_RELICS_STORAGE_KEY, useLeagueRelicSelection } from './hooks/useLeagueRelicSelection';
import { useIsAdmin } from './hooks/useIsAdmin';
import { useLiveSiteUrl } from './hooks/useLiveSiteUrl';
import { decodeShareBuild, parseShareParam, stripShareParam } from './utils/shareBuild';
import { fetchIsAdmin, resolveShortCode, trackPageview } from './utils/api';
import { IS_PAGES_BUILD, PAGES_MIGRATION_DISMISSED_KEY } from './utils/deployTarget';
import versionInfo from './data/version.json';

// Matches the short-link path Caddy now routes straight to this static app
// instead of through the Node service (see deploy/Caddyfile.snippet) -
// e.g. "/Leagues/s/torva-seismic-vengeance". Never matches on the GitHub
// Pages build, which has no backend to resolve a code against in the first
// place (see deployTarget.js).
const SHORT_LINK_PATH_RE = /\/s\/([a-z0-9-]+)\/?$/i;

function matchShortLinkCode() {
  if (IS_PAGES_BUILD) return null;
  const match = SHORT_LINK_PATH_RE.exec(window.location.pathname);
  return match ? match[1] : null;
}

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
  if (window.location.hash === '#league-relics') return 'leagueRelics';
  if (window.location.hash === '#spellbooks') return 'spellbooks';
  if (window.location.hash === '#assumptions') return 'assumptions';
  return 'home';
}

// Owns the region-selection and gear-loadout hooks. Rendered with a `key`
// tied to whether a shared build is active, so entering/exiting shared view
// fully remounts this subtree - the hooks re-run their seed logic from
// scratch (re-reading real localStorage on exit, or re-seeding from the
// shared payload on entry) instead of carrying over stale in-memory state.
function AppContent({ route, sharedBuild, onExitShared, onAdopted, onOpenReportIssue }) {
  const { selected, gatewaySelected, toggleRegion, isUnlocked, overLimit, clearRegions } = useRegionSelection({
    initialSelection: sharedBuild?.regions,
    initialGatewaySelection: sharedBuild?.gatewaySelected,
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
  const { selected: selectedLeagueRelics, toggleLeagueRelic } = useLeagueRelicSelection({
    initialSelection: sharedBuild?.leagueRelics,
    persist: !sharedBuild,
  });

  function handleAdopt() {
    window.localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(selected));
    window.localStorage.setItem(GATEWAY_STORAGE_KEY, JSON.stringify(gatewaySelected));
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
    window.localStorage.setItem(LEAGUE_RELICS_STORAGE_KEY, JSON.stringify(selectedLeagueRelics));
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
        <a
          href="#league-relics"
          className={`league-relics-tab${route === 'leagueRelics' ? ' active' : ''}`}
        >
          League Relics
        </a>
        <a href="#abilities" className={route === 'abilities' ? 'active' : ''}>
          Abilities
        </a>
        <a href="#relics" className={route === 'relics' ? 'active' : ''}>
          Arch Relics
        </a>
        <a href="#spellbooks" className={route === 'spellbooks' ? 'active' : ''}>
          Spellbooks & Prayers
        </a>
        <a href="#assumptions" className={route === 'assumptions' ? 'active' : ''}>
          Assumptions
        </a>
        <button type="button" className="site-nav-report" onClick={onOpenReportIssue}>
          Report Issue
        </button>
      </nav>

      {route === 'gear' && (
        <GearPage
          isUnlocked={isUnlocked}
          selected={selected}
          gatewaySelected={gatewaySelected}
          selectedRelics={selectedRelics}
          selectedLeagueRelics={selectedLeagueRelics}
          {...gear}
        />
      )}
      {route === 'abilities' && <AbilitiesPage isUnlocked={isUnlocked} />}
      {route === 'relics' && (
        <RelicsPage isUnlocked={isUnlocked} selected={selectedRelics} toggleRelic={toggleRelic} />
      )}
      {route === 'leagueRelics' && (
        <LeagueRelicsPage selected={selectedLeagueRelics} toggleLeagueRelic={toggleLeagueRelic} />
      )}
      {route === 'spellbooks' && (
        <SpellbooksPage
          isUnlocked={isUnlocked}
          hasCrystalGrace={selectedLeagueRelics.includes('Crystal Grace')}
        />
      )}
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
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(
    () => IS_PAGES_BUILD && !window.localStorage.getItem(PAGES_MIGRATION_DISMISSED_KEY),
  );
  const isAdmin = useIsAdmin();
  // Called once here rather than inside each modal that displays it - see
  // useLiveSiteUrl.js for why that used to create duplicate short links.
  const liveUrl = useLiveSiteUrl();

  function dismissMigration(remember) {
    if (remember) window.localStorage.setItem(PAGES_MIGRATION_DISMISSED_KEY, '1');
    setMigrationOpen(false);
  }

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

  // Resolves a /s/CODE short link client-side, entirely in the background -
  // the address bar keeps showing the short link the whole time instead of
  // ever expanding into a long `?share=` URL (see matchShortLinkCode/
  // resolveShortCode). Skipped outright if a `?share=` link somehow already
  // won (can't happen from a real link, just a defensive ordering).
  useEffect(() => {
    if (sharedBuild) return undefined;
    const code = matchShortLinkCode();
    if (!code) return undefined;

    let cancelled = false;
    (async () => {
      // Checked here (rather than reusing the isAdmin badge state above)
      // so this effect doesn't have to wait on that separate one settling -
      // browsing your own share links from the admin panel shouldn't bump
      // their click_count (see utils/api.js's resolveShortCode).
      const untracked = await fetchIsAdmin();
      if (cancelled) return;
      const payload = await resolveShortCode(code, { untracked });
      const decoded = payload ? decodeShareBuild(payload) : null;
      if (cancelled || !decoded) return;
      setSharedBuild(decoded);
      // history.replaceState never fires 'hashchange' (unlike a real
      // navigation or a direct `location.hash =` assignment), so `route`
      // has to be updated explicitly here too - otherwise the visible tab
      // would silently stay stuck on 'home' despite the hash now saying
      // #gear.
      window.history.replaceState(null, '', `${window.location.pathname}#gear`);
      setRoute('gear');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function exitSharedView() {
    stripShareParam();
    setSharedBuild(null);
  }

  return (
    <div className="app">
      {isAdmin && <div className="admin-badge">Logged in as admin</div>}
      <AppContent
        key={sharedBuild ? 'shared' : 'own'}
        route={route}
        sharedBuild={sharedBuild}
        onExitShared={exitSharedView}
        onAdopted={() => setSharedBuild(null)}
        onOpenReportIssue={() => setReportIssueOpen(true)}
      />
      <footer className="site-footer">
        <span>Fan made site - not affiliated with Jagex</span>
        <span className="site-version">
          {`· v${versionInfo.version}`}
          {formatUpdatedAt(versionInfo.updatedAt) && ` · Updated ${formatUpdatedAt(versionInfo.updatedAt)}`}
        </span>
        <ReportIssueButton open={reportIssueOpen} onToggle={() => setReportIssueOpen((prev) => !prev)} />
      </footer>
      {IS_PAGES_BUILD ? (
        <ReportIssueUnavailableModal open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} liveUrl={liveUrl} />
      ) : (
        <ReportIssueModal open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} />
      )}
      {IS_PAGES_BUILD && <PagesMigrationModal open={migrationOpen} onDismiss={dismissMigration} liveUrl={liveUrl} />}
    </div>
  );
}

export default App;
