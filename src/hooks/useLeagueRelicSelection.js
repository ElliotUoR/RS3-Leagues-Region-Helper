import { useCallback, useEffect, useState } from 'react';
import { LEAGUE_RELICS } from '../data/leagueRelics';

export const LEAGUE_RELICS_STORAGE_KEY = 'rs3-leagues-league-relics';

const LEAGUE_RELICS_BY_NAME = new Map(LEAGUE_RELICS.map((r) => [r.name, r]));

// Validates an arbitrary array (from localStorage or a decoded share link)
// down to known league relic names, collapsing any duplicate pick within
// the same tier down to just the first one - the "one per tier" constraint
// (see toggleLeagueRelic below) has to hold even for a hand-crafted/
// corrupted payload, not just picks made through the UI. Relics with an
// unknown tier (`tier: null`) have no such constraint - any number of those
// are kept as-is.
export function sanitizeLeagueRelicSelection(raw) {
  if (!Array.isArray(raw)) return [];
  const seenTiers = new Set();
  const result = [];
  for (const name of raw) {
    const relic = LEAGUE_RELICS_BY_NAME.get(name);
    if (!relic) continue;
    if (relic.tier != null) {
      if (seenTiers.has(relic.tier)) continue;
      seenTiers.add(relic.tier);
    }
    result.push(name);
  }
  return result;
}

function loadInitialSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEAGUE_RELICS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeLeagueRelicSelection(JSON.parse(raw));
  } catch {
    return [];
  }
}

// `initialSelection`/`persist` follow the same convention as
// useRelicSelection.js (Arch relics) - see that file for why.
export function useLeagueRelicSelection({ initialSelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(LEAGUE_RELICS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  // Tiered relics behave like a radio button - picking one swaps out
  // whatever else was picked in the same tier, rather than requiring the
  // player to manually deselect it first (there's no overall pick cap the
  // way Arch relics have one, so a click is never simply blocked). Relics
  // with an unknown tier just toggle freely alongside anything else.
  const toggleLeagueRelic = useCallback((relic) => {
    setSelected((prev) => {
      if (prev.includes(relic.name)) return prev.filter((n) => n !== relic.name);
      if (relic.tier == null) return [...prev, relic.name];
      const withoutSameTier = prev.filter((n) => LEAGUE_RELICS_BY_NAME.get(n)?.tier !== relic.tier);
      return [...withoutSameTier, relic.name];
    });
  }, []);

  return { selected, toggleLeagueRelic };
}
