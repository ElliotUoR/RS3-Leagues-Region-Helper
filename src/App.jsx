import { useEffect, useRef, useState } from 'react';
import AbilitiesPage from './pages/AbilitiesPage';
import AssumptionsPage from './pages/AssumptionsPage';
import GearPage from './pages/GearPage';
import GearByRegionPage from './pages/GearByRegionPage';
import HomePage from './pages/HomePage';
import RelicsPage from './pages/RelicsPage';
import LeagueRelicsPage from './pages/LeagueRelicsPage';
import RelicImportDocsPage from './pages/RelicImportDocsPage';
import SpellbooksPage from './pages/SpellbooksPage';
import ReportIssueButton from './components/ReportIssueButton';
import ReportIssueModal from './components/ReportIssueModal';
import ReportIssueUnavailableModal from './components/ReportIssueUnavailableModal';
import PagesMigrationModal from './components/PagesMigrationModal';
import ImportRelicsModal from './components/ImportRelicsModal';
import { GATEWAY_STORAGE_KEY, REGIONS_STORAGE_KEY, useRegionSelection } from './hooks/useRegionSelection';
import { GEAR_STORAGE_KEY, useGearLoadout } from './hooks/useGearLoadout';
import { RELICS_STORAGE_KEY, useRelicSelection } from './hooks/useRelicSelection';
import {
  LEAGUE_RELICS_STORAGE_KEY,
  sanitizeLeagueRelicSelectionLoose,
  useLeagueRelicSelection,
} from './hooks/useLeagueRelicSelection';
import { useIsAdmin } from './hooks/useIsAdmin';
import { useLiveSiteUrl } from './hooks/useLiveSiteUrl';
import { decodeShareBuild, parseShareParam, stripShareParam } from './utils/shareBuild';
import { parseImportRelicsParam, stripImportRelicsParam } from './utils/importRelics';
import { fetchIsAdmin, resolveShortCode, trackPageview, trackUsage } from './utils/api';
import { IS_PAGES_BUILD, PAGES_MIGRATION_DISMISSED_KEY } from './utils/deployTarget';
import { MAX_OPTIONAL } from './data/regions';
import versionInfo from './data/version.json';

// Matches the short-link path Caddy now routes straight to this static app
// instead of through the Node service (see deploy/Caddyfile.snippet) -
// e.g. "/Leagues/s/torva-seismic-vengeance". Never matches on the GitHub
// Pages build, which has no backend to resolve a code against in the first
// place (see deployTarget.js).
const SHORT_LINK_PATH_RE = /\/s\/([a-z0-9-]+)\/?$/i;

// sessionStorage (not localStorage) - deliberately resets for a genuinely
// new visit (new tab/window, or after the browser's fully closed), but
// survives a same-tab reload, matching how "session" is meant here - see
// the region-combo tracking effect in AppContent.
const LAST_TRACKED_COMBO_KEY = 'rs3-leagues-last-tracked-combo';

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
  if (window.location.hash === '#gear-by-region') return 'gearByRegion';
  if (window.location.hash === '#abilities') return 'abilities';
  if (window.location.hash === '#relics') return 'relics';
  if (window.location.hash === '#league-relics') return 'leagueRelics';
  if (window.location.hash === '#relic-import-docs') return 'relicImportDocs';
  if (window.location.hash === '#spellbooks') return 'spellbooks';
  if (window.location.hash === '#assumptions') return 'assumptions';
  return 'home';
}

// Owns the region-selection and gear-loadout hooks. Rendered with a `key`
// tied to whether a shared build is active, so entering/exiting shared view
// fully remounts this subtree - the hooks re-run their seed logic from
// scratch (re-reading real localStorage on exit, or re-seeding from the
// shared payload on entry) instead of carrying over stale in-memory state.
function AppContent({ route, sharedBuild, importedLeagueRelics, onExitShared, onAdopted, onOpenReportIssue }) {
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
  // `importedLeagueRelics` (a ?import-relics= import, see App()'s effect
  // below) is threaded in as an initial value exactly like `sharedBuild`'s
  // fields are, rather than written to localStorage and read back after a
  // remount - reading back through storage raced this same hook's own
  // persist-effect on the *previous* AppContent instance, which could still
  // fire once more (with its stale, pre-import `selected`) before that old
  // instance actually unmounted, clobbering the import. Handing the value
  // straight to the fresh instance's initial state has no such window.
  const { selected: selectedLeagueRelics, toggleLeagueRelic } = useLeagueRelicSelection({
    initialSelection: sharedBuild?.leagueRelics ?? importedLeagueRelics,
    persist: !sharedBuild,
  });

  // Tracks region picks + combos once they're "locked in" - the moment the
  // visitor navigates away from the Regions tab with exactly MAX_OPTIONAL
  // regions selected - rather than on every individual toggle, so idle
  // clicking back and forth while still deciding doesn't inflate the
  // counts. `selected` is read from this render's closure (the value at
  // the instant `route` actually changed), and prevRouteRef survives across
  // ordinary tab navigation since AppContent doesn't remount for that (only
  // sharedBuild/import transitions bump its key - see App()).
  //
  // Also deduped per browser session (sessionStorage, not state - it must
  // survive this exact remount case too): repeatedly bouncing home <-> gear
  // with the *same* 3 regions still selected would otherwise re-fire the
  // same combo every single time. Only skips an exact repeat of the last
  // combo tracked this session - actually changing picks and later
  // switching back still counts as a second real decision, not noise.
  const prevRouteRef = useRef(route);
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    prevRouteRef.current = route;
    if (sharedBuild) return;
    if (prevRoute === 'home' && route !== 'home' && selected.length === MAX_OPTIONAL) {
      const comboKey = [...selected].sort((a, b) => a.localeCompare(b)).join(',');
      if (window.sessionStorage.getItem(LAST_TRACKED_COMBO_KEY) === comboKey) return;
      window.sessionStorage.setItem(LAST_TRACKED_COMBO_KEY, comboKey);
      trackUsage([
        ...selected.map((regionId) => ({ category: 'region_pick', key: regionId })),
        { category: 'region_combo', key: comboKey },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

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
        <a href="#gear-by-region" className={route === 'gearByRegion' ? 'active' : ''}>
          Gear by Region
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
      {route === 'gearByRegion' && <GearByRegionPage isUnlocked={isUnlocked} />}
      {route === 'abilities' && <AbilitiesPage isUnlocked={isUnlocked} />}
      {route === 'relics' && (
        <RelicsPage isUnlocked={isUnlocked} selected={selectedRelics} toggleRelic={toggleRelic} />
      )}
      {route === 'leagueRelics' && (
        <LeagueRelicsPage selected={selectedLeagueRelics} toggleLeagueRelic={toggleLeagueRelic} />
      )}
      {route === 'relicImportDocs' && <RelicImportDocsPage />}
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
  const [importedRelicsCount, setImportedRelicsCount] = useState(null);
  // Set by a ?import-relics= import (see the effect below) and threaded into
  // AppContent as an initial value, same as sharedBuild's fields - see the
  // comment on useLeagueRelicSelection's call in AppContent for why this
  // isn't just written to localStorage directly.
  const [importedLeagueRelics, setImportedLeagueRelics] = useState(null);
  // Bumped alongside importedLeagueRelics to force AppContent to remount -
  // its hooks only ever consult their `initialSelection` prop once, on their
  // own initial mount, so a prop change alone wouldn't otherwise be picked
  // up. Folded into AppContent's `key` alongside the existing shared/own
  // toggle rather than replacing it.
  const [contentGeneration, setContentGeneration] = useState(0);
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

  // Cross-site League Relics import (see utils/importRelics.js) - entirely
  // synchronous and client-side, unlike short-link resolution above: there's
  // no backend round-trip, since the imported names are already the whole
  // payload. Writes straight into this visitor's real, persisted League
  // Relics selection rather than staging a `sharedBuild`-style preview -
  // that's the whole point of this API being different from `?share=` (see
  // the file header comment there). Skipped if a `?share=` link somehow
  // already won, same defensive ordering as short-link resolution above.
  useEffect(() => {
    if (sharedBuild) return;
    const names = parseImportRelicsParam();
    if (!names) return;

    const sanitized = sanitizeLeagueRelicSelectionLoose(names);
    stripImportRelicsParam();
    if (sanitized.length === 0) return;

    setImportedLeagueRelics(sanitized);
    setContentGeneration((prev) => prev + 1);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#league-relics`);
    setRoute('leagueRelics');
    setImportedRelicsCount(sanitized.length);
    trackUsage([{ category: 'feature', key: 'import_relics_used' }]);
  }, []);

  function exitSharedView() {
    stripShareParam();
    setSharedBuild(null);
  }

  return (
    <div className="app">
      {isAdmin && <div className="admin-badge">Logged in as admin</div>}
      <AppContent
        key={`${sharedBuild ? 'shared' : 'own'}-${contentGeneration}`}
        route={route}
        sharedBuild={sharedBuild}
        importedLeagueRelics={importedLeagueRelics}
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
      <ImportRelicsModal count={importedRelicsCount} onClose={() => setImportedRelicsCount(null)} />
    </div>
  );
}

export default App;
