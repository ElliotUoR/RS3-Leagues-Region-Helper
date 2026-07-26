// Generates RS3-themed short link codes, e.g. "torva-seismic-vengeance".
//
// Picks WORDS_PER_CODE words independently at random (repeats allowed) from
// the curated list in src/data/shortLinkWords.js. With ~530 words and 3 per
// code that's ~530^3 (~150M) possible codes - collisions become likely only
// after tens of thousands of links exist (see docs/site-migration-plan.md).
// The caller (routes/shorten.js) retries with a fresh code on the rare
// unique-constraint conflict rather than this module trying to guarantee
// uniqueness itself.
import { SHORTLINK_WORDS } from '../../../src/data/shortLinkWords.js';

const WORDS_PER_CODE = 3;

function randomWord() {
  return SHORTLINK_WORDS[Math.floor(Math.random() * SHORTLINK_WORDS.length)];
}

export function generateShortCode() {
  return Array.from({ length: WORDS_PER_CODE }, randomWord).join('-');
}
