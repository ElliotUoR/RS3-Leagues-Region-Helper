import { useEffect, useState } from 'react';
import UserBuildCard from '../components/UserBuildCard';
import { getUserBuild, listUserBuilds } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// One row from the list endpoint (id/name/tagline/styles/author/created_at,
// no payload) - expands in place into a full UserBuildCard once its payload
// is fetched and sanitized, same lazy-load-on-open shape as a lot of this
// app's other detail panels (e.g. RelicDropTablePanel).
function UserBuildListItem({ summary }) {
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

  if (!expanded) {
    return (
      <article className="build-card user-build-card">
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
      </article>
    );
  }

  if (status === 'loading') {
    return (
      <article className="build-card user-build-card expanded">
        <p className="build-setup-note">Loading…</p>
      </article>
    );
  }

  if (status === 'error' || !build) {
    return (
      <article className="build-card user-build-card expanded">
        <p className="build-setup-note">Couldn't load this build. <button type="button" className="notice-link" onClick={handleToggle}>Try again</button></p>
      </article>
    );
  }

  return <UserBuildCard build={build} expanded onToggle={handleToggle} />;
}

export default function UserBuildsPage() {
  const [builds, setBuilds] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listUserBuilds()
      .then((rows) => {
        if (!cancelled) setBuilds(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header>
        <h1>User made builds</h1>
        <p>
          Builds created by other players - their gear, relics, regions and write-ups, not this site's own
          curated picks. Want to add yours?{' '}
          <a href="#create-build" className="notice-link">
            Create a build
          </a>
          .
        </p>
      </header>

      <main className="build-guides-page">
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
              <UserBuildListItem key={summary.id} summary={summary} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
