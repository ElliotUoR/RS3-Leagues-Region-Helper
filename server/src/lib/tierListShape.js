// Validation and canonicalisation for a submitted tier list.
//
// Unlike user_builds' payload - which this service treats as opaque JSON and
// only size-checks - a tier list IS validated field by field here. Two reasons:
//
//   1. It is deduped by a hash of its own content, so two submissions of the
//      same list must produce byte-identical JSON. Any freedom in key order or
//      whitespace would mint a second code for a list that already exists.
//   2. It feeds the admin analytics directly (average rank per item, and so
//      on). One crafted POST with a made-up blessing name would show up as a
//      real entry in those averages forever.
//
// Names are checked against the live data rather than a stored list, so a
// blessing or relic renamed in a later update stops being accepted rather than
// quietly accumulating rows nothing can render.
import { itemNamesFor } from '../../../src/data/tierListItems.js';

export const TIER_LIST_TYPES = ['blessings', 'relics'];
export const ROW_COUNT = 7;
export const MAX_LENGTHS = { authorName: 60, angle: 120, rowLabel: 18 };
// A four-word code, e.g. "torva-seismic-vengeance-crystal".
export const CODE_RE = /^[a-z]+(-[a-z]+){3}$/;

function trimmedString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Returns { error } or a normalised payload ready to be hashed and stored.
export function validateTierList(raw) {
  const type = raw?.type;
  if (!TIER_LIST_TYPES.includes(type)) {
    return { error: `type must be one of: ${TIER_LIST_TYPES.join(', ')}` };
  }

  // Optional on purpose - an unnamed list is titled "My <noun> tier list"
  // (see tierListTitle). Requiring a name would turn a thirty-second bit of
  // fun into a form.
  const authorName = trimmedString(raw.authorName, MAX_LENGTHS.authorName);

  const angle = trimmedString(raw.angle, MAX_LENGTHS.angle);

  if (!Array.isArray(raw.rowLabels) || raw.rowLabels.length !== ROW_COUNT) {
    return { error: `rowLabels must be an array of ${ROW_COUNT} labels` };
  }
  const rowLabels = raw.rowLabels.map((label) => trimmedString(label, MAX_LENGTHS.rowLabel));
  if (rowLabels.some((label) => label === '')) return { error: 'every tier needs a name' };

  if (!raw.placements || typeof raw.placements !== 'object' || Array.isArray(raw.placements)) {
    return { error: 'placements must be an object' };
  }
  const validNames = new Set(itemNamesFor(type));
  const placements = {};
  for (const [name, row] of Object.entries(raw.placements)) {
    if (!validNames.has(name)) return { error: `"${name}" is not a known ${type} entry` };
    if (!Number.isInteger(row) || row < 0 || row >= ROW_COUNT) {
      return { error: `"${name}" has an out-of-range tier` };
    }
    placements[name] = row;
  }
  if (Object.keys(placements).length === 0) return { error: 'sort at least one entry before saving' };

  return { type, authorName, angle, rowLabels, placements };
}

// Deterministic JSON for hashing AND for storage, so the row and the hash can
// never disagree. Placement keys are sorted with a plain `.sort()` rather than
// localeCompare - the same deliberate choice encodeShareBuild makes, because a
// locale-dependent order would hash differently on different machines and
// break dedup across them.
export function canonicalTierListJson(list) {
  const placements = {};
  for (const name of Object.keys(list.placements).sort()) {
    placements[name] = list.placements[name];
  }
  return JSON.stringify({
    type: list.type,
    authorName: list.authorName,
    angle: list.angle,
    rowLabels: list.rowLabels,
    placements,
  });
}
