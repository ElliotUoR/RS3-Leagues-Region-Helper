// "Extras" - region-gated account unlocks that change a build's NUMBERS but
// are not gear, relics or blessings, so none of the existing pickers had
// anywhere to put them.
//
// They already exist as reference entries in essentials.js (the "does my region
// set support how I want to fight" tab). What is new here is that a build can
// declare it TOOK one, and that the figure it grants then feeds the same maths
// as everything else - the Totem of Vitality's +1,500 max LP lands before Big
// Boned's x1.5, so it is really worth +2,250 health and +112.5 bonus damage per
// hit to that build. Left as a note in the essentials tab, nobody would ever
// see it in their own totals.
//
// Region-gated by design: the section only offers what the build's own region
// picks can actually reach, and an extra survives sanitisation only while its
// region is still selected (see sanitizeBuildExtras). Dropping a region has to
// drop the things that region paid for, or a build quietly keeps a bonus it
// cannot have.
import { ESSENTIALS } from './essentials.js';

export const TOTEM_OF_VITALITY = 'Totem of Vitality';

// name -> what it requires and what it does. The display side (icon, one-line
// summary) is NOT repeated here - it is read from the essentials entry of the
// same name below, so the two can never disagree about what the thing is.
const EXTRA_EFFECTS = {
  [TOTEM_OF_VITALITY]: { region: 'anachronia', lifePoints: 1500 },
};

// A rename in essentials.js costs the icon and the summary line, not the extra
// itself - same "degrade, do not poison" rule the gear and relic lookups use.
// The effect figures live here precisely so a data edit over there cannot
// silently change a build's health total.
export const BUILD_EXTRAS = Object.entries(EXTRA_EFFECTS).map(([name, effect]) => {
  const essential = ESSENTIALS.find((entry) => entry.name === name);
  return {
    name,
    icon: essential?.icon ?? null,
    summary: essential?.summary ?? null,
    ...effect,
  };
});

export const BUILD_EXTRA_BY_NAME = new Map(BUILD_EXTRAS.map((extra) => [extra.name, extra]));

// What a build with these regions is allowed to take. An empty result is what
// the create form uses to decide the section is not worth rendering at all.
export function availableBuildExtras(regions = []) {
  return BUILD_EXTRAS.filter((extra) => regions.includes(extra.region));
}

// Names in, valid names out - deduplicated, in catalogue order, and only those
// the build's regions still reach.
export function sanitizeBuildExtras(raw, regions = []) {
  if (!Array.isArray(raw)) return [];
  return availableBuildExtras(regions)
    .filter((extra) => raw.includes(extra.name))
    .map((extra) => extra.name);
}

// The flat max-LP these extras add, BEFORE any multiplier - see
// getTotalLifePoints, which folds it in alongside Font of Life for the same
// reason.
export function extraLifePoints(extras = []) {
  let total = 0;
  for (const name of extras) total += BUILD_EXTRA_BY_NAME.get(name)?.lifePoints ?? 0;
  return total;
}
