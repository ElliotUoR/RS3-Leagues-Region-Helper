import { useCallback, useEffect, useState } from 'react';
import { BUILD_EXTRA_BY_NAME } from '../data/buildExtras';

export const BUILD_EXTRAS_STORAGE_KEY = 'rs3-leagues-build-extras';

// The Extras a player has taken - region-gated account unlocks that change a
// build's numbers without being gear, relics or blessings (see
// data/buildExtras.js). Currently just the Totem of Vitality.
//
// The raw picks are stored WITHOUT reference to regions, and pruned against
// them only at the point of use (see `activeBuildExtras` below). Storing the
// pruned list instead would mean unticking Anachronia silently destroyed the
// pick, so re-ticking the region came back with the totem off - which reads as
// the site forgetting rather than as the region gating it. Persisting the
// intent and gating the effect is the behaviour the build editor already has.
//
// `initialSelection`/`persist` follow the same convention as the other four
// selection hooks - see useRelicSelection.js for why.

function loadInitialSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BUILD_EXTRAS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeExtraNames(JSON.parse(raw));
  } catch {
    return [];
  }
}

// Known names only, deduplicated. Deliberately NOT region-filtered: that is
// `activeBuildExtras`'s job, and doing it here would defeat the point above.
export function sanitizeExtraNames(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.filter((name) => {
    if (typeof name !== 'string' || seen.has(name) || !BUILD_EXTRA_BY_NAME.has(name)) return false;
    seen.add(name);
    return true;
  });
}

export function useBuildExtrasSelection({ initialSelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(BUILD_EXTRAS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  const toggleExtra = useCallback((name) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }, []);

  const clearExtras = useCallback(() => setSelected([]), []);

  return { selected, toggleExtra, clearExtras };
}
