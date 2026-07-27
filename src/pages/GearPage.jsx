import { useEffect, useMemo, useState } from 'react';
import EquipmentSlot from '../components/EquipmentSlot';
import GearItemRow from '../components/GearItemRow';
import GearStatsSummary from '../components/GearStatsSummary';
import { COMBAT_STYLES, GEAR } from '../data/gear';
import { isGearItemAvailable } from '../data/gearAvailability';
import { getArmourRating } from '../utils/gearStats';
import { buildShareUrl, encodeShareBuild } from '../utils/shareBuild';
import { createShortLink } from '../utils/api';
import { IS_PAGES_BUILD } from '../utils/deployTarget';

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
];

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

export default function GearPage({
  isUnlocked,
  selected,
  selectedRelics,
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
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('level');
  const [shareStatus, setShareStatus] = useState('idle'); // idle | copied | manual
  const [shortenStatus, setShortenStatus] = useState('idle'); // idle | working | copied | manual | error
  const [hideLocked, setHideLocked] = useState(false);

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
      return isGearItemAvailable(item, isUnlocked);
    }
    if (equipped[activeSlot]?.name === item.name) return true;
    return isGearItemAvailable(item, isUnlocked);
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
  }, [style, activeSlot, search, sortBy, isUnlocked, offhandBlocked, equipped, eofWeapon, hideLocked]);

  // Only offer sort tabs for stats this slot's items actually carry (e.g. no
  // "Acc" tab for a pure armour slot where every item's accuracy is 0) -
  // based on the full unfiltered slot list, not the search results, so tabs
  // don't flicker in/out as the player types. The EOF picker shows special
  // attack text instead of stats, so it never has sort tabs.
  const visibleSortOptions = useMemo(() => {
    if (activeSlot === 'eof') return [];
    const items = GEAR[style]?.[activeSlot] ?? [];
    const hasAccuracy = items.some((item) => item.stats?.accuracy);
    const hasArmour = items.some((item) => getArmourRating(item, style));
    const hasLifeBonus = items.some((item) => item.stats?.lifeBonus);
    return SORT_OPTIONS.filter((opt) => {
      if (opt.id === 'accuracy') return hasAccuracy;
      if (opt.id === 'armour') return hasArmour;
      if (opt.id === 'lifeBonus') return hasLifeBonus;
      return true;
    });
  }, [style, activeSlot]);

  useEffect(() => {
    setSearch('');
  }, [style, activeSlot]);

  useEffect(() => {
    if (!visibleSortOptions.some((opt) => opt.id === sortBy)) setSortBy('level');
  }, [visibleSortOptions, sortBy]);

  async function handleShare() {
    const url = buildShareUrl({
      regions: selected,
      equippedNamesByStyle,
      eofWeaponNamesByStyle,
      relics: selectedRelics,
      defaultStyle,
    });
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
    } catch {
      window.prompt('Copy this link to share your build:', url);
      setShareStatus('manual');
    }
    setTimeout(() => setShareStatus('idle'), 2500);
  }

  // Short links depend on the optional backend (docs/deployment.md) - on
  // GitHub Pages, or before the backend is deployed, /api/shorten simply
  // doesn't exist, so this fails and falls back to 'error' rather than
  // breaking anything. The full `?share=` link above always works
  // regardless, since it's handled entirely client-side.
  async function handleShorten() {
    setShortenStatus('working');
    try {
      const payload = encodeShareBuild({
        regions: selected,
        equippedNamesByStyle,
        eofWeaponNamesByStyle,
        relics: selectedRelics,
        defaultStyle,
      });
      const url = await createShortLink(payload);
      try {
        await navigator.clipboard.writeText(url);
        setShortenStatus('copied');
      } catch {
        window.prompt('Copy this short link:', url);
        setShortenStatus('manual');
      }
    } catch {
      setShortenStatus('error');
    }
    setTimeout(() => setShortenStatus('idle'), 2500);
  }

  const SHARE_LABELS = { copied: 'Link copied!', manual: 'Link ready', idle: 'Share build' };
  const SHORTEN_LABELS = {
    idle: 'Share build',
    working: 'Creating…',
    copied: 'Link copied!',
    manual: 'Link ready',
    error: 'Share unavailable',
  };
  const hasEquippedItems = Object.keys(equipped).length > 0;
  const slotHasAnyItems =
    activeSlot === 'eof'
      ? (GEAR[style]?.weapon ?? []).some((item) => item.specialAttack)
      : (GEAR[style]?.[activeSlot] ?? []).length > 0;
  const activeSlotLabel = activeSlot === 'eof' ? EOF_LABEL : SLOT_LABELS[activeSlot];

  function handleClearLoadout() {
    if (!hasEquippedItems) return;
    if (window.confirm(`Clear your entire ${STYLE_LABELS[style]} loadout?`)) {
      clearLoadout();
    }
  }

  return (
    <>
      <header>
        <div className="gear-page-heading">
          <h1>Gear Planner</h1>
          <div className="gear-page-actions">
            <button
              type="button"
              className="clear-loadout-button"
              onClick={handleClearLoadout}
              disabled={!hasEquippedItems}
            >
              Clear loadout
            </button>
            {IS_PAGES_BUILD ? (
              <button type="button" className="share-button" onClick={handleShare}>
                {SHARE_LABELS[shareStatus]}
              </button>
            ) : (
              <button
                type="button"
                className="share-button"
                onClick={handleShorten}
                disabled={shortenStatus === 'working'}
              >
                {SHORTEN_LABELS[shortenStatus]}
              </button>
            )}
          </div>
        </div>
        <p>
          Pick a combat style, then click a slot to see the best-in-slot gear for it. Each item
          shows the region(s) it needs - greyed-out items are locked until you select those
          regions on the Regions page.
        </p>
      </header>

      <main className="gear-page">
        <div className="style-tabs-row">
          <div className="style-tabs" role="tablist">
            {COMBAT_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={style === s}
                className={`style-tab${style === s ? ' active' : ''}`}
                onClick={() => setStyle(s)}
              >
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>

          <label
            className="default-style-toggle"
            title="The style shown first when you open the planner or a shared link."
          >
            <input
              type="checkbox"
              checked={style === defaultStyle}
              onChange={(e) => e.target.checked && setDefaultStyle(style)}
            />
            <span>Default: {STYLE_LABELS[defaultStyle]}</span>
          </label>
        </div>

        <div className="gear-layout">
          <div className="equip-grid" style={{ gridTemplateAreas: SLOT_GRID_AREAS }}>
            {eofVisible && (
              <EquipmentSlot
                slotId="eof"
                label="EOF"
                item={eofWeapon}
                isActive={activeSlot === 'eof'}
                onSelect={selectSlot}
                miniIcon={equipped.neck?.icon}
              />
            )}
            {Object.keys(SLOT_LABELS).map((slotId) => (
              <EquipmentSlot
                key={slotId}
                slotId={slotId}
                label={SLOT_LABELS[slotId]}
                item={equipped[slotId]}
                isActive={activeSlot === slotId}
                onSelect={selectSlot}
                disabled={slotId === 'offhand' && offhandBlocked}
              />
            ))}
          </div>

          <GearStatsSummary equipped={equipped} />
        </div>

        <div className="gear-item-list">
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
            <label className="hide-locked-toggle">
              <input
                type="checkbox"
                checked={hideLocked}
                onChange={(e) => setHideLocked(e.target.checked)}
              />
              <span>Hide locked items</span>
            </label>
          </div>

          {activeSlot === 'offhand' && offhandBlocked && (
            <p className="gear-notice">Your two-handed weapon blocks the off-hand slot.</p>
          )}

          {displayItems.length > 0 && (
            <div className="gear-item-rows">
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
                  onToggle={activeSlot === 'eof' ? toggleEofWeapon : toggleItem}
                  showSpecialAttack={activeSlot === 'eof'}
                />
              ))}
            </div>
          )}
          {displayItems.length === 0 && hideLocked && slotHasAnyItems && (
            <p className="gear-empty">
              All {STYLE_LABELS[style].toLowerCase()} items for this slot are locked. Turn off
              "Hide locked items" to see them.
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
      </main>
    </>
  );
}
