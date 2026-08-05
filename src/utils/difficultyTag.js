import { EXECUTION_DIFFICULTIES } from '../data/blessingBuilds.js';

// Turns a free-text difficulty label into one of the four execution levels, so
// a user-submitted build's tag is coloured like a curated one's.
//
// Curated guides carry a numeric `difficulty` and get `.build-difficulty-N`
// straight off it. User builds carry whatever the submitter typed - "EZ",
// "braindead", "sweaty endgame" - which matched nothing and rendered as an
// uncoloured pill, so the one field on the card that is meant to be scannable
// at a glance was the one field you had to read.
//
// ORDER IS THE WHOLE ALGORITHM. The list is scanned top to bottom and the first
// hit wins, so every qualified phrase has to sit above the bare word it
// contains: "very easy" before "easy", "not hard" before "hard". Reordering
// this list silently changes what a label resolves to.
const RULES = [
  // --- qualified, and therefore first -------------------------------------
  { level: 1, pattern: /\b(very|super|extremely)\s*easy\b/ },
  { level: 1, pattern: /\bnot\s*(hard|difficult)\b/ },
  { level: 4, pattern: /\b(very|super|extremely)\s*(hard|difficult)\b/ },
  { level: 3, pattern: /\b(not|fairly|somewhat)\s*easy\b/ },

  // --- 1: performs near its ceiling with no rotation knowledge -------------
  { level: 1, pattern: /\b(trivial|braindead|brain\s*dead|faceroll|face\s*roll)\b/ },
  { level: 1, pattern: /\b(afk|idle|zero\s*effort|no\s*effort|effortless)\b/ },
  { level: 1, pattern: /\b(beginner|starter|newbie|noob|new\s*player|first\s*build)\b/ },
  { level: 1, pattern: /\b(revo|revolution)\b/ },

  // --- 2: a short rotation and a buff or two -------------------------------
  { level: 2, pattern: /\beasy\b/ },
  { level: 2, pattern: /\bez\b/ },
  { level: 2, pattern: /\b(simple|basic|casual|chill|relaxed|forgiving|low\s*effort)\b/ },
  { level: 2, pattern: /\b(lazy|comfy|painless|straight\s*forward|straightforward)\b/ },

  // --- 3: real rotation and resource management ----------------------------
  { level: 3, pattern: /\b(moderate|medium|mid|normal|average|standard)\b/ },
  { level: 3, pattern: /\b(intermediate|some\s*effort|balanced|middling)\b/ },

  // --- 4: full rotation, tight timings, reactive play ----------------------
  { level: 4, pattern: /\b(demanding|hard|difficult|tough|punishing|brutal)\b/ },
  { level: 4, pattern: /\b(hardcore|advanced|expert|master|elite)\b/ },
  { level: 4, pattern: /\b(sweaty|tryhard|try\s*hard|high\s*effort|intensive|intense)\b/ },
  { level: 4, pattern: /\b(complex|complicated|technical|pvme|end\s*game|endgame)\b/ },
];

// Lowercased, and punctuation flattened to spaces so "very-easy", "very_easy"
// and "VERY EASY!" all reach the same rule. \b then does the rest, which is
// what stops "ez" matching inside "breeze" or "easy" inside "easygoing".
function normalise(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// 1-4, or null when nothing matches - a label this cannot place keeps its
// uncoloured pill rather than being guessed into a level, because a wrong
// difficulty is worse than an unstyled one on the field people filter by.
export function difficultyLevelFor(label) {
  if (!label || typeof label !== 'string') return null;
  const text = normalise(label);
  if (!text) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.level;
  }
  return null;
}

// The tooltip a matched level carries, so a recognised user label explains
// itself with the same wording the curated guides use.
export function difficultyNoteFor(level) {
  return EXECUTION_DIFFICULTIES[level]?.note ?? null;
}
