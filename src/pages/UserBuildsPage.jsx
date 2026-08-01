import { useCallback, useEffect, useRef, useState } from 'react';
import UserBuildListItem from '../components/UserBuildListItem';
import ReportBuildModal from '../components/ReportBuildModal';
import {
  adminListUserBuilds,
  adminSetBuildFeatured,
  adminSetBuildHidden,
  fetchBuildVotes,
  listUserBuilds,
} from '../utils/api';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { IS_PAGES_BUILD, LIVE_SITE_URL } from '../utils/deployTarget';

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
  //
  // The sequence guard is load-bearing, not defensive tidiness. useIsAdmin
  // starts `false` and settles asynchronously, so this runs TWICE on every
  // admin visit - once for the public list, once for the admin one - and
  // without it whichever response happened to land last won. An admin would
  // intermittently get the public listing: no hidden builds, no vote split,
  // every Hidden box unchecked, with nothing to indicate it had happened.
  const requestSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    const isStale = () => seq !== requestSeq.current;
    try {
      const rows = isAdmin
        ? await adminListUserBuilds().catch(() => listUserBuilds())
        : await listUserBuilds();
      if (isStale()) return;
      setBuilds(rows);
      setError(false);
    } catch {
      if (!isStale()) setError(true);
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

  // Optimistic for both flags: the checkbox should respond at once, and a
  // failure is corrected by reloading the real state.
  function moderate(id, patch, request) {
    setBuilds((prev) => prev?.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    request().catch(() => load());
  }

  function handleToggleHidden(id, hidden) {
    moderate(id, { hidden }, () => adminSetBuildHidden(id, hidden));
  }

  function handleToggleFeatured(id, featured) {
    moderate(id, { featured }, () => adminSetBuildFeatured(id, featured));
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
            Admin view - hidden builds appear here and nowhere else. Featuring one puts it on the{' '}
            <a href="#build-guides" className="notice-link">
              Build Guides
            </a>{' '}
            page.
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
                vote={votes[summary.id]}
                onVoted={handleVoted}
                onReport={setReporting}
                isAdmin={isAdmin}
                onToggleHidden={handleToggleHidden}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </section>
        )}
      </main>

      {reporting && <ReportBuildModal build={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
