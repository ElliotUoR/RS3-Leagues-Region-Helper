// Client half of the localhost-only editors that write back into
// src/data/blessingBuilds.js - the Build Guides prose, and the two tier lists.
// The server half is a Vite dev middleware - see scripts/viteBuildTextEditor.js.
//
// Availability is gated twice on purpose:
//   - `import.meta.env.DEV` is statically false in a production build, so the
//     whole feature (including the fetch call) is dead code that a bundler
//     drops. It cannot appear on the deployed site.
//   - the hostname check stops it appearing if someone opens the dev server
//     from another machine on the network, where writes would be pointless
//     anyway since the endpoint rejects non-loopback requests.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// Whether this browser can edit blessingBuilds.js at all - gates the Build
// Guides prose editor AND the tier list customiser. One answer, because both
// reach the same dev-only middleware and the same file.
export function isSourceEditable() {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  return LOCAL_HOSTS.has(window.location.hostname);
}

// A build flagged `hidden: true` is a work in progress: it stays visible while
// running the dev server, and is filtered out of every RELEASE build - both the
// self-hosted live deploy and the GitHub Pages mirror. `import.meta.env.DEV` is
// the right discriminator rather than MODE, because `npm run dev` and
// `npm run build` both use --mode live (see package.json).
export function isBuildVisible(build) {
  return !build.hidden || import.meta.env.DEV;
}

// Persists one string back into src/data/blessingBuilds.js.
// `path` is the route to the value inside the build object, e.g.
//   ['whyItsGood']
//   ['relicReasons', 'Golden Touch']
//   ['unlocks', 'abilities', 2, 'note']
//   ['tradeoffs', 0]
//
// `value` may also be a boolean, for a single top-level key - currently only
// `['hidden']`, which the endpoint will insert if the build does not have it.
export async function saveBuildText(buildId, path, value) {
  const response = await fetch('/__edit-build-text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ buildId, path, value }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // fall through to the status-based error below
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? `save failed (${response.status})`);
  }
  return true;
}

// Persists tier list moves and tooltip edits back into blessingBuilds.js.
//
// `list` is 'blessings' or 'relics'; `changes` is [{ name, grade?, note? }],
// carrying only the entries that actually differ. Sent as one request rather
// than one per entry so a batch of drags either lands whole or not at all -
// a half-applied reshuffle is worse than none, since the page reloads from the
// file afterwards and there would be no record of what did not make it.
export async function saveTierListChanges(list, changes) {
  const response = await fetch('/__edit-tier-list', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ list, changes }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // fall through to the status-based error below
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? `save failed (${response.status})`);
  }
  return payload;
}
