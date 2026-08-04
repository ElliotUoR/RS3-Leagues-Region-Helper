import { useMemo, useRef, useState } from 'react';
import RegionMap from '../components/RegionMap';
import LeagueRelicRow from '../components/LeagueRelicRow';
import RelicRow from '../components/RelicRow';
import BlessingCard from '../components/BlessingCard';
import BlessingGodPanel from '../components/BlessingGodPanel';
import GearLoadoutPlanner from '../components/GearLoadoutPlanner';
import LoadoutStatNote from '../components/LoadoutStatNote';
import LeaguesEffectsPanel from '../components/LeaguesEffectsPanel';
import BuildExtrasPicker from '../components/BuildExtrasPicker';
import ConfirmModal from '../components/ConfirmModal';
import { useBuildShare } from '../hooks/useBuildShare';
import { MAX_RELICS } from '../hooks/useRelicSelection';
import { BLESSINGS, BLESSING_COLOURS, BLESSING_TIERS } from '../data/blessings';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { RELICS, RELIC_CATEGORIES } from '../data/relics';
import { REGIONS } from '../data/regions';
import { isGearItemAvailable } from '../data/gearAvailability';
import { activeBuildExtras, availableBuildExtras } from '../data/buildExtras';
import { capForTier } from '../data/leagueRelicPicks';
import { blessingColourTally, blessingGradient, dominantBlessingColour } from '../utils/blessingTheme';
import { IS_PAGES_BUILD } from '../utils/deployTarget';
import {
  ARMOUR_SCALING_BLESSINGS,
  OVERLOAD_DEFENCE_BONUS,
  getAegisBreakdown,
  getElderOverloadSources,
  getTotalArmour,
} from '../utils/gearStats';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

const ARCH_RELIC_CATEGORY_LABELS = { combat: 'Combat', skilling: 'Skilling', misc: 'Misc' };
const ARCH_RELIC_TABS = [...RELIC_CATEGORIES, 'all'];

// Same cutoff the rest of the site treats as mobile (see .site-nav's breakpoint
// in index.css). The gear planner is by far the tallest thing on this page -
// style tabs, a twelve-slot grid, the stats panel and a full scrolling item
// list - so on a phone it buries the Leagues effects panel underneath a very
// long scroll. Collapsed by default there, open by default on desktop where
// there is room for both.
const MOBILE_BREAKPOINT_QUERY = '(max-width: 700px)';

function loadoutOpenByDefault() {
  if (typeof window === 'undefined') return true;
  try {
    return !window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
  } catch {
    return true;
  }
}

// My Build - your own setup on one page, assembled from the selections the
// rest of the site already saves.
//
// It owns NO state of its own beyond which section is open. Regions, league
// relics, Arch relics, blessings and gear all come from the same hooks App.jsx
// hands every other page, and every one of them persists - so editing here
// edits your real setup, and the Gear Planner, Regions map and relic pages all
// show the change immediately. That is deliberate: a copy would have made this
// a sixth place to keep in sync rather than a view onto the other five.
//
// The one thing that does NOT write back is publishing. "Import into Build
// Guide" hands Create a Build a snapshot, and edits there never reach these
// selections - see utils/myBuildSeed.js.

// What a tier's heading should say. Rejuvenated widens exactly one tier to two
// slots, so "pick one" stops being true the moment it is taken - and once the
// bonus is spent, every OTHER tier goes back to saying "pick one". Derived from
// the same module the toggle enforces, so the two cannot drift apart.
function tierPickNote(tier, selectedRelics) {
  if (tier === 'unknown' || tier == null) return 'pick any number';
  return capForTier(selectedRelics, tier) > 1 ? 'pick up to two' : 'pick one';
}

function groupBlessingsByTier() {
  return BLESSING_TIERS.map((tier) => [
    tier,
    BLESSING_COLOURS.map((colour) => BLESSINGS.find((b) => b.tier === tier && b.colour === colour)).filter(Boolean),
  ]);
}

function groupRelicsByTier() {
  const byTier = new Map();
  for (const relic of LEAGUE_RELICS) {
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

// Each pick section collapses, because all five expanded at once is a very long
// page and most visits change one thing. The summary line in the header is what
// makes a collapsed section still worth having - it answers "what have I got"
// without opening anything.
function BuildSection({ id, title, summary, count, open, onToggle, action = null, children }) {
  return (
    <section className={`my-build-section${open ? ' open' : ''}`}>
      {/* `action` sits BESIDE the head button, never inside it - a nested
          button is invalid HTML and browsers silently break click handling on
          it (same reason RelicDropTablePanel's toggle is a sibling of its row
          button). */}
      <div className="my-build-section-headrow">
        <button
          type="button"
          className="my-build-section-head"
          onClick={() => onToggle(id)}
          aria-expanded={open}
        >
          <span className="my-build-section-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <h2>{title}</h2>
          {count != null && <span className="my-build-section-count">{count}</span>}
          <span className="my-build-section-summary">{summary}</span>
        </button>
        {action}
      </div>
      {open && <div className="my-build-section-body">{children}</div>}
    </section>
  );
}

export default function MyBuildPage({
  isUnlocked,
  selected,
  gatewaySelected,
  toggleRegion,
  overLimit,
  clearRegions,
  selectedRelics,
  toggleRelic,
  clearRelics,
  selectedLeagueRelics,
  toggleLeagueRelic,
  clearLeagueRelics,
  selectedBlessings,
  toggleBlessing,
  clearBlessings,
  selectedExtras,
  toggleExtra,
  clearExtras,
  clearAllLoadouts,
  ...gear
}) {
  const [openSection, setOpenSection] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [archRelicSearch, setArchRelicSearch] = useState('');
  const [archRelicTab, setArchRelicTab] = useState('all');
  const [archRelicHideLocked, setArchRelicHideLocked] = useState(true);
  const [archRelicIgnoreArtefactRegions, setArchRelicIgnoreArtefactRegions] = useState(false);
  const [loadoutOpen, setLoadoutOpen] = useState(loadoutOpenByDefault);
  // Bumped by "See blessing effects" - the panel watches it and opens.
  const [effectsOpenSignal, setEffectsOpenSignal] = useState(0);
  const effectsRef = useRef(null);

  const toggleSection = (id) => setOpenSection((prev) => (prev === id ? null : id));

  const share = useBuildShare({
    payload: {
      regions: selected,
      gatewaySelected,
      equippedNamesByStyle: gear.equippedNamesByStyle,
      eofWeaponNamesByStyle: gear.eofWeaponNamesByStyle,
      relics: selectedRelics,
      leagueRelics: selectedLeagueRelics,
      blessings: selectedBlessings,
      defaultStyle: gear.defaultStyle,
    },
    setDefaultStyle: gear.setDefaultStyle,
  });

  const relicTierGroups = useMemo(groupRelicsByTier, []);
  const blessingTierGroups = useMemo(groupBlessingsByTier, []);
  const selectedBlessingObjects = useMemo(
    () => selectedBlessings.map((name) => BLESSINGS.find((b) => b.name === name)).filter(Boolean),
    [selectedBlessings],
  );

  // Antiquarian's own effect text is "All Archaeology relics are available
  // to use after completing the Archaeology tutorial" - a second,
  // region-independent unlock path (same pattern as RelicsPage/CreateBuildPage).
  const hasAntiquarian = selectedLeagueRelics.includes('Antiquarian');

  const isArchRelicAvailable = (relic) =>
    isGearItemAvailable(relic, isUnlocked, { ignoreArtefactRegions: archRelicIgnoreArtefactRegions }) ||
    hasAntiquarian;

  // Picked relics pin to the top and are never hidden by the locked filter -
  // unpicking your own already-taken relic has to stay possible even if a
  // region change locked it again. Same convention RelicsPage and the build
  // editor both use.
  const archRelicsToShow = useMemo(() => {
    const byCategory = archRelicTab === 'all' ? RELICS : RELICS.filter((r) => r.category === archRelicTab);
    const query = archRelicSearch.trim().toLowerCase();
    const searched = query
      ? byCategory.filter(
          (r) => r.name.toLowerCase().includes(query) || r.relicName.toLowerCase().includes(query),
        )
      : byCategory;
    const picked = selectedRelics.map((n) => searched.find((r) => r.name === n)).filter(Boolean);
    const rest = searched.filter((r) => !selectedRelics.includes(r.name));
    const available = rest.filter(isArchRelicAvailable);
    const locked = archRelicHideLocked ? [] : rest.filter((r) => !isArchRelicAvailable(r));
    return [...picked, ...available, ...locked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    archRelicTab,
    archRelicSearch,
    archRelicHideLocked,
    archRelicIgnoreArtefactRegions,
    selectedRelics,
    isUnlocked,
    hasAntiquarian,
  ]);

  const styleWithGear = Object.entries(gear.equippedNamesByStyle ?? {})
    .filter(([, slots]) => Object.keys(slots ?? {}).length > 0)
    .map(([style]) => style);

  // What the Extras are actually worth right now - raw picks intersected with
  // the regions currently held. See data/buildExtras.js.
  const extras = useMemo(() => activeBuildExtras(selectedExtras, selected), [selectedExtras, selected]);
  const extrasOffered = availableBuildExtras(selected).length > 0;

  // Everything below is for the style the planner is currently showing.
  const activeSlots = gear.equippedNamesByStyle?.[gear.style] ?? {};
  const hasGearForStyle = Object.keys(activeSlots).length > 0;

  const elderSources = getElderOverloadSources({
    leagueRelics: selectedLeagueRelics,
    regions: selected,
  });

  // Armour is gated on a blessing reading it, same rule the build editor uses -
  // but the potion buttons stay either way, because they move ability damage
  // through the formula's level term regardless (see LeaguesEffectsPanel).
  const showArmour = selectedBlessings.some((name) => ARMOUR_SCALING_BLESSINGS.has(name));
  const armour = showArmour
    ? {
        none: getTotalArmour(gear.equipped, gear.style, 99),
        overload: getTotalArmour(gear.equipped, gear.style, 99 + OVERLOAD_DEFENCE_BONUS.overload),
        elder:
          elderSources.length > 0
            ? getTotalArmour(gear.equipped, gear.style, 99 + OVERLOAD_DEFENCE_BONUS.elder)
            : null,
      }
    : null;

  const aegis =
    hasGearForStyle && selectedBlessings.includes("Teragard's Aegis")
      ? getAegisBreakdown({
          equipped: gear.equipped,
          style: gear.style,
          weaponName: activeSlots.weapon,
          offhandName: activeSlots.offhand,
          hasElder: elderSources.length > 0,
        })
      : null;

  function clearEverything() {
    clearRegions();
    clearLeagueRelics();
    clearRelics();
    clearBlessings();
    clearExtras();
    clearAllLoadouts();
  }

  const nothingPicked =
    selected.length === 0 &&
    selectedLeagueRelics.length === 0 &&
    selectedRelics.length === 0 &&
    selectedBlessings.length === 0 &&
    extras.length === 0 &&
    styleWithGear.length === 0;

  const listOr = (names, empty) => (names.length > 0 ? names.join(', ') : empty);

  // Same theme the effects panel gives its own toggle - the god power counts as
  // a fourth vote, so a two-blue-one-red build reads blue. See blessingTheme.js.
  const theme = useMemo(() => {
    const tally = blessingColourTally(selectedBlessings);
    return { gradient: blessingGradient(tally), accent: dominantBlessingColour(tally) };
  }, [selectedBlessings]);

  function showBlessingEffects() {
    setEffectsOpenSignal((n) => n + 1);
    // After the panel has had a frame to expand, so the scroll measures the
    // opened height rather than the collapsed one.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => effectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  return (
    <>
      <header>
        <div className="gear-page-heading">
          <h1>My Build</h1>
          <div className="gear-page-actions">
            <button
              type="button"
              className="clear-loadout-button"
              onClick={() => setConfirmingClear(true)}
              disabled={nothingPicked}
            >
              Clear everything
            </button>
            <button type="button" className="share-button" onClick={share.share} disabled={share.disabled}>
              {share.label}
            </button>
            {/* Publishing needs the backend, which the GitHub Pages mirror does
                not have - same reason Create a Build is hidden there. Everything
                else on this page is localStorage and works fine. */}
            {!IS_PAGES_BUILD && (
              <a
                href="#create-build-from-mine"
                className={`my-build-import-button${styleWithGear.length === 0 ? ' disabled' : ''}`}
                aria-disabled={styleWithGear.length === 0}
                onClick={(event) => {
                  if (styleWithGear.length === 0) event.preventDefault();
                }}
                title={
                  styleWithGear.length === 0
                    ? 'Equip some gear first - a build guide needs a loadout to show.'
                    : 'Start a Build Guide pre-filled from this setup'
                }
              >
                Import into Build Guide
              </a>
            )}
          </div>
        </div>
        <p className="my-build-intro">
          Your regions, relics, blessings and gear in one place - the same choices the Regions, League Relics,
          Blessings and Gear Planner tabs use, so anything you change here changes there too.
        </p>
      </header>

      <main className="my-build-page">
        <BuildSection
          id="regions"
          title="Regions"
          count={selected.length}
          summary={listOr(selected.map((id) => REGIONS[id]?.name ?? id), 'None picked yet')}
          open={openSection === 'regions'}
          onToggle={toggleSection}
        >
          <p className="create-build-hint">Pick up to 3 optional regions - click the map to toggle.</p>
          <RegionMap isUnlocked={isUnlocked} toggleRegion={toggleRegion} />
          {overLimit && <p className="create-build-warning">You&apos;ve picked more than 3 optional regions.</p>}
        </BuildSection>

        {/* Directly under Regions, because that is what pays for it - and it
            disappears entirely when the regions reach nothing, rather than
            sitting there as an empty section. */}
        {extrasOffered && (
          <BuildSection
            id="extras"
            title="Extras"
            count={extras.length}
            summary={listOr(extras, 'None taken yet')}
            open={openSection === 'extras'}
            onToggle={toggleSection}
          >
            <BuildExtrasPicker
              regions={selected}
              selected={selectedExtras}
              onToggle={toggleExtra}
              heading={null}
              hint="Unlocked by the regions above, and counted into your totals if taken."
            />
          </BuildSection>
        )}

        <BuildSection
          id="league-relics"
          title="League relics"
          count={selectedLeagueRelics.length}
          summary={listOr(selectedLeagueRelics, 'None picked yet')}
          open={openSection === 'league-relics'}
          onToggle={toggleSection}
        >
          {relicTierGroups.map(([tier, relics]) => (
            <div key={tier} className="create-build-relic-tier">
              <h3>
                {tier === 'unknown' ? 'Unknown tier' : `Tier ${tier}`} -{' '}
                {tierPickNote(tier, selectedLeagueRelics)}
              </h3>
              <div className="gear-item-rows compact">
                {relics.map((relic) => (
                  <LeagueRelicRow
                    key={relic.name}
                    relic={relic}
                    selected={selectedLeagueRelics.includes(relic.name)}
                    onToggleSelect={toggleLeagueRelic}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
        </BuildSection>

        <BuildSection
          id="blessings"
          title="Blessings"
          count={selectedBlessings.length}
          summary={listOr(selectedBlessings, 'None picked yet')}
          open={openSection === 'blessings'}
          onToggle={toggleSection}
        >
          <p className="create-build-hint">
            One per tier - the God Tier One power is worked out from the colours you pick.
          </p>
          {blessingTierGroups.map(([tier, blessings]) => (
            <div key={tier} className="blessing-tier-group">
              <h3 className="blessing-tier-heading">Tier {tier}</h3>
              <div className="blessing-grid compact">
                {blessings.map((blessing) => (
                  <BlessingCard
                    key={blessing.name}
                    blessing={blessing}
                    selected={selectedBlessings.includes(blessing.name)}
                    onToggle={toggleBlessing}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
          {selectedBlessingObjects.length > 0 && <BlessingGodPanel selectedBlessings={selectedBlessingObjects} />}
        </BuildSection>

        <BuildSection
          id="arch-relics"
          title="Arch relics"
          count={`${selectedRelics.length}/${MAX_RELICS}`}
          summary={listOr(selectedRelics, 'None picked yet')}
          open={openSection === 'arch-relics'}
          onToggle={toggleSection}
        >
          <div className="abilities-controls">
            {/* Same classes the Arch Relics page uses for these four, so the
                two pickers look like the same control rather than two takes
                on it (see pages/RelicsPage.jsx). */}
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
          <div className="gear-item-rows compact">
            {archRelicsToShow.map((relic) => (
              <RelicRow
                key={relic.name}
                relic={relic}
                available={isArchRelicAvailable(relic)}
                isUnlocked={isUnlocked}
                selected={selectedRelics.includes(relic.name)}
                selectable={selectedRelics.length < MAX_RELICS}
                onToggleSelect={toggleRelic}
                hasAntiquarian={hasAntiquarian}
              />
            ))}
          </div>
        </BuildSection>

        {/* Its own open state rather than joining the single-open group above:
            on desktop it should stay open WHILE you fiddle with regions or
            blessings, which mutual exclusion would prevent. */}
        <BuildSection
          id="loadout"
          title="Gear loadout"
          count={styleWithGear.length || null}
          // No style list here - the count says how many have gear, and the
          // planner's own tabs are right below showing which. Naming all four
          // was the longest summary on the page for the least information.
          summary={null}
          open={loadoutOpen}
          onToggle={() => setLoadoutOpen((prev) => !prev)}
          action={
            selectedBlessings.length > 0 && (
              <button
                type="button"
                className="my-build-effects-jump"
                onClick={showBlessingEffects}
                style={{
                  ...(theme.accent ? { '--effects-accent': theme.accent } : null),
                  ...(theme.gradient ? { backgroundImage: theme.gradient } : null),
                }}
              >
                <span aria-hidden="true">✦</span> See blessing effects
              </button>
            )
          }
        >
          <GearLoadoutPlanner
            isUnlocked={isUnlocked}
            selectedLeagueRelics={selectedLeagueRelics}
            {...gear}
            underGrid={
              <LoadoutStatNote
                style={gear.style}
                slots={activeSlots}
                equipped={gear.equipped}
                blessings={selectedBlessings}
                leagueRelics={selectedLeagueRelics}
                archRelics={selectedRelics}
                extras={extras}
                elderSources={elderSources}
              />
            }
          />
        </BuildSection>

        {/* The payoff. Follows the planner's own style tab rather than showing
            four panels at once: every figure in it - ability damage, the Aegis
            multiplier, Big Boned's health, Striking Light's basic attack band -
            is derived from ONE equipped loadout, so a build with gear on all
            four styles has four different answers rather than one. */}
        <section className="my-build-effects" ref={effectsRef}>
          <h2>Leagues effects - {STYLE_LABELS[gear.style]}</h2>
          <LeaguesEffectsPanel
            style={gear.style}
            slots={activeSlots}
            blessings={selectedBlessings}
            leagueRelics={selectedLeagueRelics}
            archRelics={selectedRelics}
            extras={extras}
            armour={armour}
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
            defaultOpen
            openSignal={effectsOpenSignal}
          />
          {!hasGearForStyle && (
            <p className="build-setup-note">
              Nothing equipped for {STYLE_LABELS[gear.style].toLowerCase()} yet - equip some gear above and its
              effects appear here.
            </p>
          )}
        </section>
      </main>

      {confirmingClear && (
        <ConfirmModal
          title="Clear everything?"
          body="This empties your whole setup across the site, not just this page. It cannot be undone."
          items={[
            `${selected.length} region${selected.length === 1 ? '' : 's'}`,
            `${selectedLeagueRelics.length} league relic${selectedLeagueRelics.length === 1 ? '' : 's'}`,
            `${selectedRelics.length} Arch relic${selectedRelics.length === 1 ? '' : 's'}`,
            `${selectedBlessings.length} blessing${selectedBlessings.length === 1 ? '' : 's'}`,
            `Gear for ${styleWithGear.length} combat style${styleWithGear.length === 1 ? '' : 's'}`,
          ]}
          confirmLabel="Clear everything"
          onConfirm={clearEverything}
          onClose={() => setConfirmingClear(false)}
        />
      )}
    </>
  );
}
