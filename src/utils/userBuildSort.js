// Ordering for the user-made builds listing.
//
// All three modes sort CLIENT-SIDE. The server hands back the whole visible set
// (100 rows, see LIST_LIMIT in server/src/routes/userBuilds.js) already ordered
// newest-first, and the vote scores arrive from a second endpoint - so the data
// two of these modes need is only assembled in the browser anyway. Sorting here
// also means switching mode is instant and costs no request.

export const SORT_MODES = [
  { id: 'standard', label: 'Standard', hint: '' },
  { id: 'newest', label: 'Newest', hint: 'Most recently published first' },
  { id: 'best', label: 'Best', hint: 'Highest net votes first' },
];

export const DEFAULT_SORT_MODE = 'standard';

export function isSortMode(value) {
  return SORT_MODES.some((mode) => mode.id === value);
}

// ------------------------------------------------------------ STANDARD SCORE

// One net vote (upvotes minus downvotes) is worth this much.
export const VOTE_POINTS = 100;

// Awarded to whichever build has the most net votes. Ties all take it: giving
// it to only one of two builds on 12 votes would make the bonus depend on
// whatever order they happened to be in.
export const TOP_VOTED_BONUS = 1000;

// Recency, and the ONLY part of this that is not additive: a build takes the
// points of the first band it falls inside and no others. A build two hours old
// scores 1,000, not 1,000 + 500 + 300.
//
// The first band is deliberately enormous. Anything published in the last hour
// outranks all but a build with ~80 net votes, so new builds get a guaranteed
// hour at the top of the default feed and then drop 9,000 points at once. That
// cliff is intended, not an oversight.
export const RECENCY_BANDS = [
  { withinHours: 1, points: 10000 },
  { withinHours: 3, points: 1000 },
  { withinHours: 8, points: 500 },
  { withinHours: 24, points: 300 },
];

const HOUR_MS = 60 * 60 * 1000;

// Rows come from PostgREST as `created_at`; anything that has already been
// through a client-side shaping step may carry `createdAt`. Reading both keeps
// this usable from either side without the caller having to normalise first.
export function createdAtMs(build) {
  const parsed = Date.parse(build?.created_at ?? build?.createdAt ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function recencyPoints(build, now) {
  const created = createdAtMs(build);
  if (!created) return 0;
  const age = now - created;
  // A negative age means the client's clock is behind the server's. Treating it
  // as brand new is the benign reading - the alternative, falling through every
  // band to 0, would bury a build for being too recent.
  if (age < 0) return RECENCY_BANDS[0].points;
  for (const band of RECENCY_BANDS) {
    if (age < band.withinHours * HOUR_MS) return band.points;
  }
  return 0;
}

// `votes` is the map fetchBuildVotes returns: { [id]: { score, myVote } }.
// A build with no entry scores 0 rather than being excluded - votes are
// decoration that can fail to load, and the list must still order sensibly.
export function netVotes(votes, id) {
  const score = votes?.[id]?.score;
  return Number.isFinite(score) ? score : 0;
}

// The highest net vote count in the list, or 0 if nothing is above water.
// Returning 0 is what suppresses TOP_VOTED_BONUS on an unvoted list, where
// every build would otherwise tie at the top and all take it - which is the
// same as none of them taking it, only with more arithmetic.
//
// HIDDEN BUILDS ARE EXCLUDED. They score zero themselves, so counting them here
// would let one reach out and change the ranking of builds that are actually on
// the page: a hidden build on 20 votes would take the bonus away from the best
// visible build on 12, which then drops 1,000 points for no reason a viewer
// could see. A moderated-away build should be inert, not merely bottom.
export function topVoteCount(builds, votes) {
  let top = 0;
  for (const build of builds) {
    if (build?.hidden) continue;
    top = Math.max(top, netVotes(votes, build.id));
  }
  return top;
}

// Which band a build landed in, for the admin readout. Null once it is past
// every band, which is also when recencyPoints returns 0.
export function recencyBandLabel(build, now) {
  const created = createdAtMs(build);
  if (!created) return null;
  const age = Math.max(0, now - created);
  const band = RECENCY_BANDS.find((entry) => age < entry.withinHours * HOUR_MS);
  return band ? `< ${band.withinHours}h` : null;
}

// The standard score with its working shown. scoreBuild delegates to this
// rather than repeating the arithmetic, so the number an admin reads and the
// number the sort uses cannot drift apart.
export function scoreBreakdown(build, { votes, topVotes, now = Date.now() } = {}) {
  // A hidden build scores nothing at all - no vote points, no recency, no
  // most-voted bonus. It is only ever on screen in the admin listing (the
  // public one never returns hidden rows), and a moderated-away build sitting
  // near the top on the strength of its first hour is the opposite of what
  // hiding it was for.
  if (build?.hidden) return { total: 0, parts: [], hidden: true };

  const net = netVotes(votes, build.id);
  const recency = recencyPoints(build, now);
  const isTop = topVotes > 0 && net === topVotes;

  const parts = [
    net !== 0 && { key: 'votes', points: net * VOTE_POINTS, label: `${net} vote${Math.abs(net) === 1 ? '' : 's'}` },
    recency > 0 && { key: 'recency', points: recency, label: recencyBandLabel(build, now) },
    isTop && { key: 'top', points: TOP_VOTED_BONUS, label: 'most voted' },
  ].filter(Boolean);

  return { total: parts.reduce((sum, part) => sum + part.points, 0), parts, hidden: false };
}

export function scoreBuild(build, context) {
  return scoreBreakdown(build, context).total;
}

// --------------------------------------------------------------------- SORT

// Newest is every mode's tiebreak, not just its own: two builds on identical
// scores or identical vote counts should still come out in a stable, meaningful
// order rather than whatever the array happened to hold.
const byNewest = (a, b) => createdAtMs(b) - createdAtMs(a);

export function sortUserBuilds(builds, mode, votes, now = Date.now()) {
  if (!Array.isArray(builds)) return [];
  const rows = [...builds];

  if (mode === 'newest') return rows.sort(byNewest);

  if (mode === 'best') {
    return rows.sort((a, b) => netVotes(votes, b.id) - netVotes(votes, a.id) || byNewest(a, b));
  }

  const topVotes = topVoteCount(rows, votes);
  const scores = new Map(rows.map((build) => [build.id, scoreBuild(build, { votes, topVotes, now })]));
  return rows.sort((a, b) => scores.get(b.id) - scores.get(a.id) || byNewest(a, b));
}
