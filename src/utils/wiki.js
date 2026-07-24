// Best-effort mapping from an in-game item/boss name to its runescape.wiki
// page - most page titles match the display name with spaces swapped for
// underscores, which is the same convention used for icon FilePath URLs
// throughout src/data/gear.js and src/data/regions.js.
export function wikiUrl(name) {
  if (!name) return null;
  return `https://runescape.wiki/w/${encodeURIComponent(name.trim().replace(/ /g, '_'))}`;
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
