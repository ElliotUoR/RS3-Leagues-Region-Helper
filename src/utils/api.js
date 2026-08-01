// Thin client for the optional backend described in docs/deployment.md.
// These calls only succeed once the site is served from a domain that has
// /Leagues/api/* routed to the Node service (see deploy/Caddyfile.snippet) -
// on GitHub Pages there's no backend at all, so every call here is expected
// to fail there. Callers treat that failure as "feature unavailable" (see
// GearPage's handleShorten/ReportIssueButton), never as something to crash
// the page over.
//
// APP_BASE_PATH is the site's mount path on the real deployment
// (jellyflow.xyz/Leagues) - hardcoded rather than derived from
// window.location, since a bare `/Leagues` (no trailing slash) is
// ambiguous to parse back out of a URL, whereas Caddy always redirects to
// the trailing-slash form and every fetch here needs the exact same prefix
// every time. Harmless on GitHub Pages: these calls fail there regardless
// of what path they hit, since there's no backend at all.
const APP_BASE_PATH = '/Leagues/';

export async function createShortLink(payload) {
  const res = await fetch(`${APP_BASE_PATH}api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error(`shorten failed: ${res.status}`);
  const { code } = await res.json();
  return `${window.location.origin}${APP_BASE_PATH}s/${code}`;
}

// Resolves a short code back to its compressed build payload by calling one
// of two PostgREST RPCs directly (see deploy/migrations/001_init.sql and
// .../006_shortlink_untracked_lookup.sql) - not the Node service. The Node
// service no longer owns /s/:code at all (see App.jsx's short-link
// handling): the short URL is served the SPA itself now, so the address bar
// keeps showing the short link instead of expanding into a long `?share=`
// one, and this is what resolves the code into an actual build once the app
// loads. Returns null on any failure (unknown code, offline, backend down).
//
// `untracked: true` (App.jsx passes this when fetchIsAdmin() says so) calls
// the read-only variant that never touches click_count/last_clicked_at -
// browsing your own share links from the admin panel shouldn't count as a
// click (see 005_shortlink_clicks_and_ua.sql).
//
// PostgREST's exact JSON shape for a scalar-returning function varies by
// version/config - a bare string (`"abc123"`), a single object
// (`{"get_short_link_payload": "abc123"}`), or an array of one such object -
// normalized down to the plain string (or null) here, mirroring what the
// now-removed server-side callScalarRpc used to do.
export async function resolveShortCode(code, { untracked = false } = {}) {
  const rpcName = untracked ? 'get_short_link_payload_untracked' : 'get_short_link_payload';
  try {
    const res = await fetch(`${APP_BASE_PATH}rest/rpc/${rpcName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data;
    if (typeof data !== 'object') return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    const value = Object.values(row)[0];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

export async function submitIssueReport(body) {
  const res = await fetch(`${APP_BASE_PATH}api/report-issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `report-issue failed: ${res.status}`);
  }
}

// Fire-and-forget - deliberately swallows every failure so a missing/
// unreachable backend can never surface as a broken page. session_id is
// derived server-side from the request's real IP, never computed here -
// see server/src/lib/session.js for why. The server itself skips recording
// anything for a logged-in admin (see server/src/routes/track.js) - this
// call still fires either way, it's just a no-op there.
export function trackPageview(path) {
  fetch(`${APP_BASE_PATH}api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'pageview', path, referrer: document.referrer || undefined }),
  }).catch(() => {});
}

// "Still here" ping from an open tab, so a visitor reading one page keeps
// counting towards active users (see hooks/useHeartbeat.js). Goes to the same
// endpoint as a pageview but is NOT stored - the server marks the session
// active and drops it, so it never reaches page_events or affects any existing
// figure. See server/src/routes/track.js.
export function trackHeartbeat() {
  fetch(`${APP_BASE_PATH}api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'heartbeat', path: window.location.hash || '#home' }),
  }).catch(() => {});
}

// Ever-incrementing usage counters (see server/routes/trackCounter.js) for
// product questions pageviews don't answer - "how often is each region
// picked", "how many people used the import-relics API", etc. `increments`
// is an array of { category, key } pairs so one user action (e.g. locking
// in a 3-region combo) is one request, not several. Same fire-and-forget
// philosophy as trackPageview - never surfaces a failure to the visitor.
export function trackUsage(increments) {
  fetch(`${APP_BASE_PATH}api/track-counter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increments }),
  }).catch(() => {});
}

// User-submitted Build Guides (see pages/CreateBuildPage.jsx and
// pages/UserBuildsPage.jsx) - only available once the backend is deployed,
// same as every other call in this file. Callers treat a thrown/rejected
// promise as "feature unavailable" and show that state rather than crashing.
// Resolves to `{ id, token }` - `token` is the edit credential, shown/stored
// exactly once (see utils/myBuilds.js) since the server only ever keeps its
// hash from this point on.
export async function createUserBuild({ name, tagline, authorName, styles, payload }) {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, tagline, authorName, styles, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `create build failed: ${res.status}`);
    // Carried so the auto-filed issue can say WHICH failure this was without
    // the caller having to re-read the response (see utils/autoReport.js).
    err.status = res.status;
    err.reason = data.reason;
    throw err;
  }
  return data;
}

// Edits an existing build - `token` must match the one handed back at
// creation (see utils/myBuilds.js) or this rejects with a 403-derived error.
export async function updateUserBuild(id, token, { name, tagline, authorName, styles, payload }) {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name, tagline, authorName, styles, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `update build failed: ${res.status}`);
  return data;
}

// The listing view (name/tagline/styles/author/created_at only, no payload -
// see the Node route) for the "User made builds" page's cards.
export async function listUserBuilds() {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds`);
  if (!res.ok) throw new Error(`list user builds failed: ${res.status}`);
  return res.json();
}

// The full row (incl. `payload`, the whole build) for one open card.
export async function getUserBuild(id) {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds/${id}`);
  if (!res.ok) throw new Error(`get user build failed: ${res.status}`);
  return res.json();
}

// The admin session cookie is httpOnly (can't be read from JS directly, by
// design), so this is the only way the frontend can know "is the current
// visitor logged in as admin" - used to show a "logged in as admin" badge
// (see useIsAdmin.js) and to pick the untracked short-link lookup in App.jsx
// (see resolveShortCode above). Never used to gate anything
// security-sensitive - worst case of a false answer either way is a wrong
// badge or one extra/missing click-count tick, nothing access-controlled.
// Returns false on any failure (offline, GitHub Pages with no backend, etc).
export async function fetchIsAdmin() {
  try {
    const res = await fetch(`${APP_BASE_PATH}api/admin/whoami`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

// Every visible build's score plus what THIS browser already voted, in one
// call - so the buttons paint in their correct state instead of flashing
// un-voted. Returns {} on any failure: scores are decoration and must never
// stop the listing rendering.
export async function fetchBuildVotes() {
  try {
    const res = await fetch(`${APP_BASE_PATH}api/user-builds/votes`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// `vote` is 1, -1, or 0 to retract. Identity is decided server-side from the
// same pseudonymous session id analytics uses - nothing here identifies the
// voter, and a client cannot claim to be a different one.
export async function voteOnBuild(id, vote) {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ vote }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `vote failed: ${res.status}`);
  return data;
}

// Files a GitHub issue about a specific build, with its id/name/link attached
// server-side (see server/src/routes/userBuilds.js) - the reporter only
// supplies the reason.
export async function reportUserBuild(id, reason) {
  const res = await fetch(`${APP_BASE_PATH}api/user-builds/${id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `report failed: ${res.status}`);
  return data;
}

// Admin-only. Returns every build including hidden ones, with true (unfloored)
// scores - 403s for anyone else.
export async function adminListUserBuilds() {
  const res = await fetch(`${APP_BASE_PATH}api/admin/user-builds`, { credentials: 'include' });
  if (!res.ok) throw new Error(`admin list failed: ${res.status}`);
  return res.json();
}

export async function adminSetBuildHidden(id, hidden) {
  const res = await fetch(`${APP_BASE_PATH}api/admin/user-builds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ hidden }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `hide failed: ${res.status}`);
  return data;
}
