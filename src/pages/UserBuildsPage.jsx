import { useCallback, useEffect, useState } from 'react';
import UserBuildCard from '../components/UserBuildCard';
import BuildVoteBar from '../components/BuildVoteBar';
import ReportBuildModal from '../components/ReportBuildModal';
import {
  adminListUserBuilds,
  adminSetBuildHidden,
  fetchBuildVotes,
  getUserBuild,
  listUserBuilds,
} from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { IS_PAGES_BUILD, LIVE_SITE_URL } from '../utils/deployTarget';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// One row from the list endpoint (id/name/tagline/styles/author/created_at,
// no payload) - expands in place into a full UserBuildCard once its payload
// is fetched and sanitized, same lazy-load-on-open shape as a lot of this
// app's other detail panels (e.g. RelicDropTablePanel).
//
// The vote bar sits OUTSIDE the expand button, never inside it: a nested
// button is invalid HTML and browsers silently break click handling on it -
// the same reason RelicDropTablePanel's toggle is a sibling of its row button.
function UserBuildListItem({ summary, votes, onVoted, onReport, isAdmin, onToggleHidden }) {
  const [expanded, setExpanded] = useState(false);
  const [build, setBuild] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  async function handleToggle() {
    const opening = !expanded;
    setExpanded(opening);
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

  const vote = votes[summary.id] ?? { score: 0, myVote: 0 };

  // Under every card whether open or not, so voting never means opening a
  // build first.
  const footer = (
    <div className="user-build-footer">
      <BuildVoteBar
        buildId={summary.id}
        score={vote.score}
        myVote={vote.myVote}
        onVoted={(next) => onVoted(summary.id, next)}
        onReport={() => onReport(summary)}
      />
      {isAdmin && (
        <label className="user-build-hide-toggle">
          <input
            type="checkbox"
            checked={Boolean(summary.hidden)}
            onChange={(event) => onToggleHidden(summary.id, event.target.checked)}
          />
          <span>Hidden</span>
          <span className="user-build-hide-note">
            {summary.hidden ? 'Only admins can see this build.' : 'Tick to remove it from public view.'}
          </span>
        </label>
      )}
    </div>
  );

  // An open, loaded card renders UserBuildCard, which owns its own <article> -
  // so the footer is a sibling of it rather than something wrapped around it.
  if (expanded && build && status === 'idle') {
    return (
      <div className={`user-build-entry${summary.hidden ? ' is-hidden-build' : ''}`}>
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
        <div className="build-card-styles">
          {summary.styles.map((styleId) => (
            <span key={styleId} className={`build-style-tag build-style-tag-${styleId}`}>
              {STYLE_LABELS[styleId] ?? styleId}
            </span>
          ))}
        </div>
        <span className="build-card-chevron" aria-hidden="true">▸</span>
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
    <div className={`user-build-entry${summary.hidden ? ' is-hidden-build' : ''}`}>
      <article className={`build-card user-build-card${expanded ? ' expanded' : ''}`}>{body}</article>
      {footer}
    </div>
  );
}

export default function UserBuildsPage() {
  const [builds, setBuilds] = useState(null); // null = loading
  const [error, setError] = useState(false);
  const [votes, setVotes] = useState({});
  const [reporting, setReporting] = useState(null);
  const isAdmin = useIsAdmin();

  // Admins get the moderation listing, which includes builds hidden from
  // everyone else - that is the only way to un-hide one. Falls back to the
  // public list if that call fails, so a broken admin endpoint degrades to a
  // normal view rather than an empty page.
  const load = useCallback(async () => {
    try {
      const rows = isAdmin
        ? await adminListUserBuilds().catch(() => listUserBuilds())
        : await listUserBuilds();
      setBuilds(rows);
      setError(false);
    } catch {
      setError(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Scores are decoration - fetchBuildVotes swallows failures and resolves
    // to {}, so a votes outage leaves the buttons at zero rather than
    // blocking the list.
    fetchBuildVotes().then(setVotes);
  }, []);

  function handleVoted(id, next) {
    setVotes((prev) => ({ ...prev, [id]: next }));
  }

  async function handleToggleHidden(id, hidden) {
    // Optimistic: the checkbox should respond at once, and a failure is
    // corrected by reloading the real state.
    setBuilds((prev) => prev?.map((b) => (b.id === id ? { ...b, hidden } : b)));
    try {
      await adminSetBuildHidden(id, hidden);
    } catch {
      load();
    }
  }

  return (
    <>
      <header>
        <h1>User made builds</h1>
        {IS_PAGES_BUILD ? (
          <p>
            Visit{' '}
            <a href={`${LIVE_SITE_URL}#user-builds`} className="notice-link">
              {LIVE_SITE_URL}#user-builds
            </a>{' '}
            to create and view user builds.
          </p>
        ) : (
          <p>
            Builds created by other players - their gear, relics, regions and write-ups, not this site's own
            curated picks. Want to add yours?{' '}
            <a href="#create-build" className="notice-link">
              Create a build
            </a>.
          </p>
        )}
      </header>

      <main className="build-guides-page">
        {isAdmin && !error && (
          <p className="user-build-admin-note">
            Admin view - hidden builds appear here and nowhere else.
          </p>
        )}
        {error && (
          <p className="build-setup-note">
            User made builds need the site's backend, which isn't available here (e.g. the GitHub Pages
            mirror). Try the live site instead.
          </p>
        )}
        {!error && builds === null && <p className="build-setup-note">Loading…</p>}
        {!error && builds?.length === 0 && (
          <p className="build-setup-note">
            No builds yet - <a href="#create-build" className="notice-link">be the first to publish one</a>.
          </p>
        )}
        {!error && builds && builds.length > 0 && (
          <section className="build-list">
            {builds.map((summary) => (
              <UserBuildListItem
                key={summary.id}
                summary={summary}
                votes={votes}
                onVoted={handleVoted}
                onReport={setReporting}
                isAdmin={isAdmin}
                onToggleHidden={handleToggleHidden}
              />
            ))}
          </section>
        )}
      </main>

      {reporting && <ReportBuildModal build={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
