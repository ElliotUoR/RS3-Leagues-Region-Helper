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
// Tier lists use four. They are shared far less often than build links but
// live longer and are enumerable in principle (the code is the only thing
// guarding one), so the extra word buys ~530x the space for one more syllable
// to read out: ~79 billion combinations rather than ~150 million.
const WORDS_PER_TIER_LIST_CODE = 4;

function randomWord() {
  return SHORTLINK_WORDS[Math.floor(Math.random() * SHORTLINK_WORDS.length)];
}

function makeCode(wordCount) {
  return Array.from({ length: wordCount }, randomWord).join('-');
}

export function generateShortCode() {
  return makeCode(WORDS_PER_CODE);
}

export function generateTierListCode() {
  return makeCode(WORDS_PER_TIER_LIST_CODE);
}
