import { useEffect, useMemo, useState } from 'react';
import { GEAR, GEAR_SLOTS } from '../data/gear';
import { emptyEquippedNames, sanitizeEquippedNames, sanitizeStyle } from '../data/gearShape';

export const GEAR_STORAGE_KEY = 'rs3-leagues-gear-planner';

function loadInitialState() {
  const fallback = { equippedNames: emptyEquippedNames(), defaultStyle: 'melee', activeSlot: 'weapon' };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(GEAR_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      equippedNames: sanitizeEquippedNames(parsed.equippedNames),
      // Older saves stored the last-viewed tab as `style` rather than an
      // explicit default - fall back to that if `defaultStyle` isn't there.
      defaultStyle: sanitizeStyle(parsed.defaultStyle ?? parsed.style),
      activeSlot: GEAR_SLOTS.includes(parsed.activeSlot) ? parsed.activeSlot : 'weapon',
    };
  } catch {
    return fallback;
  }
}

// `initialEquippedNames`/`initialDefaultStyle`, when provided (e.g. a decoded
// share link), seed the loadout instead of localStorage - activeSlot always
// defaults to 'weapon' in that case (a share link doesn't carry transient UI
// state like which slot was last selected). `persist: false` keeps
// equip/unequip and default-style changes fully interactive but skips
// writing to localStorage - used when previewing a shared build without
// touching the viewer's own saved loadout.
//
// The visible tab always opens on `defaultStyle` on every fresh load (page
// refresh, or opening a share link) - it's an explicit, player-set choice
// rather than "whichever tab happened to be open last."
export function useGearLoadout({ initialEquippedNames, initialDefaultStyle, persist = true } = {}) {
  const [initial] = useState(() =>
    initialEquippedNames
      ? {
          equippedNames: sanitizeEquippedNames(initialEquippedNames),
          defaultStyle: sanitizeStyle(initialDefaultStyle),
          activeSlot: 'weapon',
        }
      : loadInitialState(),
  );
  const [defaultStyle, setDefaultStyle] = useState(initial.defaultStyle);
  const [style, setStyle] = useState(initial.defaultStyle);
  const [activeSlot, setActiveSlot] = useState(initial.activeSlot);
  const [equippedNamesByStyle, setEquippedNamesByStyle] = useState(initial.equippedNames);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(
      GEAR_STORAGE_KEY,
      JSON.stringify({ equippedNames: equippedNamesByStyle, defaultStyle, activeSlot }),
    );
  }, [equippedNamesByStyle, defaultStyle, activeSlot, persist]);

  // Resolve persisted item names back to live item objects from GEAR so a
  // saved/shared loadout always reflects current stats/availability data.
  const equipped = useMemo(() => {
    const names = equippedNamesByStyle[style] ?? {};
    const resolved = {};
    for (const slot of GEAR_SLOTS) {
      const name = names[slot];
      if (!name) continue;
      const item = GEAR[style]?.[slot]?.find((i) => i.name === name);
      if (item) resolved[slot] = item;
    }
    return resolved;
  }, [equippedNamesByStyle, style]);

  const offhandBlocked = Boolean(equipped.weapon?.twoHanded);

  function toggleItem(item) {
    setEquippedNamesByStyle((prev) => {
      const current = { ...prev[style] };
      const alreadyEquipped = current[activeSlot] === item.name;

      if (alreadyEquipped) {
        delete current[activeSlot];
      } else {
        current[activeSlot] = item.name;
        if (activeSlot === 'weapon' && item.twoHanded) {
          delete current.offhand;
        }
      }
      return { ...prev, [style]: current };
    });
  }

  function selectSlot(slotId) {
    if (slotId === 'offhand' && offhandBlocked) return;
    setActiveSlot(slotId);
  }

  // Clears every equipped slot for the *current* style only - the other 3
  // styles' loadouts are untouched, since each style's gear is planned
  // independently.
  function clearLoadout() {
    setEquippedNamesByStyle((prev) => ({ ...prev, [style]: {} }));
  }

  return {
    style,
    setStyle,
    defaultStyle,
    setDefaultStyle,
    activeSlot,
    selectSlot,
    equipped,
    equippedNamesByStyle,
    toggleItem,
    clearLoadout,
    offhandBlocked,
  };
}
