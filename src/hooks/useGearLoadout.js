import { useEffect, useMemo, useState } from 'react';
import { ESSENCE_OF_FINALITY_NAMES, GEAR, GEAR_SLOTS } from '../data/gear';
import {
  emptyEofWeaponNames,
  emptyEquippedNames,
  sanitizeEofWeaponNames,
  sanitizeEquippedNames,
  sanitizeStyle,
} from '../data/gearShape';

export const GEAR_STORAGE_KEY = 'rs3-leagues-gear-planner';

// 'eof' is a pseudo-slot (the Essence of Finality weapon picker) - not a real
// GEAR_SLOTS entry, but still a valid thing for `activeSlot` to be.
const SELECTABLE_SLOTS = new Set([...GEAR_SLOTS, 'eof']);

function loadInitialState() {
  const fallback = {
    equippedNames: emptyEquippedNames(),
    eofWeaponNames: emptyEofWeaponNames(),
    defaultStyle: 'melee',
    activeSlot: 'weapon',
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(GEAR_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      equippedNames: sanitizeEquippedNames(parsed.equippedNames),
      eofWeaponNames: sanitizeEofWeaponNames(parsed.eofWeaponNames),
      // Older saves stored the last-viewed tab as `style` rather than an
      // explicit default - fall back to that if `defaultStyle` isn't there.
      defaultStyle: sanitizeStyle(parsed.defaultStyle ?? parsed.style),
      activeSlot: SELECTABLE_SLOTS.has(parsed.activeSlot) ? parsed.activeSlot : 'weapon',
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
export function useGearLoadout({
  initialEquippedNames,
  initialEofWeaponNames,
  initialDefaultStyle,
  persist = true,
} = {}) {
  const [initial] = useState(() =>
    initialEquippedNames
      ? {
          equippedNames: sanitizeEquippedNames(initialEquippedNames),
          eofWeaponNames: sanitizeEofWeaponNames(initialEofWeaponNames),
          defaultStyle: sanitizeStyle(initialDefaultStyle),
          activeSlot: 'weapon',
        }
      : loadInitialState(),
  );
  const [defaultStyle, setDefaultStyle] = useState(initial.defaultStyle);
  const [style, setStyle] = useState(initial.defaultStyle);
  const [activeSlot, setActiveSlot] = useState(initial.activeSlot);
  const [equippedNamesByStyle, setEquippedNamesByStyle] = useState(initial.equippedNames);
  const [eofWeaponNamesByStyle, setEofWeaponNamesByStyle] = useState(initial.eofWeaponNames);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(
      GEAR_STORAGE_KEY,
      JSON.stringify({ equippedNames: equippedNamesByStyle, eofWeaponNames: eofWeaponNamesByStyle, defaultStyle, activeSlot }),
    );
  }, [equippedNamesByStyle, eofWeaponNamesByStyle, defaultStyle, activeSlot, persist]);

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

  // The EOF slot only exists while an Essence of Finality necklace (either
  // version) is worn in 'neck' - the weapon whose spirit is slotted inside it
  // is still remembered per-style even while hidden, so re-equipping the
  // necklace later brings the same weapon straight back.
  const eofVisible = ESSENCE_OF_FINALITY_NAMES.includes(equipped.neck?.name);
  const eofWeapon = useMemo(() => {
    const name = eofWeaponNamesByStyle[style];
    if (!name) return null;
    return GEAR[style]?.weapon?.find((i) => i.name === name) ?? null;
  }, [eofWeaponNamesByStyle, style]);

  // If the necklace comes off (or a shared/loaded build never had it on)
  // while the EOF picker is open, fall back to a real slot rather than
  // showing a picker for a slot that no longer exists on screen.
  useEffect(() => {
    if (activeSlot === 'eof' && !eofVisible) setActiveSlot('weapon');
  }, [activeSlot, eofVisible]);

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

  function toggleEofWeapon(item) {
    setEofWeaponNamesByStyle((prev) => ({
      ...prev,
      [style]: prev[style] === item.name ? null : item.name,
    }));
  }

  function selectSlot(slotId) {
    if (slotId === 'offhand' && offhandBlocked) return;
    if (slotId === 'eof' && !eofVisible) return;
    setActiveSlot(slotId);
  }

  // Clears every equipped slot for the *current* style only - the other 3
  // styles' loadouts are untouched, since each style's gear is planned
  // independently.
  function clearLoadout() {
    setEquippedNamesByStyle((prev) => ({ ...prev, [style]: {} }));
    setEofWeaponNamesByStyle((prev) => ({ ...prev, [style]: null }));
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
    eofVisible,
    eofWeapon,
    eofWeaponNamesByStyle,
    toggleEofWeapon,
  };
}
