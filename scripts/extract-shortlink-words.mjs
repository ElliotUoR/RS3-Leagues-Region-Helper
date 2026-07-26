// Re-runnable helper for maintaining src/data/shortLinkWords.js.
//
// Tokenizes every `name`/`relicName` in gear.js, relics.js, abilities.js, and
// spellbooks.js, then diffs the result against the already-reviewed
// SHORTLINK_WORDS and EXCLUDED_WORDS lists. Only genuinely new words (from
// newly-added gear/relics/abilities/spells) get printed - it never touches
// the data files, and it never re-flags a word that's already been through
// manual review.
//
// Usage: node scripts/extract-shortlink-words.mjs
// Then: for each printed candidate, add it to SHORTLINK_WORDS if it reads
// well as a standalone word, or to EXCLUDED_WORDS (with a short reason) if
// it's a fragment/filler - see the category comments already in that file.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'src', 'data');

const { GEAR } = await import(pathToFileURL(path.join(dataDir, 'gear.js')));
const { RELICS } = await import(pathToFileURL(path.join(dataDir, 'relics.js')));
const { ABILITIES } = await import(pathToFileURL(path.join(dataDir, 'abilities.js')));
const { SPELLBOOK_GROUPS, PRAYER_GROUPS } = await import(pathToFileURL(path.join(dataDir, 'spellbooks.js')));
const { SHORTLINK_WORDS, EXCLUDED_WORDS } = await import(pathToFileURL(path.join(dataDir, 'shortLinkWords.js')));

// Words that are structurally noise regardless of source (roman numerals,
// short connectives) - separate from EXCLUDED_WORDS, which is for
// case-by-case judgement calls on real words that did show up in a name.
const STOPWORDS = new Set([
  'of', 'the', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'on', 'off', 'at', 'is', 'or',
  'i', 'ii', 'iii', 'iv', 'v', 'vi', '1', '2', '3',
]);

function collectNames(obj, into) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectNames(item, into));
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if ((key === 'name' || key === 'relicName') && typeof value === 'string') into.add(value);
      else collectNames(value, into);
    }
  }
}

const names = new Set();
collectNames(GEAR, names);
collectNames(RELICS, names);
collectNames(ABILITIES, names);
collectNames(SPELLBOOK_GROUPS, names);
collectNames(PRAYER_GROUPS, names);

const tokenized = new Set();
for (const name of names) {
  const cleaned = name
    .replace(/['’]s\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/[-_/]/g, ' ');
  for (const word of cleaned.split(/\s+/)) {
    const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    tokenized.add(w);
  }
}

const known = new Set([...SHORTLINK_WORDS, ...EXCLUDED_WORDS]);
const candidates = [...tokenized].filter((w) => !known.has(w)).sort();

if (candidates.length === 0) {
  console.log('No new candidate words - shortLinkWords.js is up to date with the current data files.');
} else {
  console.log(`${candidates.length} new candidate word(s) not yet reviewed:\n`);
  console.log(candidates.join('\n'));
  console.log('\nAdd each one to SHORTLINK_WORDS (if it reads well standalone) or EXCLUDED_WORDS (with a reason) in src/data/shortLinkWords.js.');
}
