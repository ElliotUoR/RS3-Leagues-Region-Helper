import { useCallback, useEffect, useState } from 'react';
import { FIXED_REGIONS, GATEWAY_REGIONS, MAX_OPTIONAL, REGIONS } from '../data/regions';
import { trackUsage } from '../utils/api';

export const REGIONS_STORAGE_KEY = 'rs3-leagues-regions';
export const GATEWAY_STORAGE_KEY = 'rs3-leagues-gateway-regions';

// Validates an arbitrary array (from localStorage or a decoded share link)
// down to known, non-fixed, non-gateway region ids - drops anything
// stale/invalid/fixed/gateway (gateway regions like Karamja have their own
// separate toggle/storage, see sanitizeGatewaySelection below).
export function sanitizeRegionSelection(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => REGIONS[id] && !REGIONS[id].fixed && !REGIONS[id].gateway);
}

// Validates an arbitrary array of gateway region ids currently toggled on.
// Defaults to "all gateway regions on" (e.g. old share links/saves from
// before Karamja became toggleable never recorded this at all - Karamja
// was unconditionally unlocked back then, so that's the correct default).
export function sanitizeGatewaySelection(raw) {
  if (!Array.isArray(raw)) return [...GATEWAY_REGIONS];
  return GATEWAY_REGIONS.filter((id) => raw.includes(id));
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

function loadInitialGatewaySelection() {
  if (typeof window === 'undefined') return [...GATEWAY_REGIONS];
  try {
    const raw = window.localStorage.getItem(GATEWAY_STORAGE_KEY);
    if (!raw) return [...GATEWAY_REGIONS];
    return sanitizeGatewaySelection(JSON.parse(raw));
  } catch {
    return [...GATEWAY_REGIONS];
  }
}

// `initialSelection`/`initialGatewaySelection`, when provided (e.g. a
// decoded share link), seed state instead of localStorage. `persist: false`
// keeps the hook fully interactive (toggleRegion/isUnlocked behave
// identically either way) but skips writing to localStorage - used for
// previewing someone else's shared build without touching the viewer's own
// saved selection.
export function useRegionSelection({ initialSelection, initialGatewaySelection, persist = true } = {}) {
  const [selected, setSelected] = useState(() => initialSelection ?? loadInitialSelection());
  const [gatewaySelected, setGatewaySelected] = useState(
    () => initialGatewaySelection ?? loadInitialGatewaySelection(),
  );

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(REGIONS_STORAGE_KEY, JSON.stringify(selected));
  }, [selected, persist]);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(GATEWAY_STORAGE_KEY, JSON.stringify(gatewaySelected));
  }, [gatewaySelected, persist]);

  const toggleRegion = useCallback((id) => {
    if (FIXED_REGIONS.includes(id)) return;
    if (GATEWAY_REGIONS.includes(id)) {
      setGatewaySelected((prev) => {
        const wasOn = prev.includes(id);
        // Only the off-toggle is interesting to track - a gateway region is
        // on by default, so "how often does someone actually turn Karamja
        // off" is the real product question, not every toggle either way.
        // Keyed off `id` (not hardcoded to "karamja") so this stays correct
        // if a second gateway region is ever added - GATEWAY_REGIONS only
        // has Karamja today, so this produces exactly 'karamja_toggled_off'.
        if (wasOn) trackUsage([{ category: 'feature', key: `${id}_toggled_off` }]);
        return wasOn ? prev.filter((r) => r !== id) : [...prev, id];
      });
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }, []);

  const isUnlocked = useCallback(
    (id) => FIXED_REGIONS.includes(id) || gatewaySelected.includes(id) || selected.includes(id),
    [selected, gatewaySelected],
  );

  const clearRegions = useCallback(() => setSelected([]), []);

  const overLimit = selected.length > MAX_OPTIONAL;

  return { selected, gatewaySelected, toggleRegion, isUnlocked, overLimit, clearRegions };
}
