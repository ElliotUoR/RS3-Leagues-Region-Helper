import { useEffect, useRef, useState } from 'react';
import UserBuildCard from './UserBuildCard';
import BuildCardMeta from './BuildCardMeta';
import BuildVoteBar from './BuildVoteBar';
import ShareBuildButton from './ShareBuildButton';
import { getUserBuild, trackUsage } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { hasEditAccess } from '../utils/myBuilds';
import { userBuildCounterKey } from '../utils/usageKeys';
import { sanitizeBlessingSelection } from '../hooks/useBlessingSelection';
import { sanitizeLeagueRelicSelection } from '../hooks/useLeagueRelicSelection';
import { resolveGodTier } from '../data/blessings';

// The listing hands over the blessing/relic names straight out of the stored
// payload, which is opaque JSON server-side - so they go through the same
// sanitizers sanitizeUserBuildPayload uses before the open card renders them.
// That is what makes the collapsed header identical to the open one rather
// than merely similar: same names, same order, same two-picks-in-one-tier
// resolution.
//
// The god power is not stored at all - only the three tier picks are, and it
// is derived from them on read - so it is derived here too.
function summaryMeta(summary) {
  const blessings = sanitizeBlessingSelection(summary.blessings);
  return {
    blessings,
    relics: sanitizeLeagueRelicSelection(summary.relics),
    godTier: blessings.length === 3 ? resolveGodTier(blessings)?.name ?? null : null,
  };
}

// Hidden is stated first because it overrides featured everywhere it matters:
// a hidden build is pulled off the Build Guides page by the same RLS policy
// that hides it from the listing, whether or not the featured flag is still on.
function adminNoteFor(summary) {
  if (summary.hidden) return 'Hidden - only admins can see this build.';
  if (summary.featured) return 'Featured on the Build Guides page.';
  return 'Feature it, hide it, or edit it.';
}

// One row from the list endpoint (no `payload` - see the Node route) - expands
// in place into a full UserBuildCard once its payload is fetched and
// sanitized, the same lazy-load-on-open shape as a lot of this app's other
// detail panels (e.g. RelicDropTablePanel).
//
// The collapsed header draws the SAME meta block the open card does, from the
// blessing/relic/difficulty fields the listing lifts out of the payload. It
// used to show combat styles only, so a card visibly gained its pills the
// moment you clicked it and lost them again when you closed it.
//
// The footer sits OUTSIDE the expand button, never inside it: a nested button
// is invalid HTML and browsers silently break click handling on it - the same
// reason RelicDropTablePanel's toggle is a sibling of its row button.
// `initialBuild` + `defaultExpanded` are for the shared-link case: the page
// following a /build-guides/<slug> link has already fetched the whole row to
// resolve the slug, so re-fetching it on mount just to open the card would be
// a second request for something already in hand.
export default function UserBuildListItem({
  summary,
  vote,
  onVoted,
  onReport,
  isAdmin = false,
  onToggleHidden,
  onToggleFeatured,
  initialBuild = null,
  defaultExpanded = false,
  score = null,
  onUse,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [build, setBuild] = useState(initialBuild);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const entryRef = useRef(null);
  const meta = summaryMeta(summary);

  // Landing on a shared link counts as a view of that build, the same way
  // BuildGuidesPage already counts a direct "#build-guides/<id>" load for a
  // curated guide - handleToggle below only ever sees deliberate clicks.
  useEffect(() => {
    if (defaultExpanded) trackUsage([{ category: 'build_guide', key: userBuildCounterKey(summary.id) }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening a card that sits below the fold otherwise leaves you reading its
  // middle - scroll its top edge to the top of the viewport so the build starts
  // where you are looking. Only on open, never on close, so collapsing does not
  // yank the page around. Same behaviour BuildGuideCard has for curated guides.
  //
  // `build` is a dependency as well as `expanded` because this card loads its
  // payload AFTER opening: the first scroll happens while it is still a
  // one-line "Loading…", which is often too short to reach the top of the
  // viewport at all. Re-running once the real content lands settles it there.
  // Covers all three ways a card opens - clicked in the listing, clicked in the
  // featured strip, or already open from a shared link (defaultExpanded, where
  // this runs on mount).
  useEffect(() => {
    if (!expanded || !entryRef.current) return;
    entryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [expanded, build]);

  async function handleToggle() {
    const opening = !expanded;
    setExpanded(opening);
    // Only when actually opening, not closing - "was this build looked at" is
    // the question, same convention as the curated guides on BuildGuidesPage
    // and as RelicDropTablePanel's own toggle. Fires on every open rather than
    // only the first, for the same reason: two visits are two views even
    // though the second costs no fetch.
    if (opening) trackUsage([{ category: 'build_guide', key: userBuildCounterKey(summary.id) }]);
    if (opening && !build && status !== 'loading') {
      setStatus('loading');
      try {
        const row = await getUserBuild(summary.id);
        const sanitized = sanitizeUserBuildPayload(row.payload);
        if (!sanitized) throw new Error('malformed build');
        setBuild(sanitized);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    }
  }

  // Under every card whether open or not, so voting never means opening a
  // build first.
  const footer = (
    <div className="user-build-footer">
      <BuildVoteBar
        buildId={summary.id}
        score={vote?.score ?? 0}
        myVote={vote?.myVote ?? 0}
        onVoted={(next) => onVoted?.(summary.id, next)}
        onReport={() => onReport?.(summary)}
      />
      <ShareBuildButton slug={summary.slug} />
      {/* Every build also has an edit password (see deploy/migrations/
          018_user_build_password.sql), so this always leads somewhere useful -
          straight through for this browser's own builds, a password prompt for
          everyone else's (see EditBuildPage.jsx) - never a dead end. Skipped
          for admins: they already have their own Edit link in the admin
          controls below, and showing both here would just be two links to the
          same place. */}
      {!isAdmin && (
        <a href={`#edit-build/${summary.id}`} className="user-build-edit-button">
          {hasEditAccess(summary.id) ? 'Edit' : 'Edit…'}
        </a>
      )}
      {/* Forks into "copy into a build guide" (a fresh Create-a-Build form,
          always publishing as a brand new build - see pages/CopyBuildPage.jsx)
          and "load into My Build" (overwrites the chosen parts of your own
          saved setup). See components/UseBuildModal.jsx. */}
      <button type="button" className="user-build-copy-button" onClick={() => onUse?.(summary, build)}>
        Use this build
      </button>
      {isAdmin && (
        <div className="user-build-admin-controls">
          {/* The public score is floored at 0 and merges the two directions, so
              it cannot answer "is this 12-up-12-down or has nobody voted".
              Admins get the raw split. */}
          <span className="user-build-vote-split" title="Individual up and down votes">
            <span className="user-build-vote-up">▲ {summary.upvotes ?? 0}</span>
            <span className="user-build-vote-down">▼ {summary.downvotes ?? 0}</span>
            {typeof summary.raw_score === 'number' && summary.raw_score < 0 && (
              <span className="user-build-vote-raw">net {summary.raw_score}</span>
            )}
          </span>
          {/* Only supplied while the listing is in Standard order (see
              UserBuildsPage) - it is the one mode whose ordering cannot be read
              off the card itself. Shown with its working, because "why is this
              above that" is the actual question, and 1,300 on its own does not
              answer it. */}
          {score && (
            <span className="user-build-score" title="Standard sort score">
              <strong>{score.total.toLocaleString()}</strong> pts
              {score.hidden && <span className="user-build-score-parts">hidden builds score nothing</span>}
              {!score.hidden && score.parts.length > 0 && (
                <span className="user-build-score-parts">
                  {score.parts.map((part) => `${part.points.toLocaleString()} ${part.label}`).join(' + ')}
                </span>
              )}
            </span>
          )}
          <label className="user-build-hide-toggle">
            <input
              type="checkbox"
              checked={Boolean(summary.featured)}
              onChange={(event) => onToggleFeatured?.(summary.id, event.target.checked)}
            />
            <span className="user-build-flag-featured">Featured</span>
          </label>
          <label className="user-build-hide-toggle">
            <input
              type="checkbox"
              checked={Boolean(summary.hidden)}
              onChange={(event) => onToggleHidden?.(summary.id, event.target.checked)}
            />
            <span className="user-build-flag-hidden">Hidden</span>
          </label>
          {/* Same route the build's own author uses - EditBuildPage falls back
              to the admin edit path when this browser has no edit token for
              the build (see utils/myBuilds.js). */}
          <a href={`#edit-build/${summary.id}`} className="user-build-admin-edit">
            Edit
          </a>
          <span className="user-build-hide-note">{adminNoteFor(summary)}</span>
        </div>
      )}
    </div>
  );

  const entryClasses = [
    'user-build-entry',
    summary.hidden ? 'is-hidden-build' : '',
    summary.featured ? 'is-featured-build' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // An open, loaded card renders UserBuildCard, which owns its own <article> -
  // so the footer is a sibling of it rather than something wrapped around it.
  if (expanded && build && status === 'idle') {
    return (
      <div ref={entryRef} className={entryClasses}>
        <UserBuildCard build={build} expanded onToggle={handleToggle} />
        {footer}
      </div>
    );
  }

  let body;
  if (!expanded) {
    body = (
      <button type="button" className="build-card-head" onClick={handleToggle} aria-expanded={false}>
        <div className="build-card-headline">
          <h3 className="build-card-name">{summary.name}</h3>
          <p className="build-card-tagline">{summary.tagline}</p>
          {summary.author_name && <p className="user-build-author">by {summary.author_name}</p>}
        </div>
        <BuildCardMeta
          difficultyLabel={summary.difficultyLabel}
          difficultyNote={summary.difficultyNote}
          blessings={meta.blessings}
          godTier={meta.godTier}
          relics={meta.relics}
          styles={summary.styles}
        />
        <span className="build-card-chevron" aria-hidden="true">
          ▸
        </span>
      </button>
    );
  } else if (status === 'loading') {
    body = <p className="build-setup-note">Loading…</p>;
  } else {
    body = (
      <p className="build-setup-note">
        Couldn't load this build.{' '}
        <button type="button" className="notice-link" onClick={handleToggle}>
          Try again
        </button>
      </p>
    );
  }

  return (
    <div ref={entryRef} className={entryClasses}>
      <article className={`build-card user-build-card${expanded ? ' expanded' : ''}`}>{body}</article>
      {footer}
    </div>
  );
}
