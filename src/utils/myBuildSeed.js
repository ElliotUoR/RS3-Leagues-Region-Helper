import { sanitizeUserBuildPayload } from './userBuildShape';

// Turns the live My Build selections into a seed for Create a Build.
//
// This is the ONE place the two directions differ. Editing on My Build writes
// straight through to your real selections; publishing does not, and must not -
// so this takes a snapshot, and CreateBuildPage runs it through its own
// `persist: false` hooks. Renaming a weapon while drafting a guide cannot reach
// back and change what you are actually wearing.
//
// The result goes through sanitizeUserBuildPayload rather than being assembled
// by hand, so an imported build is validated exactly like one arriving from the
// API: item names checked against the current gear data, stages with no gear
// dropped, styles narrowed to those that survived, and the god tier derived
// from the blessing colours. A seed that cannot survive that is not a build
// anyone could publish, and returning null is what disables the button.

// The payload needs a name to validate at all (a nameless build is not
// renderable, so the sanitizer rejects it). It is cleared again on the way out:
// the author has to supply their own, and an imported build arriving
// pre-titled "My Build" would sail through the form and get published as that.
const PLACEHOLDER_NAME = 'My Build';

// Stages do not exist outside the build editor - the planner holds one loadout
// per style, with no early/late split - so an import always arrives as a single
// stage the author can add to.
const FIRST_STAGE_LABEL = 'Stage 1';

export function buildMyBuildSeed({
  regions = [],
  leagueRelics = [],
  archRelics = [],
  blessings = [],
  extras = [],
  equippedNamesByStyle = {},
  eofWeaponNamesByStyle = {},
} = {}) {
  const loadouts = {};
  for (const [style, slots] of Object.entries(equippedNamesByStyle)) {
    if (!slots || Object.keys(slots).length === 0) continue;
    loadouts[style] = { slots: { ...slots }, eof: eofWeaponNamesByStyle[style] ?? null };
  }

  const seed = sanitizeUserBuildPayload({
    name: PLACEHOLDER_NAME,
    // The build's styles are whichever ones actually have gear, rather than a
    // separate set of tickboxes - the planner has no concept of "this build is
    // for melee", only of what is equipped.
    styles: Object.keys(loadouts),
    blessings,
    relics: leagueRelics,
    archRelics,
    regions,
    extras,
    stages: [{ label: FIRST_STAGE_LABEL, loadouts }],
  });

  if (!seed) return null;
  return { ...seed, name: '' };
}
