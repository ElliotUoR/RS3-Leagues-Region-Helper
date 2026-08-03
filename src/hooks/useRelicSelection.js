import { useCallback, useEffect, useState } from 'react';
import { RELICS } from '../data/relics';

export const RELICS_STORAGE_KEY = 'rs3-leagues-relics';
export const MAX_RELICS = 3;

const RELIC_NAMES = new Set(RELICS.map((r) => r.name));

// Validates an arbitrary array (from localStorage or a decoded share link)
// down to known relic power names, capped to MAX_RELICS - drops anything
// stale/invalid/over-the-cap (keeping pick order, so a truncated share link
// still gets a sensible first-3).
export function sanitizeRelicSelection(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((name) => RELIC_NAMES.has(name)).slice(0, MAX_RELICS);
}

function loadInitialSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RELICS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeRelicSelection(JSON.parse(raw));
  } catch {
    return [];
  }
}

// `initialSelection`, when provided (e.g. a decoded share link), seeds state
// instead of localStorage. `persist: false` keeps toggling fully interactive
// but skips writing to localStorage - used for previewing someone else's
// shared build without touching the viewer's own saved picks.
export function useRelicSelection({ initialSelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(RELICS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  const toggleRelic = useCallback((relic) => {
    setSelected((prev) => {
      if (prev.includes(relic.name)) return prev.filter((n) => n !== relic.name);
      if (prev.length >= MAX_RELICS) return prev;
      return [...prev, relic.name];
    });
  }, []);

  // Same reason as useLeagueRelicSelection's clearLeagueRelics.
  const clearRelics = useCallback(() => setSelected([]), []);

  return { selected, toggleRelic, clearRelics };
}
