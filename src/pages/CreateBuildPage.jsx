import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import RetryImage from '../components/RetryImage';
import EquipmentSlot from '../components/EquipmentSlot';
import GearItemRow from '../components/GearItemRow';
import RegionMap from '../components/RegionMap';
import LeagueRelicRow from '../components/LeagueRelicRow';
import RelicRow from '../components/RelicRow';
import BlessingCard from '../components/BlessingCard';
import BlessingGodPanel from '../components/BlessingGodPanel';
import PasswordField from '../components/PasswordField';
import LeaguesEffectsPanel from '../components/LeaguesEffectsPanel';
import LoadoutStatNote from '../components/LoadoutStatNote';
import BuildExtrasPicker from '../components/BuildExtrasPicker';
import { useGearLoadout } from '../hooks/useGearLoadout';
import { useRegionSelection } from '../hooks/useRegionSelection';
import { useLeagueRelicSelection } from '../hooks/useLeagueRelicSelection';
import { useRelicSelection, MAX_RELICS } from '../hooks/useRelicSelection';
import { useBlessingSelection } from '../hooks/useBlessingSelection';
import { emptyEofWeaponNames, emptyEquippedNames } from '../data/gearShape';
import { COMBAT_STYLES, GEAR } from '../data/gear';
import { BLESSINGS, BLESSING_COLOURS, BLESSING_TIERS } from '../data/blessings';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { RELICS, RELIC_CATEGORIES } from '../data/relics';
import { GATEWAY_REGIONS, REGIONS } from '../data/regions';
import { isGearItemAvailable } from '../data/gearAvailability';
import { activeBuildExtras } from '../data/buildExtras';
import { capForTier } from '../data/leagueRelicPicks';
import {
  ARMOUR_SCALING_BLESSINGS,
  getAegisBreakdown,
  getArmourRating,
  getElderOverloadSources,
  getTotalArmour,
} from '../utils/gearStats';
import { adminUpdateUserBuild, createUserBuild, setUserBuildPassword, updateUserBuild } from '../utils/api';
import { reportPublishFailure } from '../utils/autoReport';
import { saveMyBuildToken } from '../utils/myBuilds';
import { MAX_LENGTHS, MAX_STAGES, MAX_TRADEOFFS } from '../utils/userBuildShape';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };
const SLOT_LABELS = {
  head: 'Head', pocket: 'Pocket', back: 'Back', neck: 'Neck', ammo: 'Ammo',
  weapon: 'Weapon', torso: 'Torso', offhand: 'Off-hand', legs: 'Legs',
  hands: 'Hands', feet: 'Feet', ring: 'Ring',
};
const SLOT_GRID_AREAS = `
  "eof head pocket"
  "back neck ammo"
  "weapon torso offhand"
  ". legs ."
  "hands feet ring"
`;
const regionIcon = (id) => `icons/regions/${id}.png`;

// Overload/Elder Overload potions grant a flat virtual Defence level boost -
// same figures and mutual-exclusivity as GearStatsSummary's own
// OVERLOAD_DEFENCE_BONUS_BY_MODE (the real Gear Planner's equivalent
// toggle), kept as a local copy since the two pickers are free to diverge.
const OVERLOAD_DEFENCE_BONUS_BY_MODE = { none: 0, overload: 17, elder: 25 };

// Same list/labels/logic as GearPage.jsx's own SORT_OPTIONS/NO_LEVEL_SLOTS -
// a local copy rather than a shared export since the two pickers are free to
// diverge.
const SORT_OPTIONS = [
  { id: 'level', label: 'Level' },
  { id: 'damage', label: 'Dmg' },
  { id: 'accuracy', label: 'Acc' },
  { id: 'armour', label: 'Tank (Arm)' },
  { id: 'lifeBonus', label: 'Tank (LP)' },
  { id: 'prayerBonus', label: 'Prayer' },
];
const NO_LEVEL_SLOTS = new Set(['neck', 'ring']);

function sortGearItems(items, sortBy, style) {
  return [...items].sort((a, b) => {
    const valueOf = (item) => {
      if (sortBy === 'level') return item.level?.level ?? 0;
      if (sortBy === 'armour') return getArmourRating(item, style);
      return item.stats?.[sortBy] ?? 0;
    };
    return valueOf(b) - valueOf(a);
  });
}
const ARCH_RELIC_CATEGORY_LABELS = { combat: 'Combat', skilling: 'Skilling', misc: 'Misc' };
const ARCH_RELIC_TABS = [...RELIC_CATEGORIES, 'all'];

// What a tier's heading should say. Rejuvenated widens exactly one tier to two
// slots, so "pick one" stops being true the moment it is taken - and once the
// bonus is spent, every OTHER tier goes back to saying "pick one". Derived from
// the same module the toggle enforces, so the two cannot drift apart.
function tierPickNote(tier, selectedRelics) {
  if (tier === 'unknown' || tier == null) return 'pick any number';
  return capForTier(selectedRelics, tier) > 1 ? 'pick up to two' : 'pick one';
}

function groupBlessingsByTier(blessings) {
  return BLESSING_TIERS.map((tier) => [
    tier,
    BLESSING_COLOURS.map((colour) => blessings.find((b) => b.tier === tier && b.colour === colour)).filter(Boolean),
  ]);
}

function groupRelicsByTier(relics) {
  const byTier = new Map();
  for (const relic of relics) {
    const key = relic.tier ?? 'unknown';
    if (!byTier.has(key)) byTier.set(key, []);
    byTier.get(key).push(relic);
  }
  return [...byTier.entries()].sort(([a], [b]) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return a - b;
  });
}

// The equipped-names seed for one stage's gear hook, when editing an
// existing build - blank for a brand new build/stage. Kept as plain
// functions (not hook-internal state) because useGearLoadout only ever
// reads its `initial*` props once, on mount.
function initialEquippedNamesForStage(build, stageIndex) {
  const stage = build?.stages?.[stageIndex];
  const names = emptyEquippedNames();
  if (!stage) return names;
  for (const [style, loadout] of Object.entries(stage.loadouts)) {
    names[style] = { ...loadout.slots };
  }
  return names;
}
function initialEofNamesForStage(build, stageIndex) {
  const stage = build?.stages?.[stageIndex];
  const names = emptyEofWeaponNames();
  if (!stage) return names;
  for (const [style, loadout] of Object.entries(stage.loadouts)) {
    names[style] = loadout.eof ?? null;
  }
  return names;
}

// A single style's equip grid + item picker, mirroring GearPage.jsx but
// trimmed down for authoring: no share buttons, no compact toggle - just
// search, sort and click-to-equip. Availability is computed against the
// REGIONS/RELICS THIS BUILD picked, not the visitor's own saved selection,
// so the picker greys out exactly what the finished card will show as locked.
function StyleLoadoutEditor({ style, gear, isUnlocked, selectedLeagueRelics, showArmour, overloadMode, onSelectOverloadMode }) {
  const [search, setSearch] = useState('');
  const [hideLocked, setHideLocked] = useState(true);
  const [sortBy, setSortBy] = useState('level');
  const equipped = gear.equipped;
  const activeSlot = gear.activeSlot;

  function isItemAvailable(item) {
    if (activeSlot === 'offhand' && gear.offhandBlocked) return false;
    if (activeSlot === 'eof') {
      if (gear.eofWeapon?.name === item.name) return true;
      return isGearItemAvailable(item, isUnlocked, { selectedLeagueRelics });
    }
    if (equipped[activeSlot]?.name === item.name) return true;
    return isGearItemAvailable(item, isUnlocked, { selectedLeagueRelics });
  }

  // Only offer sort tabs for stats this slot's items actually carry (e.g. no
  // "Acc" tab for a pure armour slot), same as GearPage.jsx's own
  // visibleSortOptions. Neck and ring are a deliberate special case: most
  // items in those slots have no level requirement at all and no armour/
  // accuracy spread, so Level/Acc/Tank sorting does nothing useful there.
  const visibleSortOptions = useMemo(() => {
    if (activeSlot === 'eof') return [];
    if (NO_LEVEL_SLOTS.has(activeSlot)) {
      // Damage AND prayer: unlike level/accuracy/armour/LP, prayer bonus really
      // does spread these out - most neck items carry one, and picking a neck
      // slot for its prayer bonus is a normal thing to be doing.
      return SORT_OPTIONS.filter((opt) => opt.id === 'damage' || opt.id === 'prayerBonus');
    }
    const slotItems = GEAR[style]?.[activeSlot] ?? [];
    const hasAccuracy = slotItems.some((item) => item.stats?.accuracy);
    const hasArmour = slotItems.some((item) => getArmourRating(item, style));
    const hasLifeBonus = slotItems.some((item) => item.stats?.lifeBonus);
    const hasPrayerBonus = slotItems.some((item) => item.stats?.prayerBonus);
    return SORT_OPTIONS.filter((opt) => {
      if (opt.id === 'accuracy') return hasAccuracy;
      if (opt.id === 'armour') return hasArmour;
      if (opt.id === 'lifeBonus') return hasLifeBonus;
      if (opt.id === 'prayerBonus') return hasPrayerBonus;
      return true;
    });
  }, [style, activeSlot]);

  useEffect(() => {
    if (visibleSortOptions.some((opt) => opt.id === sortBy)) return;
    setSortBy(NO_LEVEL_SLOTS.has(activeSlot) ? 'damage' : 'level');
  }, [visibleSortOptions, sortBy, activeSlot]);

  const items =
    activeSlot === 'eof'
      ? (GEAR[style]?.weapon ?? []).filter((item) => item.specialAttack)
      : GEAR[style]?.[activeSlot] ?? [];
  const query = search.trim().toLowerCase();
  const matched = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;
  // Available items always sort ahead of locked ones, same convention as the
  // real Gear Planner - and hiding locked ones entirely is the default here,
  // since a build author is usually only interested in what their own
  // regions/relics picks actually unlock.
  const available = matched.filter((item) => isItemAvailable(item));
  const locked = hideLocked ? [] : matched.filter((item) => !isItemAvailable(item));
  const displayItems = [...sortGearItems(available, sortBy, style), ...sortGearItems(locked, sortBy, style)];

  return (
    <div className="create-build-loadout-editor">
      <div className="create-build-equip-column">
      <div className="equip-grid" style={{ gridTemplateAreas: SLOT_GRID_AREAS }}>
        {gear.eofVisible && (
          <EquipmentSlot
            slotId="eof"
            label="EOF"
            item={gear.eofWeapon}
            isActive={activeSlot === 'eof'}
            onSelect={gear.selectSlot}
            onUnequip={gear.unequipSlot}
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
            onSelect={gear.selectSlot}
            onUnequip={gear.unequipSlot}
            disabled={slotId === 'offhand' && gear.offhandBlocked}
            isUnlocked={isUnlocked}
            style={style}
            selectedLeagueRelics={selectedLeagueRelics}
          />
        ))}
      </div>
      {showArmour && (
        <div className="create-build-overload-row">
          <button
            type="button"
            className={`create-build-overload-button${overloadMode === 'overload' ? ' active' : ''}`}
            onClick={() => onSelectOverloadMode('overload')}
            aria-pressed={overloadMode === 'overload'}
            title="Overload potions add 17 Defence levels to Total armour"
          >
            Overload
          </button>
          <button
            type="button"
            className={`create-build-overload-button${overloadMode === 'elder' ? ' active' : ''}`}
            onClick={() => onSelectOverloadMode('elder')}
            aria-pressed={overloadMode === 'elder'}
            title="Elder Overload potions add 25 Defence levels to Total armour"
          >
            Elder Overload
          </button>
        </div>
      )}
      </div>

      <div className="create-build-item-list">
        <input
          type="search"
          className="gear-search"
          placeholder={`Search ${activeSlot === 'eof' ? 'EOF weapons' : SLOT_LABELS[activeSlot]?.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={activeSlot === 'offhand' && gear.offhandBlocked}
        />
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
            <input type="checkbox" checked={hideLocked} onChange={(e) => setHideLocked(e.target.checked)} />
            <span>Hide locked</span>
          </label>
        </div>
        <div className="gear-item-list-scroll">
          {displayItems.length > 0 ? (
            <div className="gear-item-rows compact">
              {displayItems.map((item) => (
                <GearItemRow
                  key={item.name}
                  item={item}
                  style={style}
                  equipped={activeSlot === 'eof' ? gear.eofWeapon?.name === item.name : equipped[activeSlot]?.name === item.name}
                  available={isItemAvailable(item)}
                  isUnlocked={isUnlocked}
                  selectedLeagueRelics={selectedLeagueRelics}
                  onToggle={activeSlot === 'eof' ? gear.toggleEofWeapon : gear.toggleItem}
                  showSpecialAttack={activeSlot === 'eof'}
                  compact
                />
              ))}
            </div>
          ) : (
            <p className="gear-empty">No items for this slot.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// One stage's worth of per-style loadout editors (the "Stage N" block),
// bound to its own useGearLoadout instance so two stages never share state.
function StageEditor({
  index,
  label,
  onLabelChange,
  onRemove,
  activeStyles,
  gear,
  isUnlocked,
  selectedLeagueRelics,
  blessings,
  archRelics,
  leagueRelics,
  extras,
  elderSources,
  thumbnailPick,
  onPickThumbnail,
}) {
  // Armour is only meaningful to show once a blessing that actually reads its
  // value is picked - otherwise the number is just noise (see
  // utils/gearStats.js's ARMOUR_SCALING_BLESSINGS). Blessings are build-wide,
  // not per-style/stage, so this is the same check for every block below.
  // The health/prayer equivalents live in LoadoutStatNote, which gates its own
  // lines the same way.
  const showArmour = blessings.some((name) => ARMOUR_SCALING_BLESSINGS.has(name));
  // Teragard's Aegis is one of the armour-scaling blessings, but unlike the
  // others it has a stateable number of its own, so it gets its own check.
  const showAegis = blessings.includes("Teragard's Aegis");
  // Per-style, not per-stage-wide - each style has its own equipped items and
  // its own Total armour line, so its own potion choice. Clicking the
  // already-active mode turns it off; clicking the other one switches
  // straight to it (never both at once), same convention as
  // GearStatsSummary's selectOverloadMode.
  const [overloadModeByStyle, setOverloadModeByStyle] = useState({});
  function selectOverloadMode(style, mode) {
    setOverloadModeByStyle((prev) => ({ ...prev, [style]: prev[style] === mode ? 'none' : mode }));
  }
  return (
    <div className="create-build-stage-block">
      <div className="create-build-stage-head">
        <input
          type="text"
          className="create-build-stage-label"
          value={label}
          maxLength={MAX_LENGTHS.stageLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={`Stage ${index + 1} name, e.g. "Mid game" or "BIS"`}
        />
        {onRemove && (
          <button type="button" className="create-build-remove-stage" onClick={onRemove}>
            Remove this stage
          </button>
        )}
      </div>
      {[...activeStyles].map((style) => {
        const names = gear.equippedNamesByStyle[style] ?? {};
        const equipped = {};
        for (const [slot, itemName] of Object.entries(names)) {
          const item = GEAR[style]?.[slot]?.find((i) => i.name === itemName);
          if (item) equipped[slot] = item;
        }
        const overloadMode = overloadModeByStyle[style] ?? 'none';
        // The armour/health/blessing figures all moved into LoadoutStatNote,
        // which derives them from the same picks - see that file. What is left
        // here is what the effects panel below needs.
        const aegis = showAegis
          ? getAegisBreakdown({
              equipped,
              style,
              weaponName: names.weapon,
              offhandName: names.offhand,
              hasElder: elderSources.length > 0,
            })
          : null;
        return (
          <div key={style} className="create-build-style-block">
            <div className="create-build-style-block-head">
              <h3>{STYLE_LABELS[style]}</h3>
            </div>
            {/* Shared with My Build - see components/LoadoutStatNote.jsx. */}
            <LoadoutStatNote
              style={style}
              slots={names}
              equipped={equipped}
              blessings={blessings}
              leagueRelics={leagueRelics}
              archRelics={archRelics}
              extras={extras}
              elderSources={elderSources}
            />
            {/* A share thumbnail renders ONE loadout, so this is really a radio
                group spread across every stage and style - ticking any box
                unticks whichever was ticked before, even in the other stage.
                It stays a checkbox because "none of them" is a valid state
                (the server then picks the default), which a radio group has no
                way to express. */}
            <label className="create-build-thumbnail-toggle">
              <input
                type="checkbox"
                checked={thumbnailPick?.stage === index && thumbnailPick?.style === style}
                onChange={() => onPickThumbnail(index, style)}
              />
              <span>Use this gear loadout for thumbnail</span>
            </label>
            {gear.style === style ? (
              <StyleLoadoutEditor
                style={style}
                gear={gear}
                isUnlocked={isUnlocked}
                selectedLeagueRelics={selectedLeagueRelics}
                showArmour={showArmour}
                overloadMode={overloadMode}
                onSelectOverloadMode={(mode) => selectOverloadMode(style, mode)}
              />
            ) : (
              <button type="button" className="create-build-edit-style-button" onClick={() => gear.setStyle(style)}>
                Edit {STYLE_LABELS[style]} loadout
              </button>
            )}
            {/* The same panel build guides show, so the creator sees what the
                build is worth while building it rather than after publishing.
                It reads the loadout directly above it - hence the caption, since
                a build with two stages and three styles has several. */}
            <LeaguesEffectsPanel
              style={style}
              slots={names}
              blessings={blessings}
              leagueRelics={leagueRelics}
              archRelics={archRelics}
              extras={extras}
              armour={
                // Same gate as the totals line above - armour is only worth
                // stating once a blessing reads its value. The potion buttons
                // stay either way, since they move ability damage regardless.
                showArmour
                  ? {
                      none: getTotalArmour(equipped, style, 99),
                      overload: getTotalArmour(equipped, style, 99 + OVERLOAD_DEFENCE_BONUS_BY_MODE.overload),
                      elder:
                        elderSources.length > 0
                          ? getTotalArmour(equipped, style, 99 + OVERLOAD_DEFENCE_BONUS_BY_MODE.elder)
                          : null,
                    }
                  : null
              }
              aegis={
                aegis && {
                  multiplier: aegis.multiplier,
                  source: aegis.source,
                  none: aegis.base,
                  overload: aegis.overloaded,
                  elder: aegis.elder,
                }
              }
              elderSources={elderSources}
              caption={`Effects of the ${STYLE_LABELS[style]} gear loadout above, in ${label.trim() || `Stage ${index + 1}`}.`}
            />
          </div>
        );
      })}
    </div>
  );
}

// `editing`, when present, is `{ id, build, ...credential }` where `build` is
// the sanitized existing build and the credential is either `{ token }` (the
// author's own, from localStorage) or `{ asAdmin: true }` (the admin session
// cookie). Switches the page into "Edit build" mode: every field seeds from
// the existing build instead of blank, and submitting calls updateUserBuild /
// adminUpdateUserBuild instead of createUserBuild. See pages/EditBuildPage.jsx,
// which works out which credential applies and passes this prop.
//
// `copyFrom`, when present (and `editing` is not), is just a sanitized build
// to seed every field from - same shape as `editing.build`. Unlike `editing`,
// nothing downstream keys off it: submitting still goes through the
// `createUserBuild` branch below, so a copy always becomes a brand new build
// with its own id, edit token and password, never an update to the build it
// was copied from. See pages/CopyBuildPage.jsx, which resolves
// "#create-build-from/<id>" into this prop.
// `fromMyBuild` only changes the wording: a seed from My Build has no source
// build to name, and nothing to suffix "- copy" onto.
export default function CreateBuildPage({ onSubmitted, editing, copyFrom, fromMyBuild = false }) {
  const build = editing?.build ?? copyFrom;
  // Copying (not editing) seeds the name field with a "- copy" suffix rather
  // than the exact original - the two builds are about to coexist publicly,
  // and an unedited duplicate title would read as if the original had been
  // moved rather than cloned. Truncated to leave room for the suffix rather
  // than dropped when the original name is already at MAX_LENGTHS.name.
  const initialName = copyFrom && !editing && copyFrom.name
    ? `${copyFrom.name.slice(0, MAX_LENGTHS.name - ' - copy'.length)} - copy`
    : build?.name ?? '';
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(build?.tagline ?? '');
  const [authorName, setAuthorName] = useState(build?.authorName ?? '');
  const [difficultyLabel, setDifficultyLabel] = useState(build?.difficultyLabel ?? '');
  const [difficultyNote, setDifficultyNote] = useState(build?.difficultyNote ?? '');
  const [activeStyles, setActiveStyles] = useState(() => new Set(build?.styles ?? ['melee']));
  const [whyItsGood, setWhyItsGood] = useState(build?.whyItsGood ?? '');
  const [howToPlay, setHowToPlay] = useState(build?.howToPlay ?? '');
  const [tradeoffs, setTradeoffs] = useState(() => (build?.tradeoffs?.length ? build.tradeoffs : ['']));
  const [regionReasons, setRegionReasons] = useState(() => build?.regionReasons ?? {});
  const [relicReasons, setRelicReasons] = useState(() => build?.relicReasons ?? {});
  const [archRelicReasons, setArchRelicReasons] = useState(() => build?.archRelicReasons ?? {});
  const [archRelicSearch, setArchRelicSearch] = useState('');
  const [archRelicTab, setArchRelicTab] = useState('all');
  const [archRelicHideLocked, setArchRelicHideLocked] = useState(true);
  const [archRelicIgnoreArtefactRegions, setArchRelicIgnoreArtefactRegions] = useState(false);
  const [stageLabels, setStageLabels] = useState(() => (build?.stages?.length ? build.stages.map((s) => s.label) : ['Stage 1']));
  const [stageCount, setStageCount] = useState(() => build?.stages?.length ?? 1);
  // Which single gear loadout the share thumbnail should render, as
  // { stage, style } against the ON-SCREEN stage blocks. At most one across
  // every stage and style - a thumbnail shows one loadout, so this behaves like
  // a radio group spread over several blocks rather than independent
  // checkboxes. Null = let the server pick the default.
  //
  // Seeds straight from the saved build when editing: the payload's stage
  // indexes and the editor's line up on load, because every saved stage is by
  // definition one that survived the drop-empty-stages rule.
  const [thumbnailPick, setThumbnailPick] = useState(() => build?.thumbnail ?? null);
  const [status, setStatus] = useState('idle'); // idle | working | error
  const [error, setError] = useState(null);

  const regionSelection = useRegionSelection({
    persist: false,
    initialSelection: build?.regions ?? [],
    // Karamja (the one GATEWAY_REGIONS entry) defaults ON, same as a brand
    // new visitor gets - almost no build is meant to assume it's off.
    initialGatewaySelection: [...GATEWAY_REGIONS],
  });
  // Kept as raw names rather than pruned on every region change: unticking a
  // region by accident and re-ticking it should not silently lose the pick.
  // sanitizeUserBuildPayload drops anything the final regions cannot reach, and
  // `offeredExtras` below is what decides what is on screen, so an
  // out-of-reach name can never be submitted or displayed.
  const [extras, setExtras] = useState(() => build?.extras ?? []);
  const toggleExtra = (name) =>
    setExtras((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  // What the build actually HAS right now - raw ticks intersected with what the
  // current regions reach. Everything downstream reads this rather than
  // `extras`, so untick Anachronia and the totem stops counting towards health
  // the same instant its tickbox disappears. Re-tick the region and it is back,
  // still ticked, because the raw state above never lost it.
  const activeExtras = useMemo(
    () => activeBuildExtras(extras, regionSelection.selected),
    [extras, regionSelection.selected],
  );

  const relicSelection = useLeagueRelicSelection({ persist: false, initialSelection: build?.relics ?? [] });
  const archRelicSelection = useRelicSelection({ persist: false, initialSelection: build?.archRelics ?? [] });
  const blessingSelection = useBlessingSelection({ persist: false, initialSelection: build?.blessings ?? [] });

  // Two independent loadout hooks, always both instantiated (React hooks
  // can't be called conditionally/in a loop) - `stageCount` decides how many
  // of them actually get rendered/submitted. Each seeds from the matching
  // stage of the build being edited, or blank for a new build.
  const initialDefaultStyle = build?.styles?.[0] ?? 'melee';
  const gearStage0 = useGearLoadout({
    persist: false,
    initialEquippedNames: initialEquippedNamesForStage(build, 0),
    initialEofWeaponNames: initialEofNamesForStage(build, 0),
    initialDefaultStyle,
  });
  const gearStage1 = useGearLoadout({
    persist: false,
    initialEquippedNames: initialEquippedNamesForStage(build, 1),
    initialEofWeaponNames: initialEofNamesForStage(build, 1),
    initialDefaultStyle,
  });
  const gearStages = [gearStage0, gearStage1];

  // Whether this build can brew an elder overload at all - Tirannwn or the
  // Divine Druid relic. Decides whether the Aegis line quotes an elder figure
  // or stops at overloaded.
  const elderSources = getElderOverloadSources({
    leagueRelics: relicSelection.selected,
    regions: regionSelection.selected,
  });

  const relicTierGroups = useMemo(() => groupRelicsByTier(LEAGUE_RELICS), []);
  const blessingTierGroups = useMemo(() => groupBlessingsByTier(BLESSINGS), []);
  const selectedBlessingObjects = useMemo(
    () => blessingSelection.selected.map((n) => BLESSINGS.find((b) => b.name === n)).filter(Boolean),
    [blessingSelection.selected],
  );

  // Antiquarian's own effect text is "All Archaeology relics are available
  // to use after completing the Archaeology tutorial" - a second,
  // region-independent unlock path (same pattern as RelicsPage/MyBuildPage).
  const hasAntiquarian = relicSelection.selected.includes('Antiquarian');

  function isArchRelicAvailable(relic) {
    return (
      isGearItemAvailable(relic, regionSelection.isUnlocked, {
        ignoreArtefactRegions: archRelicIgnoreArtefactRegions,
      }) || hasAntiquarian
    );
  }
  // Picked relics stay pinned to the top (same convention as RelicsPage) and
  // are never hidden by the locked filter - unpicking your own already-taken
  // relic has to stay possible even if a region change locked it again.
  const archRelicsToShow = useMemo(() => {
    const categoryFiltered = archRelicTab === 'all' ? RELICS : RELICS.filter((r) => r.category === archRelicTab);
    const query = archRelicSearch.trim().toLowerCase();
    const searched = query
      ? categoryFiltered.filter((r) => r.name.toLowerCase().includes(query) || r.relicName.toLowerCase().includes(query))
      : categoryFiltered;
    const picked = archRelicSelection.selected.map((n) => searched.find((r) => r.name === n)).filter(Boolean);
    const rest = searched.filter((r) => !archRelicSelection.selected.includes(r.name));
    const available = rest.filter((r) => isArchRelicAvailable(r));
    const locked = archRelicHideLocked ? [] : rest.filter((r) => !isArchRelicAvailable(r));
    return [...picked, ...available, ...locked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    archRelicTab,
    archRelicSearch,
    archRelicHideLocked,
    archRelicIgnoreArtefactRegions,
    archRelicSelection.selected,
    regionSelection.isUnlocked,
    hasAntiquarian,
  ]);

  function toggleActiveStyle(styleId) {
    setActiveStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleId)) next.delete(styleId);
      else next.add(styleId);
      return next;
    });
  }

  function setTradeoff(index, value) {
    setTradeoffs((prev) => prev.map((t, i) => (i === index ? value : t)));
  }
  function addTradeoff() {
    setTradeoffs((prev) => (prev.length >= MAX_TRADEOFFS ? prev : [...prev, '']));
  }
  function removeTradeoff(index) {
    setTradeoffs((prev) => prev.filter((_, i) => i !== index));
  }

  function addStage() {
    setStageCount(2);
    setStageLabels((prev) => (prev.length > 1 ? prev : [...prev, 'Stage 2']));
  }
  function removeStage() {
    setStageCount(1);
  }
  function setStageLabel(index, value) {
    setStageLabels((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  // Ticking any thumbnail box replaces whatever was ticked before, anywhere in
  // the form; ticking the one that is already on clears it back to "no pick".
  function pickThumbnail(stage, style) {
    setThumbnailPick((prev) => (prev?.stage === stage && prev?.style === style ? null : { stage, style }));
  }

  // Builds the `stages` array actually worth submitting - a stage with no
  // gear equipped in any active style is dropped, same rule
  // sanitizeUserBuildPayload applies on the way back out.
  function buildStagesPayload() {
    const stages = [];
    for (let i = 0; i < stageCount; i += 1) {
      const gear = gearStages[i];
      const loadouts = {};
      for (const style of activeStyles) {
        const slots = gear.equippedNamesByStyle[style] ?? {};
        if (Object.keys(slots).length === 0) continue;
        loadouts[style] = { slots, eof: gear.eofWeaponNamesByStyle[style] ?? null };
      }
      if (Object.keys(loadouts).length > 0) {
        // `editorIndex` is which Stage block on screen this came from, kept
        // only so the thumbnail pick can be translated (see resolveThumbnail).
        // Dropping an empty stage shifts every later index, so "stage 1 in the
        // editor" and "stage 1 in the payload" are not the same thing. Stripped
        // before submitting.
        stages.push({ label: stageLabels[i]?.trim() || `Stage ${i + 1}`, loadouts, editorIndex: i });
      }
    }
    return stages;
  }

  // The thumbnail pick is stored against the on-screen stage; the payload
  // stores it against the submitted stage. Returns null if the picked loadout
  // did not survive - the author emptied it, or unticked its combat style -
  // which puts the image back on its default (first stage, first style).
  function resolveThumbnail(previewStages) {
    if (!thumbnailPick) return null;
    const index = previewStages.findIndex((s) => s.editorIndex === thumbnailPick.stage);
    if (index < 0 || !previewStages[index].loadouts[thumbnailPick.style]) return null;
    return { stage: index, style: thumbnailPick.style };
  }

  const stagesPreview = buildStagesPayload();
  const stylesWithGear = [...activeStyles].filter((style) => stagesPreview.some((stage) => stage.loadouts[style]));
  const canSubmit = name.trim().length > 0 && stagesPreview.length > 0 && status !== 'working';

  // Only a brand-new publish asks for confirmation - `editing` is "Save
  // changes" on a build that's already live, a much lower-stakes action the
  // author can already see and undo, whereas publishing creates a new public
  // page from data typed over several minutes with no going back to check it
  // first.
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  // The same confirmation step also collects the build's one-time edit
  // password (see setUserBuildPassword call in submitBuild below) - every
  // build gets one, so "Yes" stays disabled until either a password is
  // typed or the opt-out box is ticked (which uses the edit token itself as
  // the password - see submitBuild).
  const [publishPassword, setPublishPassword] = useState('');
  const [publishNoPassword, setPublishNoPassword] = useState(false);
  const MIN_BUILD_PASSWORD_LENGTH = 4;
  const canConfirmPublish = publishNoPassword || publishPassword.trim().length >= MIN_BUILD_PASSWORD_LENGTH;

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    if (!editing) {
      setShowPublishConfirm(true);
      return;
    }
    submitBuild();
  }

  async function submitBuild() {
    setShowPublishConfirm(false);
    setStatus('working');
    setError(null);

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      authorName: authorName.trim(),
      difficultyLabel: difficultyLabel.trim(),
      difficultyNote: difficultyNote.trim(),
      styles: stylesWithGear,
      blessings: blessingSelection.selected,
      relics: relicSelection.selected,
      relicReasons,
      archRelics: archRelicSelection.selected,
      archRelicReasons,
      regions: regionSelection.selected,
      regionReasons,
      extras: activeExtras,
      whyItsGood: whyItsGood.trim(),
      howToPlay: howToPlay.trim(),
      tradeoffs: tradeoffs.filter((t) => t.trim()),
      // Listed explicitly rather than spread, so buildStagesPayload's
      // authoring-only `editorIndex` never reaches the stored payload.
      stages: stagesPreview.map((stage) => ({ label: stage.label, loadouts: stage.loadouts })),
      // Which single loadout the share thumbnail renders. Null means "decide
      // for me": the server falls back to the first stage's first style, which
      // is also what the card itself opens on.
      thumbnail: resolveThumbnail(stagesPreview),
    };

    try {
      if (editing) {
        const fields = {
          name: payload.name,
          tagline: payload.tagline,
          authorName: payload.authorName,
          styles: payload.styles,
          payload,
        };
        // Two genuinely different endpoints, not one with a flag: the author's
        // edit proves itself with the token this browser stored at creation,
        // an admin's proves itself with the session cookie and carries no
        // token at all. EditBuildPage decides which applies.
        if (editing.asAdmin) await adminUpdateUserBuild(editing.id, fields);
        else await updateUserBuild(editing.id, editing.token, fields);
        setStatus('idle');
        onSubmitted(editing.id);
      } else {
        const { id, token } = await createUserBuild({
          name: payload.name,
          tagline: payload.tagline,
          authorName: payload.authorName,
          styles: payload.styles,
          payload,
        });
        saveMyBuildToken(id, token);
        // The opt-out box submits the edit token itself as the password -
        // impractical to type back in by hand, but it guarantees
        // edit_password_hash is always populated (see 018_user_build_
        // password.sql) without forcing a real password on an author who
        // doesn't want one. Best-effort: the build is already live and the
        // token already works for editing regardless of whether this
        // succeeds, so a failure here must not surface as a publish failure.
        try {
          await setUserBuildPassword(id, token, publishNoPassword ? token : publishPassword.trim());
        } catch (err) {
          console.error('set build password failed:', err);
        }
        setStatus('idle');
        onSubmitted(id);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not submit this build. Try again.');
      // A failed publish is the one error here that costs the visitor real
      // work, and nobody stops to write a bug report at that moment - so file
      // one for them. Shape only, never their content. See utils/autoReport.js.
      reportPublishFailure({
        action: editing ? (editing.asAdmin ? 'Edit build (admin)' : 'Edit build') : 'Publish build',
        error: err,
        reason: err.reason,
        context: {
          'HTTP status': err.status,
          Styles: payload.styles.join(', '),
          'Payload size': `${JSON.stringify(payload).length} bytes`,
          Stages: Object.keys(payload.stages ?? {}).join(', '),
          Regions: payload.regions.length,
          Blessings: payload.blessings.length,
          'League relics': payload.relics.length,
          'Arch relics': payload.archRelics.length,
        },
      });
    }
  }

  return (
    <>
      <header>
        <h1>{editing ? (editing.asAdmin ? 'Edit this build' : 'Edit your build') : 'Create a build'}</h1>
        <p>
          {editing
            ? editing.asAdmin
              ? "Editing someone else's build as an admin. Their edit token still works afterwards - this changes the build, not who owns it."
              : "Update your build's gear, relics, regions, stages or write-up."
            : "Design your own build guide - pick the gear, league relics, regions and blessings, then write up why it works. It'll appear on the"}
          {!editing && (
            <>
              {' '}
              <a href="#user-builds" className="notice-link">
                User made builds
              </a>{' '}
              page for everyone to see.
            </>
          )}
        </p>
        {!editing && copyFrom && fromMyBuild && (
          <p className="create-build-copy-note">
            Pre-filled from <a href="#my-build" className="notice-link">My Build</a> - give it a name and a
            write-up, and review everything before publishing. Changes here are a draft of a guide and do not
            touch your own saved setup.
          </p>
        )}
        {!editing && copyFrom && !fromMyBuild && (
          <p className="create-build-copy-note">
            Pre-filled by copying &ldquo;{copyFrom.name}&rdquo; - review everything before publishing. This will
            create a brand new build with its own id, edit link and password, not change the one it was copied from.
          </p>
        )}
      </header>

      <form className="create-build-page" onSubmit={handleSubmit}>
        <section className="create-build-section">
          <h2>Basics</h2>
          <label className="create-build-field">
            <span>Build name*</span>
            <input
              type="text"
              value={name}
              maxLength={MAX_LENGTHS.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Iron Vanguard"
              required
            />
          </label>
          <label className="create-build-field">
            <span>Tagline</span>
            <input
              type="text"
              value={tagline}
              maxLength={MAX_LENGTHS.tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line describing what the build does"
            />
          </label>
          <label className="create-build-field">
            <span>Your name (optional)</span>
            <input
              type="text"
              value={authorName}
              maxLength={MAX_LENGTHS.authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Anonymous"
            />
          </label>
          <div className="create-build-field-row">
            <label className="create-build-field">
              <span>Difficulty label</span>
              <input
                type="text"
                value={difficultyLabel}
                maxLength={MAX_LENGTHS.difficultyLabel}
                onChange={(e) => setDifficultyLabel(e.target.value)}
                placeholder="e.g. Easy"
              />
            </label>
            <label className="create-build-field create-build-field-wide">
              <span>Difficulty tooltip - shown when a reader hovers the label</span>
              <input
                type="text"
                value={difficultyNote}
                maxLength={MAX_LENGTHS.difficultyNote}
                onChange={(e) => setDifficultyNote(e.target.value)}
                placeholder="e.g. Short rotation, minimal buff upkeep"
              />
            </label>
          </div>
          <div className="create-build-field">
            <span>Combat styles this build covers*</span>
            <div className="create-build-style-toggles">
              {COMBAT_STYLES.map((s) => (
                <label key={s} className="create-build-style-toggle">
                  <input type="checkbox" checked={activeStyles.has(s)} onChange={() => toggleActiveStyle(s)} />
                  <span>{STYLE_LABELS[s]}</span>
                </label>
              ))}
            </div>
            <p className="create-build-hint">
              Only styles with gear actually equipped below will be included in the submitted build.
            </p>
          </div>
        </section>

        <section className="create-build-section">
          <h2>Regions</h2>
          <p className="create-build-hint">Pick up to 3 optional regions - click the map to toggle.</p>
          <RegionMap isUnlocked={regionSelection.isUnlocked} toggleRegion={regionSelection.toggleRegion} />
          {regionSelection.overLimit && (
            <p className="create-build-warning">You've picked more than 3 optional regions.</p>
          )}
          <ul className="create-build-pick-reasons">
            {regionSelection.selected.map((id) => (
              <li key={id} className="create-build-pick-reason">
                <span className="create-build-pick-reason-head">
                  <RetryImage src={regionIcon(id)} alt="" className="create-build-pick-reason-icon" />
                  {REGIONS[id]?.name ?? id}
                </span>
                <input
                  type="text"
                  value={regionReasons[id] ?? ''}
                  maxLength={MAX_LENGTHS.reason}
                  onChange={(e) => setRegionReasons((prev) => ({ ...prev, [id]: e.target.value }))}
                  placeholder="Why this region?"
                />
              </li>
            ))}
          </ul>

          <BuildExtrasPicker
            regions={regionSelection.selected}
            selected={extras}
            onToggle={toggleExtra}
            hint="Unlocked by the regions above, and counted into this build's totals if taken."
          />
        </section>

        <section className="create-build-section">
          <h2>League relics</h2>
          {relicTierGroups.map(([tier, relics]) => (
            <div key={tier} className="create-build-relic-tier">
              <h3>
                {tier === 'unknown' ? 'Unknown tier' : `Tier ${tier}`} -{' '}
                {tierPickNote(tier, relicSelection.selected)}
              </h3>
              <div className="gear-item-rows compact">
                {relics.map((relic) => (
                  <LeagueRelicRow
                    key={relic.name}
                    relic={relic}
                    selected={relicSelection.selected.includes(relic.name)}
                    onToggleSelect={relicSelection.toggleLeagueRelic}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
          <ul className="create-build-pick-reasons">
            {relicSelection.selected.map((name2) => (
              <li key={name2} className="create-build-pick-reason">
                <span className="create-build-pick-reason-head">{name2}</span>
                <input
                  type="text"
                  value={relicReasons[name2] ?? ''}
                  maxLength={MAX_LENGTHS.reason}
                  onChange={(e) => setRelicReasons((prev) => ({ ...prev, [name2]: e.target.value }))}
                  placeholder="Why this relic?"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="create-build-section">
          <h2>Arch relics</h2>
          <p className="create-build-hint">
            Archaeology relic powers - pick up to {MAX_RELICS}, greyed out until the regions you picked above
            unlock them.
          </p>
          <div className="abilities-controls">
            <div className="style-tabs" role="tablist">
              {ARCH_RELIC_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={archRelicTab === tab}
                  className={`style-tab${archRelicTab === tab ? ' active' : ''}`}
                  onClick={() => setArchRelicTab(tab)}
                >
                  {tab === 'all' ? 'All' : ARCH_RELIC_CATEGORY_LABELS[tab]}
                </button>
              ))}
            </div>
            <div className="abilities-toggles">
              <label className="hide-locked-toggle">
                <input
                  type="checkbox"
                  checked={archRelicHideLocked}
                  onChange={(e) => setArchRelicHideLocked(e.target.checked)}
                />
                <span>Hide locked</span>
              </label>
              <label
                className="hide-locked-toggle"
                title="Archaeology materials can be gathered remotely via Research, without visiting the dig site itself - treats 'Artefacts: X' tags as satisfied. Quest steps, boss drops, on-site interactions and hand-ins to NPCs who aren't collectors still gate as normal."
              >
                <input
                  type="checkbox"
                  checked={archRelicIgnoreArtefactRegions}
                  onChange={(e) => setArchRelicIgnoreArtefactRegions(e.target.checked)}
                />
                <span>Artefacts are not region-locked</span>
              </label>
            </div>
          </div>
          <input
            type="search"
            className="gear-search"
            placeholder="Search Arch relics…"
            value={archRelicSearch}
            onChange={(e) => setArchRelicSearch(e.target.value)}
          />
          <p className="create-build-hint">
            {archRelicSelection.selected.length}/{MAX_RELICS} picked
          </p>
          <div className="gear-item-rows compact">
            {archRelicsToShow.map((relic) => (
              <RelicRow
                key={relic.name}
                relic={relic}
                available={isArchRelicAvailable(relic)}
                isUnlocked={regionSelection.isUnlocked}
                selected={archRelicSelection.selected.includes(relic.name)}
                selectable={archRelicSelection.selected.length < MAX_RELICS}
                onToggleSelect={archRelicSelection.toggleRelic}
                hasAntiquarian={hasAntiquarian}
              />
            ))}
          </div>
          <ul className="create-build-pick-reasons">
            {archRelicSelection.selected.map((name2) => (
              <li key={name2} className="create-build-pick-reason">
                <span className="create-build-pick-reason-head">{name2}</span>
                <input
                  type="text"
                  value={archRelicReasons[name2] ?? ''}
                  maxLength={MAX_LENGTHS.reason}
                  onChange={(e) => setArchRelicReasons((prev) => ({ ...prev, [name2]: e.target.value }))}
                  placeholder="Why this relic?"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="create-build-section">
          <h2>Blessings</h2>
          <p className="create-build-hint">
            Optional - pick one blessing per tier and the God Tier One power is worked out automatically.
          </p>
          {blessingTierGroups.map(([tier, blessings]) => (
            <div key={tier} className="blessing-tier-group">
              <h3 className="blessing-tier-heading">Tier {tier}</h3>
              <div className="blessing-grid compact">
                {blessings.map((blessing) => (
                  <BlessingCard
                    key={blessing.name}
                    blessing={blessing}
                    selected={blessingSelection.selected.includes(blessing.name)}
                    onToggle={blessingSelection.toggleBlessing}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
          {selectedBlessingObjects.length > 0 && <BlessingGodPanel selectedBlessings={selectedBlessingObjects} />}
        </section>

        <section className="create-build-section">
          <h2>Gear loadout</h2>
          <p className="create-build-hint">
            Up to {MAX_STAGES} stages - e.g. "Mid game" and "BIS", or "Mid-late game" and "Late game". Readers can
            switch between them like the curated builds' tabs.
          </p>
          {activeStyles.size === 0 && <p className="create-build-warning">Tick at least one combat style above first.</p>}
          {Array.from({ length: stageCount }, (_, i) => (
            <StageEditor
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              index={i}
              label={stageLabels[i] ?? `Stage ${i + 1}`}
              onLabelChange={(value) => setStageLabel(i, value)}
              onRemove={stageCount > 1 && i === stageCount - 1 ? removeStage : null}
              activeStyles={activeStyles}
              gear={gearStages[i]}
              isUnlocked={regionSelection.isUnlocked}
              selectedLeagueRelics={relicSelection.selected}
              blessings={blessingSelection.selected}
              archRelics={archRelicSelection.selected}
              leagueRelics={relicSelection.selected}
              extras={activeExtras}
              elderSources={elderSources}
              thumbnailPick={thumbnailPick}
              onPickThumbnail={pickThumbnail}
            />
          ))}
          {stageCount < MAX_STAGES && (
            <button type="button" className="create-build-add-stage" onClick={addStage}>
              + Add a second stage
            </button>
          )}
        </section>

        <section className="create-build-section">
          <h2>Why it's good</h2>
          <textarea
            className="create-build-prose"
            value={whyItsGood}
            maxLength={MAX_LENGTHS.prose}
            onChange={(e) => setWhyItsGood(e.target.value)}
            placeholder="Explain the mechanics that make this build work…"
            rows={8}
          />
        </section>

        <section className="create-build-section">
          <h2>How to play it</h2>
          <textarea
            className="create-build-prose"
            value={howToPlay}
            maxLength={MAX_LENGTHS.prose}
            onChange={(e) => setHowToPlay(e.target.value)}
            placeholder="Walk through the rotation…"
            rows={8}
          />
        </section>

        <section className="create-build-section">
          <h2>Trade-offs</h2>
          <ul className="create-build-tradeoffs">
            {tradeoffs.map((text, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={index} className="create-build-tradeoff-row">
                <input
                  type="text"
                  value={text}
                  maxLength={MAX_LENGTHS.tradeoff}
                  onChange={(e) => setTradeoff(index, e.target.value)}
                  placeholder="What does this build give up?"
                />
                <button type="button" onClick={() => removeTradeoff(index)} aria-label="Remove trade-off">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {tradeoffs.length < MAX_TRADEOFFS && (
            <button type="button" className="create-build-add-tradeoff" onClick={addTradeoff}>
              + Add trade-off
            </button>
          )}
        </section>

        <div className="create-build-submit-row">
          {error && <p className="create-build-error">{error}</p>}
          <button type="submit" className="create-build-submit-button" disabled={!canSubmit}>
            {status === 'working' ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish build'}
          </button>
        </div>
      </form>
      {showPublishConfirm &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowPublishConfirm(false)}>
            <div className="modal-panel publish-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <p className="publish-confirm-message">Are you sure you want to publish your build?</p>

              <div className="publish-confirm-password">
                <p className="publish-confirm-password-label">
                  Set an edit password - you'll need this to edit this guide from a browser that doesn't already have
                  edit access. You cannot change it after being set.
                </p>
                <PasswordField
                  id="publish-password"
                  value={publishPassword}
                  onChange={(value) => {
                    setPublishPassword(value);
                    if (value) setPublishNoPassword(false);
                  }}
                  placeholder="Edit password"
                  disabled={publishNoPassword}
                />
                <label className="publish-confirm-no-password">
                  <input
                    type="checkbox"
                    checked={publishNoPassword}
                    onChange={(event) => {
                      setPublishNoPassword(event.target.checked);
                      if (event.target.checked) setPublishPassword('');
                    }}
                  />
                  <span>I don't want to set a password</span>
                </label>
              </div>

              <div className="publish-confirm-actions">
                <button type="button" className="publish-confirm-not-yet" onClick={() => setShowPublishConfirm(false)}>
                  Not Yet
                </button>
                <button type="button" className="publish-confirm-yes" onClick={submitBuild} disabled={!canConfirmPublish}>
                  Yes
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
