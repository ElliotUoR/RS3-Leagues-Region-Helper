// Best-effort mapping from an in-game item/boss name to its runescape.wiki
// page - most page titles match the display name with spaces swapped for
// underscores, which is the same convention used for icon FilePath URLs
// throughout src/data/gear.js and src/data/regions.js.
export function wikiUrl(name) {
  if (!name) return null;
  return `https://runescape.wiki/w/${encodeURIComponent(name.trim().replaceAll(' ', '_'))}`;
}

// Attach to onContextMenu to replace the browser's right-click menu with a
// direct "open this thing's wiki page in a new tab" action.
export function wikiContextMenuHandler(name) {
  return (event) => {
    const url = wikiUrl(name);
    if (!url) return;
    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
}

// Builds a wiki URL for a specific page path plus a section anchor, e.g.
// wikiUrlWithAnchor('Equilibrium League/Relics', 'Tier_1'). Kept separate
// from wikiUrl() - that function runs its whole input through
// encodeURIComponent, which would also encode the "/" path separator and
// "#" fragment separator a compound "page#anchor" string needs to stay
// literal. Used for League Relics (see LeagueRelicRow.jsx): there's one
// shared wiki page for all of them, sectioned by tier, rather than one page
// per relic the way Arch relics/gear/abilities have.
export function wikiUrlWithAnchor(pagePath, anchor) {
  const encodedPath = pagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment.trim().replaceAll(' ', '_')))
    .join('/');
  const encodedAnchor = encodeURIComponent(anchor.replaceAll(' ', '_'));
  return `https://runescape.wiki/w/${encodedPath}#${encodedAnchor}`;
}

// Same idea as wikiContextMenuHandler, but for a URL that's already been
// built (e.g. via wikiUrlWithAnchor) rather than derived from a bare name.
export function wikiUrlContextMenuHandler(url) {
  return (event) => {
    if (!url) return;
    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
}
