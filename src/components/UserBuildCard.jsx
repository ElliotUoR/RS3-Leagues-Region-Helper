import { useEffect, useState } from 'react';
import RetryImage from './RetryImage';
import ReadOnlyLoadout from './ReadOnlyLoadout';
import LeaguesEffectsPanel from './LeaguesEffectsPanel';
import BuildProse from './BuildProse';
import BuildCardMeta from './BuildCardMeta';
import PicksHeading from './PicksHeading';
import RejuvenatedNote from './RejuvenatedNote';
import { ARCH_RELIC_BY_NAME, LEAGUE_RELIC_BY_NAME } from '../data/buildLookups';
import { BUILD_EXTRA_BY_NAME } from '../data/buildExtras';
import { REGIONS, FIXED_REGIONS, GATEWAY_REGIONS } from '../data/regions';
import { GEAR } from '../data/gear';
import {
  ARMOUR_SCALING_BLESSINGS,
  getAegisBreakdown,
  OVERLOAD_DEFENCE_BONUS,
  getElderOverloadSources,
  getTotalArmour,
} from '../utils/gearStats';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };
const FIXED_REGION_IDS = [...FIXED_REGIONS, ...GATEWAY_REGIONS];
const regionIcon = (id) => `icons/regions/${id}.png`;
const regionLabel = (id) => REGIONS[id]?.name ?? id;

// `expandAll` is a nudge, not a lock: flipping it sets every row to match, and
// individual rows stay clickable afterwards. A row forced permanently open
// would make the toggle a one-way door.
function PickRow({ icon, name, reason, expandAll }) {
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
        {icon ? <RetryImage src={icon} alt="" className="pick-row-icon" /> : <span className="pick-row-icon pick-row-icon-empty" aria-hidden="true" />}
        <span className="pick-row-name">{name}</span>
      </button>
      {open && reason && <p className="pick-row-reason">{reason}</p>}
    </li>
  );
}

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

// Renders one user-submitted build (see utils/userBuildShape.js for the
// payload shape). Same visual language as BuildGuideCard, but leaner: no
// unlocks section (Arch relics/spellbook/prayers/abilities) - the Edit/Copy
// links live in the footer instead (see UserBuildListItem.jsx), not inside
// this card - and armour totals are computed live rather than read from a
// precomputed field, since a submitter has no way to hand-supply that number
// correctly.
// `build.stages` generalises the curated builds' fixed midLate/late split
// into up to 2 author-named stages, each with its own per-style loadout.
export default function UserBuildCard({ build, expanded, onToggle }) {
  const [style, setStyle] = useState(build.styles[0]);
  const [stageIndex, setStageIndex] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const stage = build.stages[stageIndex];
  const loadout = stage?.loadouts[style];
  const buildRegions = new Set([...FIXED_REGION_IDS, ...build.regions]);
  const buildIsUnlocked = (regionId) => buildRegions.has(regionId);

  const equipped = {};
  if (loadout) {
    for (const [slot, itemName] of Object.entries(loadout.slots)) {
      const item = GEAR[style]?.[slot]?.find((i) => i.name === itemName);
      if (item) equipped[slot] = item;
    }
  }
  // Only shown when the build actually picked a blessing that reads its value
  // off total armour - otherwise the number is just noise (see
  // utils/gearStats.js's ARMOUR_SCALING_BLESSINGS). Health, prayer and every
  // other derived figure are gated the same way inside LeaguesEffectsPanel,
  // which derives them from the picks it is handed.
  const showArmour = build.blessings.some((name) => ARMOUR_SCALING_BLESSINGS.has(name));
  const armourTotal = loadout && showArmour ? getTotalArmour(equipped, style, 99) : null;
  // Teragard's Aegis reads TOTAL armour, so it moves with a Defence boost -
  // and with what is in the off-hand, which decides the x1/x2/x3 multiplier.
  // The elder figure is only computed when the build can actually brew one.
  const elderSources = getElderOverloadSources({ leagueRelics: build.relics, regions: build.regions });
  // The panel's potion toggle needs a figure to switch to at each state.
  const armour =
    armourTotal == null
      ? null
      : {
          none: armourTotal,
          overload: getTotalArmour(equipped, style, 99 + OVERLOAD_DEFENCE_BONUS.overload),
          elder: elderSources.length > 0 ? getTotalArmour(equipped, style, 99 + OVERLOAD_DEFENCE_BONUS.elder) : null,
        };
  const aegis =
    loadout && build.blessings.includes("Teragard's Aegis")
      ? getAegisBreakdown({
          equipped,
          style,
          weaponName: loadout.slots.weapon,
          offhandName: loadout.slots.offhand,
          hasElder: elderSources.length > 0,
        })
      : null;

  // The hint and its expand-all toggle belong above the first pick list that
  // actually renders - all three sections are optional here, so "first" is not
  // always League relics.
  // Older builds predate the field entirely, so it is read defensively rather
  // than assumed - the payload is versionless JSON (see utils/userBuildShape.js).
  const extras = build.extras ?? [];

  const firstPickGroup = [
    build.relics.length > 0 ? 'relics' : null,
    build.archRelics.length > 0 ? 'archRelics' : null,
    build.regions.length > 0 ? 'regions' : null,
    extras.length > 0 ? 'extras' : null,
  ].find(Boolean);

  const headingFor = (id, title) =>
    id === firstPickGroup ? (
      <PicksHeading title={title} expanded={expandAll} onToggle={() => setExpandAll((p) => !p)} />
    ) : (
      <h4>{title}</h4>
    );

  return (
    <article className={`build-card user-build-card${expanded ? ' expanded' : ''}`}>
      <button type="button" className="build-card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="build-card-headline">
          <h3 className="build-card-name">{build.name}</h3>
          <p className="build-card-tagline">{build.tagline}</p>
          {build.authorName && <p className="user-build-author">by {build.authorName}</p>}
        </div>

        <BuildCardMeta
          difficultyLabel={build.difficultyLabel}
          difficultyNote={build.difficultyNote}
          blessings={build.blessings}
          godTier={build.godTier}
          relics={build.relics}
          styles={build.styles}
        />

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

          {build.whyItsGood && (
            <Collapsible title="Why it's good">
              <BuildProse text={build.whyItsGood} />
            </Collapsible>
          )}
          {build.howToPlay && (
            <Collapsible title="How to play it">
              <BuildProse text={build.howToPlay} />
            </Collapsible>
          )}

          <div className="build-main-split">
            <div className="build-picks">
              {build.relics.length > 0 && (
                <section className="build-setup-group">
                  {headingFor('relics', 'League relics')}
                  <ul className="pick-list">
                    {build.relics.map((name) => (
                      <PickRow key={name} icon={LEAGUE_RELIC_BY_NAME.get(name)?.icon} name={name} reason={build.relicReasons[name]} expandAll={expandAll} />
                    ))}
                  </ul>
                  <RejuvenatedNote relics={build.relics} />
                </section>
              )}

              {build.archRelics.length > 0 && (
                <section className="build-setup-group">
                  {headingFor('archRelics', 'Arch relics')}
                  <ul className="pick-list">
                    {build.archRelics.map((name) => (
                      <PickRow key={name} icon={ARCH_RELIC_BY_NAME.get(name)?.icon} name={name} reason={build.archRelicReasons[name]} expandAll={expandAll} />
                    ))}
                  </ul>
                </section>
              )}

              {build.regions.length > 0 && (
                <section className="build-setup-group">
                  {headingFor('regions', 'Regions')}
                  <ul className="pick-list">
                    {build.regions.map((id) => (
                      <PickRow key={id} icon={regionIcon(id)} name={regionLabel(id)} reason={build.regionReasons[id]} expandAll={expandAll} />
                    ))}
                  </ul>
                </section>
              )}

              {/* Directly under Regions, because that is what pays for them.
                  The figure each one grants is in the Leagues effects panel
                  below, folded into the totals it changes. */}
              {extras.length > 0 && (
                <section className="build-setup-group">
                  {headingFor('extras', 'Extras')}
                  <ul className="pick-list">
                    {extras.map((name) => (
                      <PickRow
                        key={name}
                        icon={BUILD_EXTRA_BY_NAME.get(name)?.icon}
                        name={name}
                        reason={BUILD_EXTRA_BY_NAME.get(name)?.summary}
                        expandAll={expandAll}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="build-loadout-column">
              <div className="build-loadout-header">
                <h4>Loadout - {STYLE_LABELS[style]}</h4>
                {build.stages.length > 1 && (
                  <div className="build-stage-tabs" role="tablist" aria-label="Build stage">
                    {build.stages.map((s, index) => (
                      <button
                        key={s.label}
                        type="button"
                        role="tab"
                        aria-selected={stageIndex === index}
                        className={`build-stage-tab${stageIndex === index ? ' active' : ''}`}
                        onClick={() => setStageIndex(index)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {loadout ? (
                <ReadOnlyLoadout
                  styleId={style}
                  styleLabel={STYLE_LABELS[style]}
                  slots={loadout.slots}
                  eof={loadout.eof}
                  isUnlocked={buildIsUnlocked}
                  selectedLeagueRelics={build.relics}
                />
              ) : (
                <p className="build-setup-note">No loadout for this style{build.stages.length > 1 ? ' in this stage' : ''}.</p>
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
              leagueRelics={build.relics}
              archRelics={build.archRelics}
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
            />
          )}

          {build.tradeoffs.length > 0 && (
            <section className="build-tradeoffs">
              <h4>Trade-offs</h4>
              <ul>
                {build.tradeoffs.map((text) => (
                  <li key={text.slice(0, 40)}>{text}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
