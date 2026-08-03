import { useEffect, useMemo, useRef, useState } from 'react';
import EquipmentSlot from './EquipmentSlot';
import GearItemRow from './GearItemRow';
import GearStatsSummary from './GearStatsSummary';
import TagTooltip from './TagTooltip';
import { COMBAT_STYLES, GEAR } from '../data/gear';
import { isGearItemAvailable } from '../data/gearAvailability';
import { getArmourRating } from '../utils/gearStats';

// The Gear Planner's working area - style tabs, equip grid, and the item
// picker beside it - lifted out of pages/GearPage.jsx so My Build can render
// the SAME planner rather than a third trimmed-down imitation of it.
//
// There were already two: this one and CreateBuildPage's StyleLoadoutEditor,
// whose own comment describes it as "mirroring GearPage.jsx but trimmed down
// for authoring". Two that drift is a nuisance; three is a bug factory. This
// component is the whole planner, so anything My Build gains, the Gear Planner
// gains, and vice versa.
//
// Everything it renders is driven by props from useGearLoadout - the hook lives
// in App.jsx and persists globally, which is exactly why both pages editing the
// same loadout works with no plumbing at all. What stays OUT of here is each
// page's own header: the Gear Planner's Clear/Share pair and My Build's
// Clear/Share/Import trio differ, and neither belongs to the planner itself.

const SLOT_LABELS = {
  head: 'Head',
  pocket: 'Pocket',
  back: 'Back',
  neck: 'Neck',
  ammo: 'Ammo',
  weapon: 'Weapon',
  torso: 'Torso',
  offhand: 'Off-hand',
  legs: 'Legs',
  hands: 'Hands',
  feet: 'Feet',
  ring: 'Ring',
};

const EOF_LABEL = 'EOF weapon';

// Reading order matches the classic RS3 worn-equipment interface layout.
// 'eof' (top-left, left of the helmet) only ever renders when an Essence of
// Finality necklace is equipped - see the conditional EquipmentSlot below.
const SLOT_GRID_AREAS = `
  "eof head pocket"
  "back neck ammo"
  "weapon torso offhand"
  ". legs ."
  "hands feet ring"
`;

const STYLE_LABELS = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
  necromancy: 'Necromancy',
};

const SORT_OPTIONS = [
  { id: 'level', label: 'Level' },
  { id: 'damage', label: 'Dmg' },
  { id: 'accuracy', label: 'Acc' },
  { id: 'armour', label: 'Tank (Arm)' },
  { id: 'lifeBonus', label: 'Tank (LP)' },
  { id: 'prayerBonus', label: 'Prayer' },
];

// Neck and ring items are largely flat-damage accessories with no level
// requirement at all and no armour/accuracy spread - Level sorting groups
// almost everything at 0 and does nothing useful, so these two slots offer a
// reduced set of sorts (with Dmg the default). Prayer is in that set: unlike
// the others it really does spread them out, since most neck items carry a
// prayer bonus.
const NO_LEVEL_SLOTS = new Set(['neck', 'ring']);

// Below this width the grid and the item list stack vertically instead of
// sitting side by side, so tapping a slot leaves you staring at the grid with
// the list you just opened somewhere off the bottom of the screen - and picking
// an item leaves you at the list, with no sign that anything was equipped.
// Checked at call time rather than on mount so rotating the device is handled.
const STACKED_LAYOUT_QUERY = '(max-width: 700px)';

function isStackedLayout() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(STACKED_LAYOUT_QUERY).matches;
  } catch {
    return false;
  }
}

// Deferred past the render that the click causes. Selecting a slot swaps the
// entire item list for a different one, which changes the document height by
// thousands of pixels - a smooth scroll started before that lands is measured
// against the OLD layout and gets abandoned partway. Two frames is enough for
// React to commit and the browser to reflow.
function scrollTo(ref) {
  if (!isStackedLayout()) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function sortItems(items, sortBy, style) {
  return [...items].sort((a, b) => {
    const valueOf = (item) => {
      if (sortBy === 'level') return item.level?.level ?? 0;
      if (sortBy === 'armour') return getArmourRating(item, style);
      return item.stats?.[sortBy] ?? 0;
    };
    return valueOf(b) - valueOf(a);
  });
}

export default function GearLoadoutPlanner({
  isUnlocked,
  selectedLeagueRelics,
  style,
  setStyle,
  defaultStyle,
  setDefaultStyle,
  activeSlot,
  selectSlot,
  equipped,
  toggleItem,
  unequipSlot,
  offhandBlocked,
  eofVisible,
  eofWeapon,
  toggleEofWeapon,
  // Rendered between the equipment grid and the stats summary. My Build uses
  // it for the blessing lines that the build editor shows in the same place;
  // the Gear Planner passes nothing.
  underGrid = null,
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('level');
  const [hideLocked, setHideLocked] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const gridRef = useRef(null);
  const listRef = useRef(null);

  // The two halves of the stacked-layout round trip: open a slot and the list
  // comes to you, pick something and you are returned to the grid to see it
  // land. Desktop is unaffected - both are already on screen together.
  function handleSelectSlot(slotId) {
    selectSlot(slotId);
    scrollTo(listRef);
  }

  function handlePickItem(item) {
    toggleItem(item);
    scrollTo(gridRef);
  }

  function handlePickEofWeapon(item) {
    toggleEofWeapon(item);
    scrollTo(gridRef);
  }

  // An item outside the player's picked regions still counts as "available"
  // once it's the item actually equipped in this slot - that's the whole
  // signal for "this was equipped via Ignore restrictions" (or loaded from a
  // save/share where someone else had it force-equipped). No separate
  // override flag needs to be tracked or persisted anywhere: the equipped
  // state itself is the implied override, for exactly as long as it stays
  // equipped. The EOF picker isn't a real equipped slot, so it checks
  // `eofWeapon` instead of `equipped[activeSlot]`.
  function isItemAvailable(item) {
    if (activeSlot === 'offhand' && offhandBlocked) return false;
    if (activeSlot === 'eof') {
      if (eofWeapon?.name === item.name) return true;
      return isGearItemAvailable(item, isUnlocked, { selectedLeagueRelics });
    }
    if (equipped[activeSlot]?.name === item.name) return true;
    return isGearItemAvailable(item, isUnlocked, { selectedLeagueRelics });
  }

  const displayItems = useMemo(() => {
    // The EOF slot holds a weapon's spirit purely for its special attack -
    // one-handed or two-handed both qualify (confirmed against the amulet's
    // own wiki page, which lists both) - only weapons with no special attack
    // never show up here.
    const items =
      activeSlot === 'eof'
        ? (GEAR[style]?.weapon ?? []).filter((item) => item.specialAttack)
        : GEAR[style]?.[activeSlot] ?? [];
    const query = search.trim().toLowerCase();
    const matched = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;
    // Available items always sort ahead of locked ones; each group keeps its
    // own sort order (e.g. by Dmg) so locked gear doesn't drown out valid gear.
    const available = matched.filter((item) => isItemAvailable(item));
    const locked = hideLocked ? [] : matched.filter((item) => !isItemAvailable(item));
    return [...sortItems(available, sortBy, style), ...sortItems(locked, sortBy, style)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, activeSlot, search, sortBy, isUnlocked, offhandBlocked, equipped, eofWeapon, hideLocked, selectedLeagueRelics]);

  // Only offer sort tabs for stats this slot's items actually carry (e.g. no
  // "Acc" tab for a pure armour slot where every item's accuracy is 0) -
  // based on the full unfiltered slot list, not the search results, so tabs
  // don't flicker in/out as the player types. The EOF picker shows special
  // attack text instead of stats, so it never has sort tabs.
  const visibleSortOptions = useMemo(() => {
    if (activeSlot === 'eof') return [];
    if (NO_LEVEL_SLOTS.has(activeSlot)) {
      // Damage AND prayer: unlike level/accuracy/armour/LP, prayer bonus really
      // does spread these out - most neck items carry one, and picking a neck
      // slot for its prayer bonus is a normal thing to be doing.
      return SORT_OPTIONS.filter((opt) => opt.id === 'damage' || opt.id === 'prayerBonus');
    }
    const items = GEAR[style]?.[activeSlot] ?? [];
    const hasAccuracy = items.some((item) => item.stats?.accuracy);
    const hasArmour = items.some((item) => getArmourRating(item, style));
    const hasLifeBonus = items.some((item) => item.stats?.lifeBonus);
    const hasPrayerBonus = items.some((item) => item.stats?.prayerBonus);
    return SORT_OPTIONS.filter((opt) => {
      if (opt.id === 'accuracy') return hasAccuracy;
      if (opt.id === 'armour') return hasArmour;
      if (opt.id === 'lifeBonus') return hasLifeBonus;
      if (opt.id === 'prayerBonus') return hasPrayerBonus;
      return true;
    });
  }, [style, activeSlot]);

  useEffect(() => {
    setSearch('');
  }, [style, activeSlot]);

  useEffect(() => {
    if (visibleSortOptions.some((opt) => opt.id === sortBy)) return;
    setSortBy(NO_LEVEL_SLOTS.has(activeSlot) ? 'damage' : 'level');
  }, [visibleSortOptions, sortBy, activeSlot]);

  const slotHasAnyItems =
    activeSlot === 'eof'
      ? (GEAR[style]?.weapon ?? []).some((item) => item.specialAttack)
      : (GEAR[style]?.[activeSlot] ?? []).length > 0;
  const activeSlotLabel = activeSlot === 'eof' ? EOF_LABEL : SLOT_LABELS[activeSlot];

  return (
    <div className="gear-layout">
      <div className="gear-layout-left">
        <div className="style-tabs" role="tablist">
          {COMBAT_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={style === s}
              className={`style-tab style-tab-${s}${style === s ? ' active' : ''}`}
              onClick={() => setStyle(s)}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>

        <div ref={gridRef} className="equip-grid" style={{ gridTemplateAreas: SLOT_GRID_AREAS }}>
          {eofVisible && (
            <EquipmentSlot
              slotId="eof"
              label="EOF"
              item={eofWeapon}
              isActive={activeSlot === 'eof'}
              onSelect={handleSelectSlot}
              onUnequip={unequipSlot}
              miniIcon={equipped.neck?.icon}
              isUnlocked={isUnlocked}
              style={style}
              selectedLeagueRelics={selectedLeagueRelics}
            />
          )}
          {Object.keys(SLOT_LABELS).map((slotId) => (
            <EquipmentSlot
              key={slotId}
              slotId={slotId}
              label={SLOT_LABELS[slotId]}
              item={equipped[slotId]}
              isActive={activeSlot === slotId}
              onSelect={handleSelectSlot}
              onUnequip={unequipSlot}
              disabled={slotId === 'offhand' && offhandBlocked}
              isUnlocked={isUnlocked}
              style={style}
              selectedLeagueRelics={selectedLeagueRelics}
            />
          ))}
        </div>

        {underGrid}

        <div className="default-style-row">
          <label className="default-style-toggle">
            <input
              type="checkbox"
              checked={style === defaultStyle}
              onChange={(e) => e.target.checked && setDefaultStyle(style)}
            />
            <span>Default: {STYLE_LABELS[defaultStyle]}</span>
          </label>
          <TagTooltip
            className="info-icon"
            tooltip="The style shown first when you open the planner or a shared link."
          >
            ?
          </TagTooltip>
        </div>

        <GearStatsSummary equipped={equipped} style={style} />
      </div>

      <div ref={listRef} className="gear-item-list">
        <div className="gear-item-list-header">
          <h3>{activeSlotLabel} - {STYLE_LABELS[style]}</h3>
          <input
            type="search"
            className="gear-search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={activeSlot === 'offhand' && offhandBlocked}
          />
        </div>

        <div className="gear-item-list-controls">
          <div className="sort-tabs" role="tablist" aria-label="Sort by">
            {visibleSortOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={sortBy === opt.id}
                className={`sort-tab${sortBy === opt.id ? ' active' : ''}`}
                onClick={() => setSortBy(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="gear-item-list-toggles">
            <label className="hide-locked-toggle">
              <input type="checkbox" checked={hideLocked} onChange={(e) => setHideLocked(e.target.checked)} />
              <span>Hide region-locked items</span>
            </label>
            <label className="compact-mode-toggle">
              <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
              <span>Compact mode</span>
            </label>
          </div>
        </div>

        {activeSlot === 'offhand' && offhandBlocked && (
          <p className="gear-notice">Your two-handed weapon blocks the off-hand slot.</p>
        )}

        <div className="gear-item-list-scroll">
          {displayItems.length > 0 && (
            <div className={`gear-item-rows${compactMode ? ' compact' : ''}`}>
              {displayItems.map((item) => (
                <GearItemRow
                  key={item.name}
                  item={item}
                  style={style}
                  equipped={
                    activeSlot === 'eof'
                      ? eofWeapon?.name === item.name
                      : equipped[activeSlot]?.name === item.name
                  }
                  available={isItemAvailable(item)}
                  isUnlocked={isUnlocked}
                  selectedLeagueRelics={selectedLeagueRelics}
                  onToggle={activeSlot === 'eof' ? handlePickEofWeapon : handlePickItem}
                  showSpecialAttack={activeSlot === 'eof'}
                  compact={compactMode}
                />
              ))}
            </div>
          )}
          {displayItems.length === 0 && hideLocked && slotHasAnyItems && (
            <p className="gear-empty">
              All {STYLE_LABELS[style].toLowerCase()} items for this slot are locked. Turn off
              "Hide region-locked items" to see them.
            </p>
          )}
          {displayItems.length === 0 && !(hideLocked && slotHasAnyItems) && activeSlot === 'eof' && (
            <p className="gear-empty">
              No {STYLE_LABELS[style].toLowerCase()} weapons with a special attack exist for this slot.
            </p>
          )}
          {displayItems.length === 0 && !(hideLocked && slotHasAnyItems) && activeSlot !== 'eof' && (
            <p className="gear-empty">
              No {STYLE_LABELS[style].toLowerCase()} items exist for this slot.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
