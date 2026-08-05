// Shape helpers for user-submitted Build Guides (see pages/CreateBuildPage.jsx
// and pages/UserBuildsPage.jsx) - the payload stored in user_builds.payload
// and rendered by components/UserBuildCard.jsx.
//
// Deliberately a LEANER shape than the curated builds in data/blessingBuilds.js:
// no precomputed armour totals (computed live instead - see
// utils/gearStats.js) and no auto-derived unlocks (spellbook/prayers/
// abilities) - those are curation details a random submitter has no easy way
// to look up correctly. Arch relics ARE included (picked + reasoned exactly
// like league relics), since "the relics" the build's author chooses covers
// both kinds. `stages` generalises the curated builds' fixed midLate/late
// split into up to 2 author-named stages (e.g. "Mid game" / "BIS") - each
// stage carries its own per-style loadout.
import { COMBAT_STYLES, GEAR, GEAR_SLOTS } from '../data/gear';
import { sanitizeRegionSelection } from '../hooks/useRegionSelection';
import { sanitizeLeagueRelicSelection } from '../hooks/useLeagueRelicSelection';
import { sanitizeRelicSelection } from '../hooks/useRelicSelection';
import { sanitizeBlessingSelection } from '../hooks/useBlessingSelection';
import { isGodTierSettled, resolveGodTierFor } from '../data/blessings';
import { sanitizeBuildExtras } from '../data/buildExtras';

export const MAX_LENGTHS = {
  name: 100,
  tagline: 200,
  authorName: 60,
  difficultyLabel: 40,
  difficultyNote: 300,
  stageLabel: 40,
  reason: 500,
  prose: 8000,
  tradeoff: 300,
};

export const MAX_TRADEOFFS = 10;
export const MAX_STAGES = 2;

function trimTo(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Item names come from the picker (see pages/CreateBuildPage.jsx), so they
// are always real GEAR entries at authoring time - but the payload is opaque
// JSON as far as the server is concerned (see server/src/routes/userBuilds.js),
// so a malicious or just-stale POST could carry anything. Re-validated here
// against the CURRENT gear.js on every read, same reasoning as gearShape.js's
// own sanitizers: an item renamed or removed since a build was submitted
// degrades to an empty slot instead of rendering a fabricated name.
function sanitizeLoadouts(raw, styles) {
  const loadouts = {};
  if (!raw || typeof raw !== 'object') return loadouts;
  for (const style of styles) {
    const entry = raw[style];
    if (!entry || typeof entry !== 'object') continue;
    const slots = {};
    for (const slot of GEAR_SLOTS) {
      const name = entry.slots?.[slot];
      if (typeof name === 'string' && GEAR[style]?.[slot]?.some((item) => item.name === name)) {
        slots[slot] = name;
      }
    }
    if (Object.keys(slots).length === 0) continue;
    const eof =
      typeof entry.eof === 'string' && GEAR[style]?.weapon?.some((item) => item.name === entry.eof)
        ? entry.eof
        : null;
    loadouts[style] = { slots, eof };
  }
  return loadouts;
}

// Up to MAX_STAGES stages, each an author-chosen label + its own per-style
// loadouts. A stage with no gear in any style is dropped entirely (it would
// render as nothing but an empty tab); a build with zero surviving stages is
// invalid, same "no gear = no build" rule as before, just applied across the
// whole stage list instead of a single flat loadout map.
function sanitizeStages(raw, styles) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_STAGES)
    .map((stage, index) => ({
      label: trimTo(stage?.label, MAX_LENGTHS.stageLabel) || `Stage ${index + 1}`,
      loadouts: sanitizeLoadouts(stage?.loadouts, styles),
    }))
    .filter((stage) => Object.keys(stage.loadouts).length > 0);
}

// Which single loadout the share thumbnail renders, as an index into the
// SURVIVING stages plus a style. Dropped entirely unless it still points at a
// loadout that exists - the author may have emptied that stage or unticked
// that combat style since choosing it, and a thumbnail pointing at nothing is
// worse than no preference at all (the renderer then falls back to the first
// stage's first style, which is what the card itself opens on).
function sanitizeThumbnail(raw, stages, styles) {
  const stage = raw?.stage;
  const style = raw?.style;
  if (!Number.isInteger(stage) || stage < 0 || stage >= stages.length) return null;
  if (!styles.includes(style) || !stages[stage].loadouts[style]) return null;
  return { stage, style };
}

function sanitizeReasons(raw, validKeys) {
  const reasons = {};
  if (!raw || typeof raw !== 'object') return reasons;
  for (const key of validKeys) {
    if (typeof raw[key] === 'string' && raw[key].trim()) {
      reasons[key] = trimTo(raw[key], MAX_LENGTHS.reason);
    }
  }
  return reasons;
}

// Validates an arbitrary parsed payload (from the API, so never trusted)
// down to a well-formed build - every field either matches a known
// name/id/style or is dropped, exactly like decodeShareBuild does for share
// links. Returns null only if the build has nothing left worth rendering
// (no name, or no stage with any equipped gear at all).
export function sanitizeUserBuildPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = trimTo(raw.name, MAX_LENGTHS.name);
  if (!name) return null;

  const declaredStyles = COMBAT_STYLES.filter((s) => Array.isArray(raw.styles) && raw.styles.includes(s));
  const stages = sanitizeStages(raw.stages, declaredStyles);
  if (stages.length === 0) return null;

  // The build's real style list is whichever styles actually have a
  // loadout in at least one surviving stage - a style checked in the form
  // but left empty in every stage contributes nothing to render.
  const styles = declaredStyles.filter((s) => stages.some((stage) => stage.loadouts[s]));
  if (styles.length === 0) return null;

  const regions = sanitizeRegionSelection(raw.regions);
  const relics = sanitizeLeagueRelicSelection(raw.relics);
  const archRelics = sanitizeRelicSelection(raw.archRelics);
  // Blessings are optional for a user build (unlike curated guides, not every
  // submission is a min-maxed endgame loadout), so each god power only resolves
  // once its own half of the tree has settled - see isGodTierSettled.
  //
  // `godTier` keeps its original meaning (God Tier One, from tiers 1-3) rather
  // than becoming a list: it is a stored payload field, and every build written
  // before tiers 4-6 existed has one. `godTier2` is new and simply absent from
  // those, which reads correctly as "no second god power".
  const blessings = sanitizeBlessingSelection(raw.blessings);
  const godTier = isGodTierSettled(1, blessings) ? resolveGodTierFor(1, blessings)?.name ?? null : null;
  const godTier2 = isGodTierSettled(2, blessings) ? resolveGodTierFor(2, blessings)?.name ?? null : null;

  const tradeoffs = Array.isArray(raw.tradeoffs)
    ? raw.tradeoffs
        .filter((t) => typeof t === 'string' && t.trim())
        .slice(0, MAX_TRADEOFFS)
        .map((t) => trimTo(t, MAX_LENGTHS.tradeoff))
    : [];

  return {
    name,
    tagline: trimTo(raw.tagline, MAX_LENGTHS.tagline),
    authorName: trimTo(raw.authorName, MAX_LENGTHS.authorName),
    difficultyLabel: trimTo(raw.difficultyLabel, MAX_LENGTHS.difficultyLabel),
    difficultyNote: trimTo(raw.difficultyNote, MAX_LENGTHS.difficultyNote),
    styles,
    blessings,
    godTier,
    godTier2,
    relics,
    relicReasons: sanitizeReasons(raw.relicReasons, relics),
    // Keyed by blessing name AND by god power name - the god powers are derived
    // rather than picked, but they are just as much a choice to justify, and
    // the section renders them in the same rows.
    blessingReasons: sanitizeReasons(
      raw.blessingReasons,
      [...blessings, godTier, godTier2].filter(Boolean),
    ),
    archRelics,
    archRelicReasons: sanitizeReasons(raw.archRelicReasons, archRelics),
    regions,
    regionReasons: sanitizeReasons(raw.regionReasons, regions),
    // Validated against the regions ABOVE, not against the catalogue alone: an
    // extra is something a region paid for, so dropping the region has to drop
    // it too. Otherwise a build edited down to two regions keeps quoting health
    // it can no longer reach.
    extras: sanitizeBuildExtras(raw.extras, regions),
    whyItsGood: trimTo(raw.whyItsGood, MAX_LENGTHS.prose),
    howToPlay: trimTo(raw.howToPlay, MAX_LENGTHS.prose),
    tradeoffs,
    stages,
    thumbnail: sanitizeThumbnail(raw.thumbnail, stages, styles),
  };
}
