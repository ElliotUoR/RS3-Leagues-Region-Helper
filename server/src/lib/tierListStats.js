// Aggregate analysis of every submitted tier list, for the admin dashboard.
//
// Computed here rather than in JellyFlow because the maths needs the item lists
// and this site's own curated grades, which live in this repo - shipping copies
// of both to a separate dashboard project would guarantee they drift.
//
// RANK, NOT LABEL. Rows are renamable, so "S" on one list may be "Must pick" on
// another and mean the same thing. Everything below scores by row POSITION -
// top row 7 down to bottom row 1 - which is what keeps two lists comparable at
// all. Unsorted entries score nothing and are counted separately: "nobody
// ranked this" is a different claim from "everybody ranked it low".
import { itemsFor } from '../../../src/data/tierListItems.js';
import { BLESSING_TIER_LIST, LEAGUE_RELIC_TIER_LIST } from '../../../src/data/blessingBuilds.js';
import { ROW_COUNT } from './tierListShape.js';

// Row index 0 is the best rank, so it scores highest.
export function scoreForRow(rowIndex) {
  return ROW_COUNT - rowIndex;
}

const CURATED_BY_TYPE = {
  blessings: BLESSING_TIER_LIST,
  relics: LEAGUE_RELIC_TIER_LIST,
};

// This site's own grade for an entry, so a per-item row can be read as
// "the community says X, we say Y" without a second lookup.
function curatedGrades(type) {
  const entries = CURATED_BY_TYPE[type]?.entries ?? [];
  return new Map(entries.map((entry) => [entry.name, entry.grade]));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function round(value, places = 2) {
  return Number(value.toFixed(places));
}

// `allLists` is every stored list of one type, refused ones included - the
// filtering happens HERE rather than at the query, so the one place that
// decides what a "community ranking" is made of is the same place that
// computes it.
//
// Refused lists are excluded from every figure below: a joke list or ten
// submissions from one person would otherwise move the averages, which is the
// entire reason the flag exists (see 017_tier_list_refused.sql). Hidden lists
// are NOT excluded - hiding is about an unacceptable name, not an invalid
// ranking, and dropping them would make the numbers depend on moderation.
export function summariseTierLists(type, allLists) {
  const items = itemsFor(type);
  const curated = curatedGrades(type);
  const lists = allLists.filter((list) => !list.refused);
  const refusedCount = allLists.length - lists.length;
  const totalLists = lists.length;

  const perItem = items.map((item) => {
    const scores = [];
    let unsorted = 0;
    let top = 0;
    let bottom = 0;

    for (const list of lists) {
      const row = list.payload?.placements?.[item.name];
      if (!Number.isInteger(row)) {
        unsorted += 1;
        continue;
      }
      scores.push(scoreForRow(row));
      if (row === 0) top += 1;
      if (row === ROW_COUNT - 1) bottom += 1;
    }

    const pct = (n) => (totalLists === 0 ? 0 : round((n / totalLists) * 100, 1));
    return {
      name: item.name,
      icon: item.icon,
      curatedGrade: curated.get(item.name) ?? null,
      ranked: scores.length,
      // null rather than 0 when nobody ranked it - an average of "no data" is
      // not zero, and a 0 would sort it below genuinely bottom-tier entries.
      averageScore: scores.length > 0 ? round(mean(scores)) : null,
      // How much people disagree. A high spread on a decent average is the
      // interesting case: it means the entry is build-dependent rather than
      // simply good or bad.
      spread: scores.length > 1 ? round(standardDeviation(scores)) : null,
      unsortedPct: pct(unsorted),
      topPct: pct(top),
      bottomPct: pct(bottom),
    };
  });

  // Only entries with a real spread can be agreed or disagreed about. An entry
  // exactly one person ranked has a spread of null, and treating that as zero
  // made it "most agreed on" - which is the opposite of what one data point
  // means. `MIN_RATINGS_FOR_CONSENSUS` is deliberately the minimum a standard
  // deviation is defined for; raise it if these ever read as noise.
  const MIN_RATINGS_FOR_CONSENSUS = 2;
  const bySpread = perItem
    .filter((item) => item.spread != null && item.ranked >= MIN_RATINGS_FOR_CONSENSUS)
    .sort((a, b) => b.spread - a.spread);

  return {
    type,
    totalLists,
    refusedCount,
    // Average number of entries a list bothers to place - a proxy for whether
    // people finish these or abandon them half-sorted.
    averagePlaced:
      totalLists === 0
        ? 0
        : round(mean(lists.map((list) => Object.keys(list.payload?.placements ?? {}).length)), 1),
    perItem: [...perItem].sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1)),
    mostAgreed: bySpread.length > 0 ? bySpread[bySpread.length - 1] : null,
    mostDivisive: bySpread.length > 0 ? bySpread[0] : null,
  };
}
