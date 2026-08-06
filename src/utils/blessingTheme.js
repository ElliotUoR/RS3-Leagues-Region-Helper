import {
  BLESSINGS,
  GOD_TIER_BLESSINGS,
  isGodTierSettled,
  resolveGodTierFor,
} from '../data/blessings';

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

// resolveGodTierFor falls back to green whenever no colour in that half has two
// picks, so asking before a half has actually settled would invent a green vote
// for what is really an undecided build. Same "settled or nothing" rule the
// share image renderer uses (see server/src/lib/buildGuideShare.js).
//
// Takes NAMES, not colours: each god power reads only its own half of the tree,
// and a bare colour carries no tier to tell the halves apart.
function godColoursFor(blessingNames) {
  return [1, 2]
    .filter((godTier) => isGodTierSettled(godTier, blessingNames))
    .map((godTier) => resolveGodTierFor(godTier, blessingNames)?.colour ?? null)
    .filter(Boolean);
}

// { red, green, blue } counts including each settled god power's vote.
export function blessingColourTally(blessingNames = []) {
  const colours = blessingNames
    .map((name) => BLESSINGS.find((blessing) => blessing.name === name)?.colour)
    .filter(Boolean);

  const tally = { red: 0, green: 0, blue: 0 };
  for (const colour of colours) tally[colour] += 1;

  // Both god powers vote, for the same reason the first one always has: a
  // six-pick build leaning blue in both halves is really eight blue votes, and
  // the theme should read that way.
  for (const god of godColoursFor(blessingNames)) tally[god] += 1;
  return tally;
}

const GOD_COLOUR_BY_NAME = new Map(GOD_TIER_BLESSINGS.map((god) => [god.name, god.colour]));

// The two god powers' colours, as hex, from their names. Names rather than
// derivation because the caller may have a STORED godTier/godTier2 (curated
// guides and saved user builds carry both) which has to win over anything
// re-derived from the picks.
export function godPowerColours({ godTier, godTier2 } = {}) {
  const hex = (name) => COLOUR_HEX[GOD_COLOUR_BY_NAME.get(name)] ?? null;
  return { first: hex(godTier), second: hex(godTier2) };
}

// A gradient whose bands are proportional to the tally: 3 blue to 1 red puts
// the blue-red transition three-quarters of the way across rather than halfway.
// Stops are placed at each band's MIDPOINT so adjacent colours blend instead of
// meeting at a hard line, which at this size reads as a smear rather than a
// stripe.
//
// With two god powers the ENDS are no longer free. God Tier One anchors the
// left and God Tier Two the right, because those are the two outcomes a reader
// most wants to identify and the halves of the tree already read left-to-right
// everywhere else (the card's two pill rows, the Blessings section). The tally
// still decides everything between them, so a build's blessing mix is as
// visible as it was - it just no longer decides which colour sits at which end.
//
// Ordering, not recolouring: the god colours are in the tally already (they
// vote, see blessingColourTally), so anchoring moves an existing band to an end
// rather than adding a stripe that nothing earned.
export function blessingGradient(tally, { angle = '120deg', first = null, second = null } = {}) {
  const present = COLOUR_ORDER.filter((colour) => tally[colour] > 0);
  if (present.length === 0) return null;

  // Bands in draw order: the first god's colour, then whatever is left in the
  // usual order, then the second god's. A colour is only moved to an end if the
  // build actually has it.
  const isPresent = (hex) => present.find((colour) => COLOUR_HEX[colour] === hex) ?? null;
  const firstColour = isPresent(first);
  const secondColour = isPresent(second);
  // Both gods the same colour is a mono-god build, and it should read as one -
  // that colour at BOTH ends with the off-colours between them, rather than
  // trailing off into whatever happened to be left. The band is emitted twice
  // and its weight split, so the total is unchanged.
  const mirrored = Boolean(firstColour) && firstColour === secondColour;
  const middle = present.filter((colour) => colour !== firstColour && colour !== secondColour);
  const ordered = [
    firstColour,
    ...middle,
    mirrored ? firstColour : secondColour,
  ].filter(Boolean);

  // A mirrored build with nothing in the middle is just that one colour.
  if (mirrored && middle.length === 0) {
    return `linear-gradient(${angle}, ${COLOUR_HEX[firstColour]}, ${COLOUR_HEX[firstColour]})`;
  }

  // Halved for a mirrored band so appearing twice does not double its weight.
  const weight = (colour, index) =>
    mirrored && colour === firstColour && (index === 0 || index === ordered.length - 1)
      ? tally[colour] / 2
      : tally[colour];
  const total = ordered.reduce((sum, colour, index) => sum + weight(colour, index), 0);
  let travelled = 0;
  const stops = ordered.map((colour, index) => {
    const share = weight(colour, index) / total;
    const midpoint = (travelled + share / 2) * 100;
    travelled += share;
    // The end bands are pinned flush so the god colours actually reach the
    // edges - at a midpoint they would stop short and the anchor would not read.
    const atEnd = index === ordered.length - 1 && (secondColour || mirrored);
    const at = index === 0 && firstColour ? 0 : atEnd ? 100 : midpoint;
    return `${COLOUR_HEX[colour]} ${Math.round(at)}%`;
  });

  // A single colour needs two stops to be a gradient at all.
  if (stops.length === 1) return `linear-gradient(${angle}, ${COLOUR_HEX[ordered[0]]}, ${COLOUR_HEX[ordered[0]]})`;
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
