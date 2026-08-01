import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
import { RELIC_COLOURS } from '../data/blessingBuilds';
import { BLESSING_BY_NAME, LEAGUE_RELIC_BY_NAME } from '../data/buildLookups';

// The right-hand summary of a build card's header - difficulty, blessing
// chain, league relic chips, combat styles. Shared because the "User made
// builds" listing has to draw it from the LIST endpoint's compact row (id,
// name, a few fields lifted out of the payload) while UserBuildCard draws the
// same thing from the fully sanitized build, and the two must look identical:
// the collapsed card is what a card turns into when you close it again.
//
// Everything here is name-keyed lookup into reference data, so an unknown name
// renders as nothing rather than as unstyled text - which is what makes it
// safe to feed this the raw payload fields from the listing, where the only
// sanitizing that ever happened was in the submitter's own browser.
const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

export function BlessingPill({ name, isGodTier }) {
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

export function LeagueRelicChip({ name }) {
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

// TagTooltip renders a <span role="button">, not a real <button> - deliberate,
// since this whole block sits inside the card's header <button> and a nested
// button is invalid HTML that browsers quietly break click handling on.
export default function BuildCardMeta({
  difficultyLabel,
  difficultyNote,
  blessings = [],
  godTier,
  relics = [],
  styles = [],
}) {
  return (
    <div className="build-card-meta">
      {difficultyLabel && (
        <TagTooltip className="build-difficulty" tooltip={difficultyNote}>
          {difficultyLabel}
        </TagTooltip>
      )}
      {blessings.length > 0 && (
        <div className="build-card-pills">
          {blessings.map((name) => (
            <BlessingPill key={name} name={name} />
          ))}
          {godTier && (
            <>
              <span className="build-card-arrow" aria-hidden="true">
                →
              </span>
              <BlessingPill name={godTier} isGodTier />
            </>
          )}
        </div>
      )}
      {relics.length > 0 && (
        <div className="build-card-chips">
          {relics.map((name) => (
            <LeagueRelicChip key={name} name={name} />
          ))}
        </div>
      )}
      <div className="build-card-styles">
        {styles.map((styleId) => (
          <span key={styleId} className={`build-style-tag build-style-tag-${styleId}`}>
            {STYLE_LABELS[styleId] ?? styleId}
          </span>
        ))}
      </div>
    </div>
  );
}
