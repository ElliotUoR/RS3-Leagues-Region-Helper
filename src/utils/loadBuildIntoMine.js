import { stagesForStyle, stylesInBuild } from './importableBuild.js';

// Applies a build to the visitor's own saved selections - the "Load into My
// Build" half of the Use-this-build modal.
//
// Deliberately routed through the hooks' setters rather than writing the
// localStorage keys directly. App.jsx's handleAdopt does the latter and gets
// away with it only because entering/leaving shared view remounts the whole
// subtree, so the hooks re-read storage on the way back. Nothing remounts here,
// and reaching around a hook to change the state it owns is a bug waiting for
// the first hook that gains internal state.
//
// `choices` is what the modal's checkboxes produced:
//   {
//     regions, leagueRelics, archRelics, blessings, extras: boolean
//     gear: { melee: 0, ranged: 1 }   // style -> stage index, absent = skip
//   }
//
// Everything is opt-in per category, so taking a build's gear without losing
// your own region plan is one untick rather than a different feature.

export function applyBuildToSelections(importable, choices, setters) {
  if (!importable || !choices) return;

  if (choices.regions) setters.setRegions?.(importable.regions);
  if (choices.leagueRelics) setters.setLeagueRelics?.(importable.leagueRelics);
  if (choices.archRelics) setters.setRelics?.(importable.archRelics);
  if (choices.blessings) setters.setBlessings?.(importable.blessings);
  if (choices.extras) setters.setExtras?.(importable.extras);

  for (const [style, stageIndex] of Object.entries(choices.gear ?? {})) {
    const stage = importable.stages?.[stageIndex];
    const loadout = stage?.loadouts?.[style];
    if (!loadout) continue;
    setters.setStyleLoadout?.(style, loadout.slots, loadout.eof);
  }
}

// The choices a freshly-opened modal starts from: everything the build actually
// carries, ticked, with each style's gear pointed at that style's LAST
// available stage.
//
// Last rather than first because stages are progression - "Mid game" then
// "BIS" - and the finished article is what someone copying a build almost
// always means. The dropdown is right there for the other case.
export function defaultChoicesFor(importable) {
  const gear = {};
  for (const style of stylesInBuild(importable)) {
    const stages = stagesForStyle(importable, style);
    if (stages.length > 0) gear[style] = stages[stages.length - 1].index;
  }
  return {
    regions: importable.regions.length > 0,
    leagueRelics: importable.leagueRelics.length > 0,
    archRelics: importable.archRelics.length > 0,
    blessings: importable.blessings.length > 0,
    extras: importable.extras.length > 0,
    gear,
  };
}

// Nothing ticked means the button would do nothing - used to disable it rather
// than let someone "load" a no-op and wonder why their build is unchanged.
export function choosesNothing(choices) {
  if (!choices) return true;
  const anyCategory =
    choices.regions || choices.leagueRelics || choices.archRelics || choices.blessings || choices.extras;
  return !anyCategory && Object.keys(choices.gear ?? {}).length === 0;
}

// The styles this load will NOT touch - the reassuring half of the warning, and
// the thing that makes a partial overwrite legible rather than alarming.
export function untouchedStyles(choices, allStyles) {
  const taking = new Set(Object.keys(choices?.gear ?? {}));
  return allStyles.filter((style) => !taking.has(style));
}
