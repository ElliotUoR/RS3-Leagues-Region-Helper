import { BLESSINGS, GOD_TIER_BLESSINGS } from '../data/blessings';

// The "why it's good" / "how to play it" fields are long, number-dense prose
// stored as plain strings so the localhost editor can round-trip them back into
// src/data/blessingBuilds.js. That rules out authoring markup in the data, so
// emphasis is derived here instead: purely presentational, and the raw string
// is still what the textarea shows in edit mode.
//
// Two levels only. More than that turns a paragraph into a ransom note.
//   - 'stat' -> the figures the argument rests on
//   - 'term' -> the blessings and abilities being named

// Bare ability and proc names that come up repeatedly but are not themselves
// blessings. Kept short on purpose - emphasising every noun defeats the point.
const EXTRA_TERMS = [
  'Light of Saradomin',
  'Grasp of Guthix',
  'Inferno of Zamorak',
  'Elder overload',
  'Elder overloads',
  'overload',
  'overloads',
  'Preparation',
  'Revenge',
  'Reflect',
  'Berserk',
  'Bash',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Prose is hand-written and mixes straight and curly apostrophes, so match
// either wherever a term contains one.
const termPattern = (name) => escapeRe(name).replace(/['’]/g, "['’]");

// Longest first: JS alternation is leftmost-*first*, not leftmost-longest, so
// without this "overload" would win over "Elder overload".
const TERMS = [...BLESSINGS, ...GOD_TIER_BLESSINGS]
  .map((b) => b.name)
  .concat(EXTRA_TERMS)
  .sort((a, b) => b.length - a.length)
  .map(termPattern)
  .join('|');

// A number token deliberately swallows a trailing % or unit-s so "75%" and "9s"
// highlight as one run. Signed numbers keep their sign, which also means a range
// like "110-130%" comes out as two adjacent runs that must read as one - hence
// no padding or background on the stat style.
// Thousands separators are matched as explicit ,ddd groups rather than a loose
// [\d,]* class, which would also swallow the comma in "...+ 40, so the +25...".
const TOKEN_RE = new RegExp(
  `\\b(?:${TERMS})\\b|[+-]?\\d+(?:,\\d{3})*(?:\\.\\d+)?(?:%|s\\b)?`,
  'g',
);

// Splits a paragraph into a flat run list: { text, kind, at } where kind is
// 'stat', 'term', or null for plain text, and `at` is the character offset -
// unique within the paragraph, so it doubles as a stable React key.
export function tokenizeProse(paragraph) {
  const runs = [];
  let last = 0;
  for (const match of paragraph.matchAll(TOKEN_RE)) {
    if (match.index > last) {
      runs.push({ text: paragraph.slice(last, match.index), kind: null, at: last });
    }
    runs.push({
      text: match[0],
      kind: /^[+-]?\d/.test(match[0]) ? 'stat' : 'term',
      at: match.index,
    });
    last = match.index + match[0].length;
  }
  if (last < paragraph.length) runs.push({ text: paragraph.slice(last), kind: null, at: last });
  return runs;
}
