// "Active users right now" - held in memory in this process, deliberately not
// in Postgres.
//
// WHY NOT A TABLE. The number is only ever asked for as "how many in the last
// few minutes", so nothing older than the window has any value. Persisting it
// would mean a table, an upsert RPC, RLS policies, and a pruning job, all to
// store data whose entire lifespan is shorter than the gap between two rollup
// runs. It would also put a write on every heartbeat from every visitor.
//
// WHY THIS IS SAFE HERE. deploy/docker-compose.yml runs exactly one `node`
// container, and /api/admin/summary is served by that same process, so the
// reader and the writer are always the same memory. If this service is ever
// scaled to more than one instance, each would report only its own share and
// this would need to move to Redis or a table - hence this comment.
//
// COST OF A RESTART: the count resets to zero on deploy and refills as
// heartbeats arrive, so it reads low for up to one heartbeat interval after a
// deploy. That is an acceptable trade for a live-traffic gauge.

// How long a session counts as active after its last ping. Comfortably more
// than the client's heartbeat interval so a single dropped request (sleeping
// tab, flaky connection) does not make someone flicker out of the count.
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

const lastSeenBySession = new Map();

// Called for every tracked request - a real pageview counts as activity just as
// much as a heartbeat does, so a visitor who is clicking around is never missed
// even between heartbeats.
export function markSessionActive(sessionId) {
  if (!sessionId) return;
  lastSeenBySession.set(sessionId, Date.now());
}

export function countActiveSessions() {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  let active = 0;
  for (const lastSeen of lastSeenBySession.values()) {
    if (lastSeen > cutoff) active += 1;
  }
  return active;
}

// Without this the Map would keep one entry per session seen since boot, which
// is a slow leak on a long-running process. Sweeping on a timer rather than
// inside countActiveSessions keeps the read cheap and bounds memory even if
// nobody ever opens the admin dashboard.
const sweepTimer = setInterval(() => {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [sessionId, lastSeen] of lastSeenBySession) {
    if (lastSeen <= cutoff) lastSeenBySession.delete(sessionId);
  }
}, SWEEP_INTERVAL_MS);

// Nothing should be kept alive by a metrics sweep.
sweepTimer.unref();
