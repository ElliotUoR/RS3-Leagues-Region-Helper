import { useState } from 'react';
import RetryImage from './RetryImage';
import ReadOnlyLoadout from './ReadOnlyLoadout';
import TagTooltip from './TagTooltip';
import BuildProse from './BuildProse';
import { BLESSINGS, GOD_TIER_BLESSINGS } from '../data/blessings';
import { RELIC_COLOURS } from '../data/blessingBuilds';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { RELICS } from '../data/relics';
import { REGIONS, FIXED_REGIONS, GATEWAY_REGIONS } from '../data/regions';
import { GEAR } from '../data/gear';
import { ARMOUR_SCALING_BLESSINGS, LIFE_SCALING_BLESSINGS, getTotalArmour, getTotalLifePoints } from '../utils/gearStats';
import { hasEditAccess } from '../utils/myBuilds';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };
const FIXED_REGION_IDS = [...FIXED_REGIONS, ...GATEWAY_REGIONS];
const regionIcon = (id) => `icons/regions/${id}.png`;
const regionLabel = (id) => REGIONS[id]?.name ?? id;

const byName = (list) => new Map(list.map((entry) => [entry.name, entry]));
const BLESSING_BY_NAME = byName([...BLESSINGS, ...GOD_TIER_BLESSINGS]);
const LEAGUE_RELIC_BY_NAME = byName(LEAGUE_RELICS);
const ARCH_RELIC_BY_NAME = byName(RELICS);

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

function PickRow({ icon, name, reason }) {
  const [open, setOpen] = useState(false);
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
// unlocks section (Arch relics/spellbook/prayers/abilities), no editing
// affordance beyond the author's own "Edit" link (see hasEditAccess) - and
// armour totals are computed live rather than read from a precomputed field,
// since a submitter has no way to hand-supply that number correctly.
// `build.stages` generalises the curated builds' fixed midLate/late split
// into up to 2 author-named stages, each with its own per-style loadout.
export default function UserBuildCard({ build, expanded, onToggle }) {
  const [style, setStyle] = useState(build.styles[0]);
  const [stageIndex, setStageIndex] = useState(0);
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
  // Only shown when the build actually picked a blessing that reads its
  // value off one of these - otherwise the number is just noise (see
  // utils/gearStats.js's ARMOUR_SCALING_BLESSINGS/LIFE_SCALING_BLESSINGS).
  const showArmour = build.blessings.some((name) => ARMOUR_SCALING_BLESSINGS.has(name));
  const showHealth = build.blessings.some((name) => LIFE_SCALING_BLESSINGS.has(name));
  const armourTotal = loadout && showArmour ? getTotalArmour(equipped, style, 99) : null;
  const lifeTotal = loadout && showHealth ? getTotalLifePoints(equipped, { bigBoned: true }) : null;

  return (
    <article className={`build-card user-build-card${expanded ? ' expanded' : ''}`}>
      <button type="button" className="build-card-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="build-card-headline">
          <h3 className="build-card-name">{build.name}</h3>
          <p className="build-card-tagline">{build.tagline}</p>
          {build.authorName && <p className="user-build-author">by {build.authorName}</p>}
        </div>

        <div className="build-card-meta">
          {build.difficultyLabel && (
            <TagTooltip className="build-difficulty" tooltip={build.difficultyNote}>
              {build.difficultyLabel}
            </TagTooltip>
          )}
          {build.blessings.length > 0 && (
            <div className="build-card-pills">
              {build.blessings.map((name) => (
                <BlessingPill key={name} name={name} />
              ))}
              {build.godTier && (
                <>
                  <span className="build-card-arrow" aria-hidden="true">
                    →
                  </span>
                  <BlessingPill name={build.godTier} isGodTier />
                </>
              )}
            </div>
          )}
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
          {hasEditAccess(build.id) && (
            <p className="user-build-owner-note">
              You made this build. <a href={`#edit-build/${build.id}`} className="user-build-edit-link">Edit it</a>
            </p>
          )}

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
                  <h4>League relics</h4>
                  <ul className="pick-list">
                    {build.relics.map((name) => (
                      <PickRow key={name} icon={LEAGUE_RELIC_BY_NAME.get(name)?.icon} name={name} reason={build.relicReasons[name]} />
                    ))}
                  </ul>
                </section>
              )}

              {build.archRelics.length > 0 && (
                <section className="build-setup-group">
                  <h4>Arch relics</h4>
                  <ul className="pick-list">
                    {build.archRelics.map((name) => (
                      <PickRow key={name} icon={ARCH_RELIC_BY_NAME.get(name)?.icon} name={name} reason={build.archRelicReasons[name]} />
                    ))}
                  </ul>
                </section>
              )}

              {build.regions.length > 0 && (
                <section className="build-setup-group">
                  <h4>Regions</h4>
                  <ul className="pick-list">
                    {build.regions.map((id) => (
                      <PickRow key={id} icon={regionIcon(id)} name={regionLabel(id)} reason={build.regionReasons[id]} />
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
                  armourTotal={armourTotal}
                  armourTotalOverloaded={null}
                  armourTotalElder={null}
                  elderSources={[]}
                  lifeTotal={lifeTotal}
                  isUnlocked={buildIsUnlocked}
                  selectedLeagueRelics={build.relics}
                />
              ) : (
                <p className="build-setup-note">No loadout for this style{build.stages.length > 1 ? ' in this stage' : ''}.</p>
              )}
            </div>
          </div>

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
