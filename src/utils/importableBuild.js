// Explicit .js extension, unlike most of src/: this module is pure data
// shaping with no React in it, and the extension is what lets it be exercised
// straight from node (Vite resolves either form). Same reason gearStats.js
// carries them.
import { COMBAT_STYLES } from '../data/gear.js';

// One shape for "a build you could load into your own setup", so the modal does
// not have to know whether it is looking at a user submission or a curated
// guide. The two are stored quite differently:
//
//   user builds   stages: [{ label, loadouts: { melee: { slots, eof } } }]
//   curated       loadouts: { late: { melee: {...} }, midLate: { melee: {...} } }
//
// and curated guides keep their Arch relics as { name, reason } objects under
// `unlocks`, while user builds keep plain names at the top level. Normalising
// here means one adapter each and no branching anywhere downstream.

// Curated guides have no author-chosen stage names - these are the two fixed
// progression points, in the order a reader moves through them.
const CURATED_STAGES = [
  { key: 'midLate', label: 'Mid-late game' },
  { key: 'late', label: 'Late game' },
];

function stageWithLoadouts(label, byStyle) {
  const loadouts = {};
  for (const style of COMBAT_STYLES) {
    const entry = byStyle?.[style];
    // Curated entries carry precomputed armour totals alongside the gear; only
    // the two fields a loadout actually consists of are carried over.
    if (entry?.slots && Object.keys(entry.slots).length > 0) {
      loadouts[style] = { slots: entry.slots, eof: entry.eof ?? null };
    }
  }
  return Object.keys(loadouts).length > 0 ? { label, loadouts } : null;
}

export function importableFromUserBuild(build) {
  if (!build) return null;
  const stages = (build.stages ?? [])
    .map((stage, index) => stageWithLoadouts(stage.label || `Stage ${index + 1}`, stage.loadouts))
    .filter(Boolean);
  return {
    name: build.name ?? '',
    regions: build.regions ?? [],
    leagueRelics: build.relics ?? [],
    archRelics: build.archRelics ?? [],
    blessings: build.blessings ?? [],
    extras: build.extras ?? [],
    stages,
  };
}

export function importableFromCuratedBuild(build) {
  if (!build) return null;
  const stages = CURATED_STAGES.map(({ key, label }) => stageWithLoadouts(label, build.loadouts?.[key])).filter(
    Boolean,
  );
  return {
    name: build.name ?? '',
    regions: build.regions ?? [],
    leagueRelics: build.relics ?? [],
    // The only real shape difference - objects rather than names.
    archRelics: (build.unlocks?.archRelics ?? []).map((relic) => relic?.name).filter(Boolean),
    blessings: build.blessings ?? [],
    // Curated guides predate Extras and declare none.
    extras: [],
    stages,
  };
}

// Which combat styles this build has gear for, in the canonical order rather
// than whatever order the stages happened to define them in.
export function stylesInBuild(importable) {
  const styles = new Set();
  for (const stage of importable?.stages ?? []) {
    for (const style of Object.keys(stage.loadouts)) styles.add(style);
  }
  return COMBAT_STYLES.filter((style) => styles.has(style));
}

// The stages that actually carry gear for one style. A build can have two
// stages where only the later one has, say, a necromancy loadout - offering the
// empty one as a choice would let someone pick "load nothing".
export function stagesForStyle(importable, style) {
  return (importable?.stages ?? [])
    .map((stage, index) => ({ index, label: stage.label, loadout: stage.loadouts[style] }))
    .filter((entry) => entry.loadout);
}
