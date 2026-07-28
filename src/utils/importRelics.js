// Cross-site League Relics import API: a third-party relic picker can send
// a visitor here with `?import-relics=Name+One,Name+Two` (each name
// individually URL-encoded, comma-separated) to have those relics loaded
// straight into this planner's League Relics tab.
//
// Deliberately NOT built on shareBuild.js's lz-string-compressed `?share=`
// format - that format stages an unowned build for read-only browsing
// behind a "shared view" banner, with an explicit "load into my planner"
// step before anything touches real localStorage (see App.jsx's
// sharedBuild/handleAdopt). An import is different in kind, not just
// mechanism: it's meant to write straight into the visitor's own ongoing
// selection immediately, so it needs its own simpler, plain-text contract -
// exact relic names are also far easier for an external site to construct
// than this app's internal compressed payload shape.
const IMPORT_RELICS_PARAM = 'import-relics';

// Reads and splits the `import-relics` param, if present - returns the raw
// (not-yet-validated-against-known-relics) list of decoded name strings, or
// null if the param is missing/empty. Validation against LEAGUE_RELICS
// (case-insensitive, tier-constrained) is sanitizeLeagueRelicSelectionLoose's
// job (see useLeagueRelicSelection.js) - kept separate so this file doesn't
// need to know anything about relic data itself.
export function parseImportRelicsParam() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(IMPORT_RELICS_PARAM);
  if (!raw) return null;
  const names = raw
    .split(',')
    .map((name) => decodeURIComponent(name.trim()))
    .filter(Boolean);
  return names.length > 0 ? names : null;
}

// Removes the `import-relics` param from the address bar without touching
// the hash route or triggering a navigation/reload - so refreshing after an
// import doesn't just immediately re-trigger it.
export function stripImportRelicsParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(IMPORT_RELICS_PARAM);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${window.location.hash}`);
}
