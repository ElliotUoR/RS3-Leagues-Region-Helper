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

// Resolves a short code back to its compressed build payload by calling
// PostgREST's get_short_link_payload RPC directly (see
// deploy/migrations/001_init.sql) - not the Node service. The Node service
// no longer owns /s/:code at all (see App.jsx's short-link handling): the
// short URL is served the SPA itself now, so the address bar keeps showing
// the short link instead of expanding into a long `?share=` one, and this
// is what resolves the code into an actual build once the app loads.
// Returns null on any failure (unknown code, offline, backend down).
//
// PostgREST's exact JSON shape for a scalar-returning function varies by
// version/config - a bare string (`"abc123"`), a single object
// (`{"get_short_link_payload": "abc123"}`), or an array of one such object -
// normalized down to the plain string (or null) here, mirroring what the
// now-removed server-side callScalarRpc used to do.
export async function resolveShortCode(code) {
  try {
    const res = await fetch(`${APP_BASE_PATH}rest/rpc/get_short_link_payload`, {
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
// see server/src/lib/session.js for why.
export function trackPageview(path) {
  fetch(`${APP_BASE_PATH}api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'pageview', path, referrer: document.referrer || undefined }),
  }).catch(() => {});
}
