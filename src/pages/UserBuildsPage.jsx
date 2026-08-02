import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UserBuildListItem from '../components/UserBuildListItem';
import ReportBuildModal from '../components/ReportBuildModal';
import {
  DEFAULT_SORT_MODE,
  SORT_MODES,
  isSortMode,
  scoreBreakdown,
  sortUserBuilds,
  topVoteCount,
} from '../utils/userBuildSort';
import {
  adminListUserBuilds,
  adminSetBuildFeatured,
  adminSetBuildHidden,
  fetchBuildVotes,
  listUserBuilds,
} from '../utils/api';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { IS_PAGES_BUILD, LIVE_SITE_URL } from '../utils/deployTarget';

// Ten to a page. The server hands back up to 100 rows in one request (see
// LIST_LIMIT), so paging is purely a display concern - switching page costs no
// request and every mode sorts the WHOLE list before it is sliced, not just the
// page on screen.
const BUILDS_PER_PAGE = 10;

const SORT_STORAGE_KEY = 'rs3-leagues-user-builds-sort';

function loadInitialSortMode() {
  if (typeof window === 'undefined') return DEFAULT_SORT_MODE;
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    return isSortMode(stored) ? stored : DEFAULT_SORT_MODE;
  } catch {
    return DEFAULT_SORT_MODE;
  }
}

export default function UserBuildsPage() {
  const [builds, setBuilds] = useState(null); // null = loading
  const [error, setError] = useState(false);
  const [votes, setVotes] = useState({});
  const [reporting, setReporting] = useState(null);
  const [sortMode, setSortMode] = useState(loadInitialSortMode);
  const [page, setPage] = useState(1);
  const listRef = useRef(null);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, sortMode);
    } catch {
      // A browser with storage blocked still sorts, it just forgets the choice.
    }
  }, [sortMode]);

  // Re-sorts when the votes land, which is a moment after the list itself -
  // Standard and Best both read scores, so the order settles once rather than
  // being wrong until someone switches mode.
  const sorted = useMemo(
    () => (builds ? sortUserBuilds(builds, sortMode, votes) : null),
    [builds, sortMode, votes],
  );

  // Admin-only, and only in Standard - the other two modes sort on a figure
  // already on screen (the vote count, the publish order), so there is nothing
  // hidden to explain. Standard is the one whose ordering is otherwise opaque.
  const scores = useMemo(() => {
    if (!isAdmin || sortMode !== 'standard' || !sorted) return null;
    const topVotes = topVoteCount(sorted, votes);
    const now = Date.now();
    return new Map(sorted.map((build) => [build.id, scoreBreakdown(build, { votes, topVotes, now })]));
  }, [isAdmin, sortMode, sorted, votes]);

  const pageCount = Math.max(1, Math.ceil((sorted?.length ?? 0) / BUILDS_PER_PAGE));
  // Clamped rather than corrected in an effect: hiding the last build on page 4
  // as an admin drops the list to 3 pages, and deriving the safe value renders
  // the right page immediately instead of painting an empty one first.
  const currentPage = Math.min(page, pageCount);
  const visible = sorted?.slice((currentPage - 1) * BUILDS_PER_PAGE, currentPage * BUILDS_PER_PAGE) ?? [];

  function changeSort(mode) {
    setSortMode(mode);
    // A different order makes the old page number meaningless.
    setPage(1);
  }

  function goToPage(next) {
    setPage(next);
    // Without this you land halfway down page 2, since the page you came from
    // was as tall as the viewport. Matches how opening a build scrolls it to
    // the top.
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
        {!error && sorted && sorted.length > 0 && (
          <>
            <div className="user-build-sort" ref={listRef}>
              <div className="user-build-sort-modes" role="tablist" aria-label="Sort builds">
                {SORT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={sortMode === mode.id}
                    className={`user-build-sort-mode${sortMode === mode.id ? ' active' : ''}`}
                    onClick={() => changeSort(mode.id)}
                    title={mode.hint}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="user-build-sort-hint">
                {SORT_MODES.find((mode) => mode.id === sortMode)?.hint}
              </p>
            </div>

            <section className="build-list">
              {visible.map((summary) => (
                <UserBuildListItem
                  key={summary.id}
                  summary={summary}
                  vote={votes[summary.id]}
                  onVoted={handleVoted}
                  onReport={setReporting}
                  isAdmin={isAdmin}
                  onToggleHidden={handleToggleHidden}
                  onToggleFeatured={handleToggleFeatured}
                  score={scores?.get(summary.id)}
                />
              ))}
            </section>

            {/* One page of builds needs no pager. */}
            {pageCount > 1 && (
              <nav className="user-build-pager" aria-label="Build list pages">
                <button
                  type="button"
                  className="user-build-page-step"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`user-build-page${n === currentPage ? ' active' : ''}`}
                    aria-current={n === currentPage ? 'page' : undefined}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="user-build-page-step"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                >
                  Next ›
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      {reporting && <ReportBuildModal build={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
