import { useEffect, useState } from 'react';
import { IS_PAGES_BUILD, LIVE_SITE_URL } from '../utils/deployTarget';
import { encodeShareBuild } from '../utils/shareBuild';
import { GATEWAY_STORAGE_KEY, REGIONS_STORAGE_KEY, sanitizeGatewaySelection, sanitizeRegionSelection } from './useRegionSelection';
import { GEAR_STORAGE_KEY } from './useGearLoadout';
import { sanitizeEofWeaponNames, sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';
import { RELICS_STORAGE_KEY, sanitizeRelicSelection } from './useRelicSelection';
import { GATEWAY_REGIONS } from '../data/regions';

// Reads the visitor's saved loadout straight from localStorage - this only
// ever runs on the GitHub Pages build (see callers), outside the normal
// useRegionSelection/useGearLoadout/useRelicSelection hook tree, so it goes
// straight to the same storage keys and sanitizers those hooks use.
// Returns null if there's nothing worth carrying over (a blank/default
// planner isn't worth turning into a short link).
function readSavedBuild() {
  try {
    const regions = sanitizeRegionSelection(JSON.parse(window.localStorage.getItem(REGIONS_STORAGE_KEY) ?? '[]'));
    const gatewaySelected = sanitizeGatewaySelection(
      JSON.parse(window.localStorage.getItem(GATEWAY_STORAGE_KEY) ?? 'null'),
    );
    const relics = sanitizeRelicSelection(JSON.parse(window.localStorage.getItem(RELICS_STORAGE_KEY) ?? '[]'));
    const gearRaw = JSON.parse(window.localStorage.getItem(GEAR_STORAGE_KEY) ?? '{}');
    const equippedNamesByStyle = sanitizeEquippedNames(gearRaw.equippedNames);
    const eofWeaponNamesByStyle = sanitizeEofWeaponNames(gearRaw.eofWeaponNames);
    const defaultStyle = sanitizeStyle(gearRaw.defaultStyle ?? gearRaw.style);

    const hasGear = Object.values(equippedNamesByStyle).some((bySlot) => Object.keys(bySlot ?? {}).length > 0);
    const hasNonDefaultGateway = gatewaySelected.length !== GATEWAY_REGIONS.length;
    if (regions.length === 0 && relics.length === 0 && !hasGear && !hasNonDefaultGateway) return null;

    return { regions, gatewaySelected, equippedNamesByStyle, eofWeaponNamesByStyle, relics, defaultStyle };
  } catch {
    return null;
  }
}

// Only meaningful on the GitHub Pages build - turns the visitor's
// locally-saved loadout into a live-site short link, so following a "visit
// the live site" link (PagesMigrationModal / ReportIssueUnavailableModal)
// carries their build with them instead of dropping them on a blank
// planner. Starts at the plain LIVE_SITE_URL and upgrades once the
// cross-origin /api/shorten call resolves - falls back to the plain URL on
// any failure (nothing saved, offline, CORS/backend down), never blocks or
// breaks the link either way.
//
// Called exactly once, from App.jsx, and threaded down as a prop to both
// modals that display it - each used to call this hook independently, which
// meant both mounted their own effect and both fired their own /api/shorten
// POST for the identical saved build on every single page load. That raced
// the backend's payload-hash dedup check (see
// deploy/migrations/004_short_link_dedup.sql, which deliberately accepts
// this race as rare/harmless) and reliably produced two different short
// codes for the same build instead of the intended one. The IS_PAGES_BUILD
// guard below means this is also now safe to call unconditionally (the
// rule of hooks requires that anyway) even outside the Pages build, where
// it's simply a no-op.
export function useLiveSiteUrl() {
  const [url, setUrl] = useState(LIVE_SITE_URL);

  useEffect(() => {
    if (!IS_PAGES_BUILD) return undefined;

    const build = readSavedBuild();
    if (!build) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const payload = encodeShareBuild(build);
        const res = await fetch(`${LIVE_SITE_URL}api/shorten`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        if (!res.ok) return;
        const { code } = await res.json();
        if (!cancelled && code) setUrl(`${LIVE_SITE_URL}s/${code}`);
      } catch {
        // offline/CORS/backend down - keep the plain URL
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}
