import { BLESSINGS, resolveGodTier } from '../data/blessings';

// Turns a build's blessing picks into a colour theme.
//
// The god power counts as a FOURTH vote, not a label on top of three: two blue
// picks plus a red one resolve to a blue god power, so the build is really
// three blue to one red and should look it. One of each colour resolves green,
// making it two green, one blue, one red. Weighting the theme by that tally is
// what makes a Saradomin-leaning build read as blue at a glance without anyone
// having to count pills.
const COLOUR_HEX = { red: '#ef5350', green: '#3fbf6f', blue: '#4a90e2' };
const COLOUR_ORDER = ['red', 'green', 'blue'];

// resolveGodTier falls back to green whenever no colour has two picks, so
// asking it before a build has actually settled would invent a green vote for
// what is really an undecided build. Same "settled or nothing" rule the share
// image renderer uses (see server/src/lib/buildGuideShare.js).
function godColourFor(colours) {
  const majority = COLOUR_ORDER.find((colour) => colours.filter((c) => c === colour).length >= 2);
  const settled = Boolean(majority) || colours.length === 3;
  return settled ? resolveGodTier(colours)?.colour ?? null : null;
}

// { red, green, blue } counts including the god power's vote.
export function blessingColourTally(blessingNames = []) {
  const colours = blessingNames
    .map((name) => BLESSINGS.find((blessing) => blessing.name === name)?.colour)
    .filter(Boolean);

  const tally = { red: 0, green: 0, blue: 0 };
  for (const colour of colours) tally[colour] += 1;

  const god = godColourFor(colours);
  if (god) tally[god] += 1;
  return tally;
}

// A gradient whose bands are proportional to the tally: 3 blue to 1 red puts
// the blue-red transition three-quarters of the way across rather than halfway.
// Stops are placed at each band's MIDPOINT so adjacent colours blend instead of
// meeting at a hard line, which at this size reads as a smear rather than a
// stripe.
export function blessingGradient(tally, angle = '120deg') {
  const present = COLOUR_ORDER.filter((colour) => tally[colour] > 0);
  if (present.length === 0) return null;

  const total = present.reduce((sum, colour) => sum + tally[colour], 0);
  let travelled = 0;
  const stops = present.map((colour) => {
    const share = tally[colour] / total;
    const midpoint = (travelled + share / 2) * 100;
    travelled += share;
    return `${COLOUR_HEX[colour]} ${Math.round(midpoint)}%`;
  });

  // A single colour needs two stops to be a gradient at all.
  if (stops.length === 1) return `linear-gradient(${angle}, ${COLOUR_HEX[present[0]]}, ${COLOUR_HEX[present[0]]})`;
  return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

// The colour a build leans towards, for anything that needs one flat value
// (a border tint, a glow) rather than a gradient.
export function dominantBlessingColour(tally) {
  let best = null;
  for (const colour of COLOUR_ORDER) {
    if (tally[colour] > 0 && (best === null || tally[colour] > tally[best])) best = colour;
  }
  return best ? COLOUR_HEX[best] : null;
}
