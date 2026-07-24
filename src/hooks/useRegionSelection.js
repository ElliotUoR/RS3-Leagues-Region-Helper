import { useCallback, useEffect, useState } from 'react';
import { FIXED_REGIONS, MAX_OPTIONAL, REGIONS } from '../data/regions';

export const REGIONS_STORAGE_KEY = 'rs3-leagues-regions';

// Validates an arbitrary array (from localStorage or a decoded share link)
// down to known, non-fixed region ids — drops anything stale/invalid/fixed.
export function sanitizeRegionSelection(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => REGIONS[id] && !REGIONS[id].fixed);
}

function loadInitialSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REGIONS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeRegionSelection(JSON.parse(raw));
  } catch {
    return [];
  }
}

// `initialSelection`, when provided (e.g. a decoded share link), seeds state
// instead of localStorage. `persist: false` keeps the hook fully interactive
// (toggleRegion/isUnlocked behave identically either way) but skips writing
// to localStorage — used for previewing someone else's shared build without
// touching the viewer's own saved selection.
export function useRegionSelection({ initialSelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  const toggleRegion = useCallback((id) => {
    if (FIXED_REGIONS.includes(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }, []);

  const isUnlocked = useCallback(
    (id) => FIXED_REGIONS.includes(id) || selected.includes(id),
    [selected],
  );

  const clearRegions = useCallback(() => setSelected([]), []);

  const overLimit = selected.length > MAX_OPTIONAL;

  return { selected, toggleRegion, isUnlocked, overLimit, clearRegions };
}
