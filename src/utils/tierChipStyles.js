// Class and style helpers for a tier list chip, plus the per-row accent hues.
//
// Split out of components/tierChip.jsx because that file exports components:
// exporting non-components alongside them breaks React Fast Refresh for the
// whole file, and this is the half that isn't one.

// 'unranked'/'unsorted' are not grades so much as the absence of one -
// desaturated on purpose so they do not read as sitting on the same scale as
// the lettered rows.
export const GRADE_HUES = { S: 165, A: 140, B: 95, C: 45, D: 25, E: 5, F: 220, unranked: 250, unsorted: 250 };

// The lettered rows in rank order. The tier list maker lets an author rename a
// row, so its colour has to follow its POSITION rather than its label.
export const RANKED_GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export function tierChipClassName(entry, { draggable = false, dirty = false } = {}) {
  return [
    'tier-entry',
    entry.colour ? `tier-entry-${entry.colour}` : '',
    // League relics carry a per-relic hue instead of a red/green/blue blessing
    // colour - a real class rather than an attribute selector on the inline
    // custom property, which is unreliable.
    entry.hue != null ? 'tier-entry-relic' : '',
    draggable ? 'tier-entry-draggable' : '',
    dirty ? 'tier-entry-dirty' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function tierChipStyle(entry) {
  return entry.hue != null ? { '--relic-hue': entry.hue } : undefined;
}
