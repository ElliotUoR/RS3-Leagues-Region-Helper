import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
import { RELIC_COLOURS } from '../data/blessingBuilds';
import { BLESSING_BY_NAME, LEAGUE_RELIC_BY_NAME } from '../data/buildLookups';
import { difficultyLevelFor, difficultyNoteFor } from '../utils/difficultyTag';

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

// The difficulty pill, shared by curated guides and user builds so the two look
// identical. It lives in the card's BYLINE rather than in the meta block - see
// the callers - because it belongs with who made the build, not with what the
// build contains.
//
// `level` is the numeric execution difficulty a curated guide carries. A user
// build has only free text, so it is matched against the keyword rules in
// utils/difficultyTag.js; an unmatched label still renders, just without a
// colour, since a wrong difficulty is worse than an uncoloured one.
//
// TagTooltip renders a <span role="button">, not a real <button> - deliberate,
// since this sits inside the card's header <button> and a nested button is
// invalid HTML that browsers quietly break click handling on.
export function BuildDifficultyTag({ label, note, level }) {
  if (!label) return null;
  const resolved = level ?? difficultyLevelFor(label);
  const classes = ['build-difficulty', resolved ? `build-difficulty-${resolved}` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <TagTooltip className={classes} tooltip={note ?? difficultyNoteFor(resolved)}>
      {label}
    </TagTooltip>
  );
}

// The byline row: who made it, and how hard it is to play. One row so the
// difficulty sits to the RIGHT of the author - and, on a curated guide with no
// author, alone at the bottom-left of the headline.
export function BuildByline({ author, difficulty }) {
  if (!author && !difficulty) return null;
  return (
    <div className="build-card-byline">
      {author && <span className="user-build-author">by {author}</span>}
      {difficulty}
    </div>
  );
}

export default function BuildCardMeta({
  blessings = [],
  godTier,
  relics = [],
  styles = [],
}) {
  return (
    <div className="build-card-meta">
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
