import { useEffect, useMemo, useState } from 'react';
import EquipmentSlot from '../components/EquipmentSlot';
import GearItemRow from '../components/GearItemRow';
import GearStatsSummary from '../components/GearStatsSummary';
import TagTooltip from '../components/TagTooltip';
import { COMBAT_STYLES, GEAR } from '../data/gear';
import { isGearItemAvailable } from '../data/gearAvailability';
import { getArmourRating } from '../utils/gearStats';
import { buildShareUrl } from '../utils/shareBuild';
import { copyShareLink, shareLinkFor } from '../utils/shareLink';
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

// Neck and ring items are largely flat-damage accessories with no level
// requirement at all and no armour/accuracy/LP spread - Level sorting groups
// almost everything at 0 and does nothing useful, so Dmg is the only sort
// (and the default) offered for these two slots.
const NO_LEVEL_SLOTS = new Set(['neck', 'ring']);

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
  gatewaySelected,
  selectedRelics,
  selectedLeagueRelics,
  selectedBlessings,
  style,
  setStyle,
  defaultStyle,
  setDefaultStyle,
  activeSlot,
  selectSlot,
  equipped,
  equippedNamesByStyle,
  toggleItem,
  unequipSlot,
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
  const [compactMode, setCompactMode] = useState(false);

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
  }, [style, activeSlot, search, sortBy, isUnlocked, offhandBlocked, equipped, eofWeapon, hideLocked, selectedLeagueRelics]);

  // Only offer sort tabs for stats this slot's items actually carry (e.g. no
  // "Acc" tab for a pure armour slot where every item's accuracy is 0) -
  // based on the full unfiltered slot list, not the search results, so tabs
  // don't flicker in/out as the player types. The EOF picker shows special
  // attack text instead of stats, so it never has sort tabs.
  const visibleSortOptions = useMemo(() => {
    if (activeSlot === 'eof') return [];
    if (NO_LEVEL_SLOTS.has(activeSlot)) return SORT_OPTIONS.filter((opt) => opt.id === 'damage');
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
    if (visibleSortOptions.some((opt) => opt.id === sortBy)) return;
    setSortBy(NO_LEVEL_SLOTS.has(activeSlot) ? 'damage' : 'level');
  }, [visibleSortOptions, sortBy, activeSlot]);

  async function handleShare() {
    const url = buildShareUrl({
      regions: selected,
      gatewaySelected,
      equippedNamesByStyle,
      eofWeaponNamesByStyle,
      relics: selectedRelics,
      leagueRelics: selectedLeagueRelics,
      blessings: selectedBlessings,
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
      // The default style is baked into the short link, so a build whose
      // default style has nothing equipped (easy to end up with - not
      // everyone re-checks "Default" after switching styles) would hand
      // the recipient an empty tab first. Fall back to the first style
      // (in melee/ranged/magic/necromancy order) that actually has gear,
      // and adopt it as the real default too rather than only patching the
      // link's payload.
      let effectiveDefaultStyle = defaultStyle;
      const styleHasGear = (s) => Object.keys(equippedNamesByStyle[s] ?? {}).length > 0;
      if (!styleHasGear(defaultStyle)) {
        const fallbackStyle = COMBAT_STYLES.find(styleHasGear);
        if (fallbackStyle) {
          effectiveDefaultStyle = fallbackStyle;
          setDefaultStyle(fallbackStyle);
        }
      }
      // shareLinkFor caches per payload and the backend looks the payload hash
      // up before inserting, so re-sharing an unchanged build returns the code
      // that already exists - see utils/shareLink.js.
      const url = await shareLinkFor({
        regions: selected,
        gatewaySelected,
        equippedNamesByStyle,
        eofWeaponNamesByStyle,
        relics: selectedRelics,
        leagueRelics: selectedLeagueRelics,
        blessings: selectedBlessings,
        defaultStyle: effectiveDefaultStyle,
      });
      setShortenStatus(await copyShareLink(url));
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
      </header>

      <main className="gear-page">
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

            <div className="equip-grid" style={{ gridTemplateAreas: SLOT_GRID_AREAS }}>
              {eofVisible && (
                <EquipmentSlot
                  slotId="eof"
                  label="EOF"
                  item={eofWeapon}
                  isActive={activeSlot === 'eof'}
                  onSelect={selectSlot}
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
                  onSelect={selectSlot}
                  onUnequip={unequipSlot}
                  disabled={slotId === 'offhand' && offhandBlocked}
                  isUnlocked={isUnlocked}
                  style={style}
                  selectedLeagueRelics={selectedLeagueRelics}
                />
              ))}
            </div>

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
              <div className="gear-item-list-toggles">
                <label className="hide-locked-toggle">
                  <input
                    type="checkbox"
                    checked={hideLocked}
                    onChange={(e) => setHideLocked(e.target.checked)}
                  />
                  <span>Hide region-locked items</span>
                </label>
                <label className="compact-mode-toggle">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                  />
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
                      onToggle={activeSlot === 'eof' ? toggleEofWeapon : toggleItem}
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
      </main>
    </>
  );
}
