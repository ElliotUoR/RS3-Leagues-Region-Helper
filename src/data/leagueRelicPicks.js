import { LEAGUE_RELICS } from './leagueRelics.js';

// The rules governing which league relics may be held at once.
//
// Pulled out of useLeagueRelicSelection so the logic can be exercised directly
// (the hook imports React and cannot be), and because four surfaces now depend
// on agreeing about it: the League Relics page, the build editor, My Build and
// the build cards that visualise a finished set.
//
// Base rule: one relic per tier. Relics whose tier is unknown are unconstrained
// - "pick any number" - since there is no tier to be exclusive within.
//
// Rejuvenated: "Choose another relic from a previous tier." Taking it buys ONE
// extra pick, so exactly one tier may hold two relics while the rest stay at
// one. Its own wording says "previous", which cannot be enforced here: it has
// no confirmed tier (see leagueRelics.js), so there is no "previous" to measure
// against and the bonus is spendable on any tier. If a tier is ever confirmed
// for it, this file is the only place that needs the extra condition.
export const REJUVENATED_RELIC = 'Rejuvenated';

const BY_NAME = new Map(LEAGUE_RELICS.map((relic) => [relic.name, relic]));

export const tierOf = (name) => BY_NAME.get(name)?.tier ?? null;

function countsPerTier(names) {
  const perTier = new Map();
  for (const name of names) {
    const tier = tierOf(name);
    if (tier == null) continue;
    perTier.set(tier, (perTier.get(tier) ?? 0) + 1);
  }
  return perTier;
}

// How far a set already exceeds one-per-tier - i.e. how much of the bonus it
// has spent.
export function extraPicksUsed(names) {
  let extra = 0;
  for (const count of countsPerTier(names).values()) extra += Math.max(0, count - 1);
  return extra;
}

export function bonusPicksAllowed(names) {
  return names.includes(REJUVENATED_RELIC) ? 1 : 0;
}

// What is left to spend. The headings read this so the UI and the toggle can
// never disagree about what is permitted.
export function bonusPicksRemaining(names) {
  return Math.max(0, bonusPicksAllowed(names) - extraPicksUsed(names));
}

// How many relics a given tier may hold right now, given everything else
// already picked. 1 normally; 2 for whichever tier the bonus is spent on.
export function capForTier(names, tier) {
  if (tier == null) return Infinity;
  const others = names.filter((name) => tierOf(name) !== tier);
  return 1 + bonusPicksRemaining(others);
}

// Validates an arbitrary list (localStorage, a decoded share link, a stored
// build payload) down to a legal set.
//
// Two passes, because the allowance depends on whether Rejuvenated survives the
// catalogue check at all - which is only knowable once every name has been
// looked at. A single pass would have to guess.
export function sanitizeRelicPicks(raw) {
  if (!Array.isArray(raw)) return [];
  const known = raw.filter((name) => typeof name === 'string' && BY_NAME.has(name));
  let budget = bonusPicksAllowed(known);

  const perTier = new Map();
  const result = [];
  for (const name of known) {
    if (result.includes(name)) continue;
    const tier = tierOf(name);
    if (tier == null) {
      result.push(name);
      continue;
    }
    const count = perTier.get(tier) ?? 0;
    if (count >= 1) {
      // Over the base rule - allowed only while the bonus lasts, and spent in
      // arrival order so a hand-crafted payload cannot smuggle in more than one.
      if (budget <= 0) continue;
      budget -= 1;
    }
    perTier.set(tier, count + 1);
    result.push(name);
  }
  return result;
}

// Which tier a set has doubled up on, or null. Two relics sharing a tier is
// only legal because Rejuvenated paid for it, so this is what the build cards
// key their explanation off - a reader seeing two Tier 1 relics should not have
// to work out for themselves whether it is a mistake.
export function doubledTier(names) {
  for (const [tier, count] of countsPerTier(names)) {
    if (count > 1) return tier;
  }
  return null;
}

// Toggling one relic on or off, returning the new set.
export function toggleRelicPick(names, relic) {
  if (names.includes(relic.name)) {
    const without = names.filter((name) => name !== relic.name);
    // Dropping Rejuvenated takes its extra pick back with it. Without this you
    // could take it, spend the bonus on a second Tier 1, then deselect
    // Rejuvenated and keep both - a free relic for one click.
    return relic.name === REJUVENATED_RELIC ? sanitizeRelicPicks(without) : without;
  }

  if (relic.tier == null) return [...names, relic.name];

  const sameTier = names.filter((name) => tierOf(name) === relic.tier);
  const others = names.filter((name) => tierOf(name) !== relic.tier);
  const cap = capForTier(names, relic.tier);
  // Keeping the LAST `cap` of this tier makes a click on a full tier swap out
  // its oldest member rather than clearing the tier back to one: the
  // radio-button feel survives, it just has two slots instead of one.
  return [...others, ...[...sameTier, relic.name].slice(-cap)];
}
