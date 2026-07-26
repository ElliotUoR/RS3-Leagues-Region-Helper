// Thin client for the optional backend described in docs/deployment.md.
// These calls only succeed once the site is served from a domain that has
// /api/* routed to the Node service (see deploy/Caddyfile.snippet) - on
// GitHub Pages there's no backend at all, so every call here is expected to
// fail there. Callers treat that failure as "feature unavailable" (see
// GearPage's handleShorten/ReportIssueButton), never as something to crash
// the page over.

export async function createShortLink(payload) {
  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error(`shorten failed: ${res.status}`);
  const { code } = await res.json();
  return `${window.location.origin}/s/${code}`;
}

export async function submitIssueReport(body) {
  const res = await fetch('/api/report-issue', {
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
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'pageview', path, referrer: document.referrer || undefined }),
  }).catch(() => {});
}
