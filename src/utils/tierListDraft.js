// The tier list a visitor is building, kept in localStorage so closing the tab
// does not lose it. One draft per list type - switching between Blessings and
// Relics on the maker page must never discard the other.
//
// SHAPE. `placements` maps an entry NAME to a row index (0 = the first
// lettered row). Anything absent is unsorted, which is where everything starts.
// Storing it this way rather than as seven arrays means a blessing or relic
// added to the game later simply appears in Unsorted for anyone with an old
// draft, instead of the draft needing a migration.
//
// Rows are fixed in number and order; only their LABELS are editable. That is
// what keeps two lists comparable - the analytics average by row position, so
// someone renaming "S" to "Must pick" still ranks against everybody else.
export const TIER_LIST_TYPES = ['blessings', 'relics'];
export const DEFAULT_ROW_LABELS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
export const ROW_COUNT = DEFAULT_ROW_LABELS.length;

export const MAX_LENGTHS = { authorName: 60, angle: 120, rowLabel: 18 };

// Examples offered under the "angle" field - the point of the line is to say
// what the list is FOR, since a points-capping list and a speedrun list
// disagree about almost everything.
export const ANGLE_EXAMPLES = ['PvM focused list', 'Points capping list', 'Speedrun list'];

const STORAGE_PREFIX = 'rs3-leagues-tier-list-draft-';

export function emptyDraft(type) {
  return {
    type,
    authorName: '',
    angle: '',
    rowLabels: [...DEFAULT_ROW_LABELS],
    placements: {},
  };
}

function trimTo(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// Never trusted, even from this browser's own localStorage - it can be
// hand-edited, and it can predate a change to the row count or the item list.
// Anything unrecognised is dropped rather than repaired.
export function sanitizeDraft(raw, type, validNames) {
  const draft = emptyDraft(type);
  if (!raw || typeof raw !== 'object') return draft;

  draft.authorName = trimTo(raw.authorName, MAX_LENGTHS.authorName);
  draft.angle = trimTo(raw.angle, MAX_LENGTHS.angle);

  if (Array.isArray(raw.rowLabels)) {
    draft.rowLabels = DEFAULT_ROW_LABELS.map(
      (fallback, index) => trimTo(raw.rowLabels[index], MAX_LENGTHS.rowLabel).trim() || fallback,
    );
  }

  if (raw.placements && typeof raw.placements === 'object') {
    const allowed = new Set(validNames);
    for (const [name, row] of Object.entries(raw.placements)) {
      if (!allowed.has(name)) continue;
      if (!Number.isInteger(row) || row < 0 || row >= ROW_COUNT) continue;
      draft.placements[name] = row;
    }
  }

  return draft;
}

function storageKey(type) {
  return `${STORAGE_PREFIX}${type}`;
}

export function loadDraft(type, validNames) {
  if (typeof window === 'undefined') return emptyDraft(type);
  try {
    const raw = window.localStorage.getItem(storageKey(type));
    return sanitizeDraft(raw ? JSON.parse(raw) : null, type, validNames);
  } catch {
    return emptyDraft(type);
  }
}

export function saveDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(draft.type), JSON.stringify(draft));
  } catch {
    // A full or blocked localStorage must not break the page - the draft just
    // stops surviving a reload, which is visible enough on its own.
  }
}

export function clearDraft(type) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(type));
  } catch {
    // as above
  }
}

// How many of the available entries have been placed - drives the "12 of 12
// sorted" readout and, later, whether a list is worth finishing.
export function sortedCount(draft, validNames) {
  return validNames.filter((name) => draft.placements[name] != null).length;
}
