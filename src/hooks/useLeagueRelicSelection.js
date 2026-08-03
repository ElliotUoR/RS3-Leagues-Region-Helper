import { useCallback, useEffect, useState } from 'react';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { sanitizeRelicPicks, toggleRelicPick } from '../data/leagueRelicPicks';
import { trackUsage } from '../utils/api';

export const LEAGUE_RELICS_STORAGE_KEY = 'rs3-leagues-league-relics';

const LEAGUE_RELICS_BY_NAME_LOWER = new Map(LEAGUE_RELICS.map((r) => [r.name.toLowerCase(), r]));

// Validates an arbitrary array (localStorage, a decoded share link, a stored
// build payload) down to a legal set of picks. The rules themselves - one per
// tier, plus Rejuvenated's single extra - live in data/leagueRelicPicks.js,
// which every surface that enforces or describes them shares.
export function sanitizeLeagueRelicSelection(raw) {
  return sanitizeRelicPicks(raw);
}

// Same validation, but matched case-insensitively (and whitespace-trimmed) -
// used only for the ?import-relics= API (see utils/importRelics.js). Exact
// matching is right for this app's own share links (it only ever produces
// exact-cased names itself), but a third-party site importing relics by
// name is much more likely to get casing slightly wrong, and there's no
// reason to punish that when relic names aren't ambiguous case-insensitively.
export function sanitizeLeagueRelicSelectionLoose(raw) {
  if (!Array.isArray(raw)) return [];
  const canonicalNames = raw
    .filter((name) => typeof name === 'string')
    .map((name) => LEAGUE_RELICS_BY_NAME_LOWER.get(name.trim().toLowerCase())?.name)
    .filter(Boolean);
  return sanitizeRelicPicks(canonicalNames);
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

  // Tiered relics behave like a radio button - picking one swaps out whatever
  // else was picked in the same tier, rather than requiring the player to
  // deselect it first (there is no overall pick cap the way Arch relics have
  // one, so a click is never simply blocked). Rejuvenated widens exactly one
  // tier to two slots; see data/leagueRelicPicks.js for the whole rule.
  const toggleLeagueRelic = useCallback(
    (relic) => {
      setSelected((prev) => {
        // Only track a real pick, not a deselect, and not exploring someone
        // else's shared build (persist: false there - see the callers).
        if (persist && !prev.includes(relic.name)) {
          trackUsage([{ category: 'league_relic_pick', key: relic.name }]);
        }
        return toggleRelicPick(prev, relic);
      });
    },
    [persist],
  );

  // My Build's "Clear everything" needs to empty this alongside the other four
  // selections - see pages/MyBuildPage.jsx.
  const clearLeagueRelics = useCallback(() => setSelected([]), []);

  // See useRegionSelection's setRegions for why this sanitises.
  const setLeagueRelics = useCallback((names) => setSelected(sanitizeLeagueRelicSelection(names)), []);

  return { selected, toggleLeagueRelic, clearLeagueRelics, setLeagueRelics };
}
