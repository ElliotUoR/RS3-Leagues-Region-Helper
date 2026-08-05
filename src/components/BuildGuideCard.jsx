import { useEffect, useRef, useState } from 'react';
import RetryImage from './RetryImage';
import ReadOnlyLoadout from './ReadOnlyLoadout';
import LeaguesEffectsPanel from './LeaguesEffectsPanel';
import TagTooltip from './TagTooltip';
import EditableText from './EditableText';
import BuildProse from './BuildProse';
import PicksHeading from './PicksHeading';
import RejuvenatedNote from './RejuvenatedNote';
import { BLESSINGS, GOD_TIER_BLESSINGS } from '../data/blessings';
import {
  ARTEFACT_BYPASS_NOTE,
  BLESSING_BUILD_STAGES,
  EXECUTION_DIFFICULTIES,
  RELIC_COLOURS,
} from '../data/blessingBuilds';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { RELICS } from '../data/relics';
import { ABILITIES } from '../data/abilities';
import { PRAYER_GROUPS, SPELLBOOK_GROUPS } from '../data/spellbooks';
import { FIXED_REGIONS, GATEWAY_REGIONS, REGIONS } from '../data/regions';
import { normalizeRegionGroups } from '../data/gearAvailability';
import { getAegisFromArmour, getElderOverloadSources } from '../utils/gearStats';
import { copyShareLink, shareLinkFor } from '../utils/shareLink';
import { saveBuildText } from '../utils/buildTextEdit';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// Static lookup maps, built once at module load - all reference data that
// never changes at runtime, so there is nothing to memoise per render.
const byName = (list) => new Map(list.map((entry) => [entry.name, entry]));
const BLESSING_BY_NAME = byName([...BLESSINGS, ...GOD_TIER_BLESSINGS]);
const LEAGUE_RELIC_BY_NAME = byName(LEAGUE_RELICS);
const ARCH_RELIC_BY_NAME = byName(RELICS);
const ABILITY_BY_NAME = byName(ABILITIES);
const flattenGroups = (groups) => groups.flatMap((group) => [group.parent, ...(group.related || [])]);
const SPELLBOOK_BY_NAME = byName(flattenGroups(SPELLBOOK_GROUPS));
const PRAYER_BY_NAME = byName(flattenGroups(PRAYER_GROUPS));

const regionLabel = (id) => REGIONS[id]?.name ?? id;

// public/icons/regions/<regionId>.png - one per region, filenames matching the
// region ids exactly. These already ship with the app (they are the icons used
// for share links); regions.js itself carries no `icon` field, so the path is
// derived by convention rather than looked up.
const regionIcon = (id) => `icons/regions/${id}.png`;

// Misthalin/Havenhythe are FIXED_REGIONS and Karamja is a GATEWAY_REGIONS
// entry; all three are free, so a build's `regions` lists only optional picks.
const FIXED_REGION_IDS = [...FIXED_REGIONS, ...GATEWAY_REGIONS];

function BlessingPill({ name, isGodTier }) {
  const blessing = BLESSING_BY_NAME.get(name);
  if (!blessing) return null;
  const classes = ['blessing-pill', `blessing-pill-${blessing.colour}`, isGodTier ? 'blessing-pill-god' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes}>
      {blessing.icon && <RetryImage src={blessing.icon} alt="" className="blessing-pill-icon" />}
      <span>{blessing.name}</span>
    </span>
  );
}

function LeagueRelicChip({ name }) {
  const relic = LEAGUE_RELIC_BY_NAME.get(name);
  if (!relic) return null;
  const hue = RELIC_COLOURS[name]?.hue;
  return (
    <span className="league-relic-chip" style={hue != null ? { '--relic-hue': hue } : undefined}>
      {/* Not every relic has artwork yet (see data/leagueRelics.js) - a null
          src would resolve to "<base>/null" and put RetryImage into its
          indefinite retry loop against a URL that can never load. */}
      {relic.icon ? (
        <RetryImage src={relic.icon} alt="" className="league-relic-chip-icon" />
      ) : (
        <span className="league-relic-chip-icon league-relic-icon-placeholder" aria-hidden="true" />
      )}
      <span>{relic.name}</span>
    </span>
  );
}

// Compact icon + name + one-line reason. Used by the spellbook/prayer/ability
// groups, where everything is short enough to show at once.
function SetupEntry({ icon, name, reason, editing, buildId, path }) {
  return (
    <li className="setup-entry">
      {icon ? (
        <RetryImage src={icon} alt="" className="setup-entry-icon" />
      ) : (
        <span className="setup-entry-icon setup-entry-icon-empty" aria-hidden="true" />
      )}
      <span className="setup-entry-text">
        <span className="setup-entry-name">{name}</span>
        {reason && (
          <span className="setup-entry-reason">
            <EditableText editing={editing} buildId={buildId} path={path} value={reason}>
              {reason}
            </EditableText>
          </span>
        )}
      </span>
    </li>
  );
}

// Relics and regions collapse to a single icon+name row; the reasoning only
// appears once that row is ticked. Three lists of prose side by side was the
// densest part of the card, and the reasons are reference material rather than
// something you read every time.
// `expandAll` is a nudge, not a lock: flipping it sets every row to match, and
// individual rows stay clickable afterwards. A row forced permanently open
// would make the toggle a one-way door.
function PickRow({ icon, name, reason, editing, buildId, path, expandAll }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(expandAll);
  }, [expandAll]);
  return (
    <li className={`pick-row${open ? ' open' : ''}`}>
      <button type="button" className="pick-row-head" onClick={() => setOpen((p) => !p)} aria-expanded={open}>
        <span className={`pick-row-tick${open ? ' ticked' : ''}`} aria-hidden="true">
          {open ? '✓' : ''}
        </span>
        {icon ? (
          <RetryImage src={icon} alt="" className="pick-row-icon" />
        ) : (
          <span className="pick-row-icon pick-row-icon-empty" aria-hidden="true" />
        )}
        <span className="pick-row-name">{name}</span>
      </button>
      {open && reason && (
        <p className="pick-row-reason">
          <EditableText editing={editing} buildId={buildId} path={path} value={reason}>
            {reason}
          </EditableText>
        </p>
      )}
    </li>
  );
}

const BUILD_SHARE_LABELS = {
  idle: 'Open in gear planner',
  working: 'Creating link…',
  copied: 'Link copied',
  manual: 'Link ready',
  error: 'Share unavailable',
};

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`build-collapsible${open ? ' open' : ''}`}>
      <button type="button" className="build-collapsible-head" onClick={() => setOpen((p) => !p)} aria-expanded={open}>
        <span className="build-collapsible-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </button>
      {open && <div className="build-collapsible-body">{children}</div>}
    </div>
  );
}

// The share payload for the build's LATE-game loadout. `regions` carries only
// the optional picks: sanitizeRegionSelection() drops fixed and gateway
// regions, and Karamja belongs in `gatewaySelected`.
function shareFieldsFor(build) {
  const equippedNamesByStyle = { melee: {}, ranged: {}, magic: {}, necromancy: {} };
  // Every guide loadout slots a weapon into the Essence of Finality amulet and
  // the card renders it, so the share link has to carry it too - it is a
  // separate field from `slots`, and leaving it empty silently dropped the EOF
  // weapon from every shared build.
  const eofWeaponNamesByStyle = {};
  for (const [styleId, entry] of Object.entries(build.loadouts.late || {})) {
    equippedNamesByStyle[styleId] = { ...entry.slots };
    if (entry.eof) eofWeaponNamesByStyle[styleId] = entry.eof;
  }
  return {
    regions: build.regions,
    gatewaySelected: [...GATEWAY_REGIONS],
    equippedNamesByStyle,
    eofWeaponNamesByStyle,
    relics: build.unlocks.archRelics.map((relic) => relic.name),
    leagueRelics: build.relics,
    // `build.blessings` is the three tier picks by name - exactly the shape
    // useBlessingSelection stores, so it needs no translation. The god power is
    // deliberately not carried: it is derived from these three, never stored.
    blessings: build.blessings,
    defaultStyle: build.styles[0],
  };
}

export default function BuildGuideCard({ build, expanded, onToggle, editing = false, onUse }) {
  const [stage, setStage] = useState('late');
  // One style shown at a time. Keeps every loadout the same size across every
  // guide, and lets a multi-style build be read as the style you actually play.
  const [style, setStyle] = useState(build.styles[0]);
  const [shareStatus, setShareStatus] = useState('idle');
  // Mirrors build.hidden locally so the badge flips immediately on click; the
  // file is the real store and HMR reconciles a moment later.
  const [hidden, setHidden] = useState(Boolean(build.hidden));
  // Opens every pick row at once - relics, Arch relics and regions - for anyone
  // who would rather read the reasoning than click through it row by row.
  const [expandAll, setExpandAll] = useState(false);
  const cardRef = useRef(null);
  const difficulty = EXECUTION_DIFFICULTIES[build.difficulty];
  const loadout = build.loadouts[stage]?.[style];

  // Opening a card that sits below the fold otherwise leaves you reading its
  // middle - scroll the card's top edge to the top of the viewport so the
  // build starts where you are looking. Only on open, never on close, so
  // collapsing does not yank the page around.
  useEffect(() => {
    if (!expanded || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [expanded]);

  const buildRegions = new Set([...FIXED_REGION_IDS, ...build.regions]);
  const buildIsUnlocked = (regionId) => buildRegions.has(regionId);

  const elderSources = getElderOverloadSources({ leagueRelics: build.relics, regions: build.regions });

  // Teragard's Aegis and Big Boned both state a number that used to be written
  // by hand into this build's keyNumbers. Derived now instead, from the
  // loadout on screen - which means they follow the style and stage tabs, and
  // cannot drift out of date when a build's gear is edited. See
  // utils/gearStats.js.
  //
  // Aegis reads the PRECOMPUTED armour totals rather than re-deriving them, so
  // the figures in its brackets are the same ones the armour lines above show.
  const archRelicNames = build.unlocks.archRelics.map((relic) => relic.name);
  const aegis =
    loadout && build.blessings.includes("Teragard's Aegis")
      ? getAegisFromArmour({
          weaponName: loadout.slots.weapon,
          offhandName: loadout.slots.offhand,
          base: loadout.armourTotal,
          overloaded: loadout.armourTotalOverloaded,
          elder: elderSources.length > 0 ? loadout.armourTotalElder : null,
        })
      : null;


  // Detected from the relic data rather than hardcoded, so adding an
  // artefact-gated relic to any build surfaces the explanation automatically.
  const usesArtefactRelic = build.unlocks.archRelics.some((relic) => {
    const data = ARCH_RELIC_BY_NAME.get(relic.name);
    return data ? normalizeRegionGroups(data).some((group) => group.artefact) : false;
  });

  // Abilities are filtered to the selected style so the guide reframes rather
  // than showing a melee player a list half full of magic abilities.
  const styleAbilities = build.unlocks.abilities.filter((a) => a.style === style || a.style === 'generic');

  // Writes `hidden` back into blessingBuilds.js. A hidden build still renders
  // on the dev server (marked as such) and is filtered out of every release
  // build - see isBuildVisible in utils/buildTextEdit.js.
  async function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    try {
      await saveBuildText(build.id, ['hidden'], next);
    } catch (err) {
      setHidden(!next);
      console.error('could not save hidden flag:', err);
    }
  }

  // Goes through shareLinkFor, so on the live site this is a short link that is
  // created once and re-fetched from the database on every later share of the
  // same build - see utils/shareLink.js.
  async function handleShare() {
    setShareStatus('working');
    try {
      const url = await shareLinkFor(shareFieldsFor(build));
      setShareStatus(await copyShareLink(url));
    } catch {
      setShareStatus('error');
    }
    setTimeout(() => setShareStatus('idle'), 2500);
  }

  return (
    <article ref={cardRef} className={`build-card${expanded ? ' expanded' : ''}${hidden ? ' build-card-hidden' : ''}`}>
      {/* Sibling of the head button, not inside it - a nested button is
          invalid HTML and browsers break click handling on it. */}
      {editing && (
        <div className="build-hidden-bar">
          <label className="build-hidden-toggle">
            <input type="checkbox" checked={hidden} onChange={toggleHidden} />
            <span>Hidden</span>
          </label>
          <span className="build-hidden-note">
            {hidden
              ? 'Shown here on the dev server, but excluded from the live site and the GitHub Pages build.'
              : 'Tick to keep this build out of release builds while you work on it.'}
          </span>
        </div>
      )}
      <button type="button" className="build-card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="build-card-headline">
          <h3 className="build-card-name">
            {build.name}
            {hidden && <span className="build-hidden-badge">hidden</span>}
          </h3>
          <p className="build-card-tagline">{build.tagline}</p>
        </div>

        <div className="build-card-meta">
          <TagTooltip className={`build-difficulty build-difficulty-${build.difficulty}`} tooltip={difficulty?.note}>
            {difficulty?.label}
          </TagTooltip>
          <div className="build-card-pills">
            {build.blessings.map((name) => (
              <BlessingPill key={name} name={name} />
            ))}
            <span className="build-card-arrow" aria-hidden="true">
              →
            </span>
            <BlessingPill name={build.godTier} isGodTier />
          </div>
          <div className="build-card-chips">
            {build.relics.map((name) => (
              <LeagueRelicChip key={name} name={name} />
            ))}
          </div>
          <div className="build-card-styles">
            {build.styles.map((styleId) => (
              <span key={styleId} className={`build-style-tag build-style-tag-${styleId}`}>
                {STYLE_LABELS[styleId]}
              </span>
            ))}
          </div>
        </div>

        <span className="build-card-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div className="build-card-body">
          {build.styles.length > 1 && (
            <div className="build-style-tabs" role="tablist" aria-label="Combat style">
              {build.styles.map((styleId) => (
                <button
                  key={styleId}
                  type="button"
                  role="tab"
                  aria-selected={style === styleId}
                  className={`build-style-tab build-style-tab-${styleId}${style === styleId ? ' active' : ''}`}
                  onClick={() => setStyle(styleId)}
                >
                  {STYLE_LABELS[styleId]}
                </button>
              ))}
            </div>
          )}

          {/* Prose is collapsed by default: it is the longest content on the
              card and the setup grids below are what people scan for. */}
          <Collapsible title="Why it's good">
            {/* In edit mode this becomes a single textarea holding the whole
                field, so the \n\n paragraph breaks stay editable as real blank
                lines rather than being split into separate uneditable <p>s. */}
            {editing ? (
              <EditableText editing buildId={build.id} path={['whyItsGood']} value={build.whyItsGood} as="div" />
            ) : (
              <BuildProse text={build.whyItsGood} />
            )}
          </Collapsible>
          <Collapsible title="How to play it">
            {/* Same treatment as whyItsGood: some builds use \n\n here too, and
                a single <p> would collapse those into one run-on paragraph. */}
            {editing ? (
              <EditableText editing buildId={build.id} path={['howToPlay']} value={build.howToPlay} as="div" />
            ) : (
              <BuildProse text={build.howToPlay} />
            )}
          </Collapsible>

          <dl className="build-key-numbers">
            {build.keyNumbers.map((entry) => (
              <div key={entry.label} className="build-key-number">
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>

          {/* Picks on the left, loadout on the right. The pick lists collapse
              to one row each so the whole setup fits beside the equipment grid
              instead of pushing it below three columns of prose. */}
          <div className="build-main-split">
            <div className="build-picks">
              <section className="build-setup-group">
                <PicksHeading
                  title="League relics"
                  expanded={expandAll}
                  onToggle={() => setExpandAll((p) => !p)}
                />
                <ul className="pick-list">
                  {build.relics.map((name) => (
                    <PickRow expandAll={expandAll}
                      key={name}
                      icon={LEAGUE_RELIC_BY_NAME.get(name)?.icon}
                      name={name}
                      reason={build.relicReasons[name]}
                      editing={editing} buildId={build.id}
                      path={['relicReasons', name]}
                    />
                  ))}
                </ul>
                  <RejuvenatedNote relics={build.relics} />
              </section>

              <section className="build-setup-group">
                <h4>Arch relics</h4>
                <ul className="pick-list">
                  {build.unlocks.archRelics.map((relic, index) => (
                    <PickRow expandAll={expandAll}
                      key={relic.name}
                      icon={ARCH_RELIC_BY_NAME.get(relic.name)?.icon}
                      name={relic.name}
                      reason={relic.reason}
                      editing={editing} buildId={build.id}
                      path={['unlocks', 'archRelics', index, 'reason']}
                    />
                  ))}
                </ul>
                {build.unlocks.archRelicNote && (
                  <p className="build-aside">
                    <EditableText editing={editing} buildId={build.id} path={['unlocks', 'archRelicNote']} value={build.unlocks.archRelicNote}>
                      {build.unlocks.archRelicNote}
                    </EditableText>
                  </p>
                )}
                {/* Shown whenever a listed relic has an artefact-only region
                    group, so a reader cross-checking it on the Relics page
                    doesn't think the build is cheating its region budget. */}
                {usesArtefactRelic && <p className="build-setup-note">{ARTEFACT_BYPASS_NOTE}</p>}
              </section>

              <section className="build-setup-group">
                <h4>Regions</h4>
                <ul className="pick-list">
                  {build.regions.map((id) => (
                    <PickRow expandAll={expandAll}
                      key={id}
                      icon={regionIcon(id)}
                      name={regionLabel(id)}
                      reason={build.regionReasons[id]}
                      editing={editing} buildId={build.id}
                      path={['regionReasons', id]}
                    />
                  ))}
                </ul>
                {build.regionNote && (
                  <p className="build-aside">
                    <EditableText editing={editing} buildId={build.id} path={['regionNote']} value={build.regionNote}>
                      {build.regionNote}
                    </EditableText>
                  </p>
                )}
              </section>

              {/* What the three picks cost you. Same collapsed pick-row
                  treatment as the taken regions, and visually muted, so it
                  reads as "considered and rejected" rather than as a fourth
                  set of picks. */}
              {build.alternateRegions?.length > 0 && (
                <section className="build-setup-group build-alt-regions">
                  <h4>Alternate regions</h4>
                  <ul className="pick-list">
                    {build.alternateRegions.map((alt, index) => (
                      <PickRow expandAll={expandAll}
                        key={alt.region}
                        icon={regionIcon(alt.region)}
                        name={regionLabel(alt.region)}
                        reason={alt.note}
                        editing={editing}
                        buildId={build.id}
                        path={['alternateRegions', index, 'note']}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="build-loadout-column">
              <div className="build-loadout-header">
                <h4>Loadout - {STYLE_LABELS[style]}</h4>
                <div className="build-stage-tabs" role="tablist" aria-label="Progression stage">
                  {BLESSING_BUILD_STAGES.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={stage === entry.id}
                      className={`build-stage-tab${stage === entry.id ? ' active' : ''}`}
                      title={entry.label}
                      onClick={() => setStage(entry.id)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadout ? (
                <>
                  <ReadOnlyLoadout
                    styleId={style}
                    styleLabel={`${STYLE_LABELS[style]} - ${BLESSING_BUILD_STAGES.find((s) => s.id === stage)?.label}`}
                    slots={loadout.slots}
                    eof={loadout.eof}
                    isUnlocked={buildIsUnlocked}
                    selectedLeagueRelics={build.relics}
                  />
                  <button
                    type="button"
                    className="build-share-button"
                    onClick={handleShare}
                    disabled={shareStatus === 'working'}
                  >
                    {BUILD_SHARE_LABELS[shareStatus]}
                  </button>
                  {/* Same fork the user builds get - and the reason it is
                      worth having here is that the share button beside it is a
                      four-step dance for the same destination (copy link, open
                      it, preview, "Load into my planner"). See
                      components/UseBuildModal.jsx. */}
                  {onUse && (
                    <button type="button" className="build-use-button" onClick={() => onUse(build)}>
                      Use this build
                    </button>
                  )}
                  <p className="build-share-note">
                    Copies a share link for the late-game loadout, regions, Arch relics, league
                    relics and blessings. Opening it previews the build without overwriting your own
                    saved loadout.
                  </p>
                </>
              ) : (
                <p className="build-setup-note">No {stage === 'late' ? 'late' : 'mid-late'} loadout for this style.</p>
              )}
            </div>
          </div>

          {/* Full width, below both columns: what this build's picks actually
              pay out. Follows the style and stage tabs above, so it always
              describes the loadout on screen. */}
          {loadout && (
            <LeaguesEffectsPanel
              style={style}
              slots={loadout.slots}
              blessings={build.blessings}
              godTier={build.godTier}
              godTier2={build.godTier2}
              leagueRelics={build.relics}
              archRelics={archRelicNames}
              armour={{
                none: loadout.armourTotal,
                overload: loadout.armourTotalOverloaded,
                elder: elderSources.length > 0 ? loadout.armourTotalElder : null,
              }}
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
            />
          )}

          {/* Unlocks: same three-column treatment, filtered to the chosen style. */}
          <div className="build-setup-grid build-setup-grid-unlocks">
            <section className="build-setup-group">
              <h4>Spellbook</h4>
              <ul>
                <SetupEntry
                  icon={SPELLBOOK_BY_NAME.get(build.unlocks.spellbook.name)?.icons?.[0]?.icon}
                  name={build.unlocks.spellbook.name}
                  reason={build.unlocks.spellbook.note}
                  editing={editing} buildId={build.id}
                  path={['unlocks', 'spellbook', 'note']}
                />
              </ul>
            </section>

            <section className="build-setup-group">
              <h4>Prayers</h4>
              <ul className="setup-list-tight">
                {build.unlocks.prayers.map((name) => (
                  <SetupEntry key={name} icon={PRAYER_BY_NAME.get(name)?.icons?.[0]?.icon} name={name} />
                ))}
              </ul>
              <p className="build-setup-note">
                <EditableText editing={editing} buildId={build.id} path={['unlocks', 'prayerNote']} value={build.unlocks.prayerNote}>
                  {build.unlocks.prayerNote}
                </EditableText>
              </p>
            </section>

            <section className="build-setup-group">
              <h4>Abilities - {STYLE_LABELS[style]}</h4>
              <ul>
                {styleAbilities.map((ability) => (
                  <SetupEntry
                    key={ability.name}
                    icon={ABILITY_BY_NAME.get(ability.name)?.icon}
                    name={ability.name}
                    reason={ability.note}
                    editing={editing} buildId={build.id}
                    path={['unlocks', 'abilities', build.unlocks.abilities.indexOf(ability), 'note']}
                  />
                ))}
              </ul>
            </section>
          </div>

          <section className="build-tradeoffs">
            <h4>Trade-offs</h4>
            <ul>
              {build.tradeoffs.map((text, index) => (
                <li key={text.slice(0, 40)}>
                  <EditableText editing={editing} buildId={build.id} path={['tradeoffs', index]} value={text}>
                    {text}
                  </EditableText>
                </li>
              ))}
            </ul>
          </section>

        </div>
      )}
    </article>
  );
}
