import { useEffect, useState } from 'react';
import { LIVE_SITE_URL } from '../utils/deployTarget';
import { encodeShareBuild } from '../utils/shareBuild';
import { REGIONS_STORAGE_KEY, sanitizeRegionSelection } from './useRegionSelection';
import { GEAR_STORAGE_KEY } from './useGearLoadout';
import { sanitizeEofWeaponNames, sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';
import { RELICS_STORAGE_KEY, sanitizeRelicSelection } from './useRelicSelection';

// Reads the visitor's saved loadout straight from localStorage - this only
// ever runs on the GitHub Pages build (see callers), outside the normal
// useRegionSelection/useGearLoadout/useRelicSelection hook tree, so it goes
// straight to the same storage keys and sanitizers those hooks use.
// Returns null if there's nothing worth carrying over (a blank/default
// planner isn't worth turning into a short link).
function readSavedBuild() {
  try {
    const regions = sanitizeRegionSelection(JSON.parse(window.localStorage.getItem(REGIONS_STORAGE_KEY) ?? '[]'));
    const relics = sanitizeRelicSelection(JSON.parse(window.localStorage.getItem(RELICS_STORAGE_KEY) ?? '[]'));
    const gearRaw = JSON.parse(window.localStorage.getItem(GEAR_STORAGE_KEY) ?? '{}');
    const equippedNamesByStyle = sanitizeEquippedNames(gearRaw.equippedNames);
    const eofWeaponNamesByStyle = sanitizeEofWeaponNames(gearRaw.eofWeaponNames);
    const defaultStyle = sanitizeStyle(gearRaw.defaultStyle ?? gearRaw.style);

    const hasGear = Object.values(equippedNamesByStyle).some((bySlot) => Object.keys(bySlot ?? {}).length > 0);
    if (regions.length === 0 && relics.length === 0 && !hasGear) return null;

    return { regions, equippedNamesByStyle, eofWeaponNamesByStyle, relics, defaultStyle };
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
export function useLiveSiteUrl() {
  const [url, setUrl] = useState(LIVE_SITE_URL);

  useEffect(() => {
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
