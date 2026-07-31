import { useCallback, useEffect, useState } from 'react';
import { BLESSINGS } from '../data/blessings';
import { trackUsage } from '../utils/api';

export const BLESSINGS_STORAGE_KEY = 'rs3-leagues-blessings';

const BLESSINGS_BY_NAME = new Map(BLESSINGS.map((b) => [b.name, b]));

// Validates an arbitrary array (from localStorage or a decoded share link)
// down to known blessing names, keeping at most one pick per tier. Unlike
// league relics there is no "unknown tier" escape hatch - every blessing has a
// tier of 1, 2 or 3, and a run picks exactly one from each - so a payload with
// two tier-2 picks is always corrupt and the later one is dropped.
export function sanitizeBlessingSelection(raw) {
  if (!Array.isArray(raw)) return [];
  const seenTiers = new Set();
  const result = [];
  for (const name of raw) {
    const blessing = BLESSINGS_BY_NAME.get(name);
    if (!blessing) continue;
    if (seenTiers.has(blessing.tier)) continue;
    seenTiers.add(blessing.tier);
    result.push(name);
  }
  return result;
}

function loadInitialSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BLESSINGS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeBlessingSelection(JSON.parse(raw));
  } catch {
    return [];
  }
}

// `initialSelection`/`persist` follow the same convention as
// useLeagueRelicSelection.js - see that file (and useRelicSelection.js) for why.
export function useBlessingSelection({ initialSelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(BLESSINGS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  // Radio behaviour within a tier, same as tiered league relics: picking one
  // swaps out whatever else was picked in that tier rather than blocking the
  // click. Clicking the current pick clears it - useful here specifically
  // because the god power is derived from the colours of all three picks, so
  // being able to drop back to two picks and see the derivation change is part
  // of how the page explains itself.
  const toggleBlessing = useCallback(
    (blessing) => {
      setSelected((prev) => {
        if (prev.includes(blessing.name)) return prev.filter((n) => n !== blessing.name);
        // Only track a real pick, not exploring someone else's shared build
        // (persist: false there - see useBlessingSelection's callers).
        if (persist) trackUsage([{ category: 'blessing_pick', key: blessing.name }]);
        const withoutSameTier = prev.filter((n) => BLESSINGS_BY_NAME.get(n)?.tier !== blessing.tier);
        return [...withoutSameTier, blessing.name];
      });
    },
    [persist],
  );

  const clearBlessings = useCallback(() => setSelected([]), []);

  return { selected, toggleBlessing, clearBlessings };
}
