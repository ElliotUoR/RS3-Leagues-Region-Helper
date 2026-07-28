# League Relics import API

A URL-based API for third-party sites (relic planners, tier-list tools, etc.)
to hand a visitor off to this site with a set of League Relics pre-loaded,
so they can immediately see how those relics interact with the Gear Planner.

Not to be confused with this site's own `?share=`/`/s/:code` build-sharing
links (see `src/utils/shareBuild.js`) - that system stages someone else's
*entire* build (regions, gear, both relic types) behind a read-only "shared
view" banner with an explicit "load into my planner" step. This API is
narrower and blunter on purpose: it's just relic names, and it writes
straight into the visitor's own real selection immediately. See
`src/utils/importRelics.js`'s file header for the full reasoning.

## URL format

```
https://jellyflow.xyz/Leagues/?import-relics=<name>,<name>,...
```

- `import-relics` is a query param on the site root - works from any path/hash.
- Value is a comma-separated list of relic names.
- Each name should be individually URL-encoded (spaces as `%20` or `+`).
- Matching is **case-insensitive** and whitespace-trimmed, so
  `crystal grace`, `Crystal Grace`, and `  CRYSTAL GRACE  ` all resolve the
  same way - this is deliberately more forgiving than this site's own
  internal share-link format, since a third-party integrator won't always
  get casing exactly right.

Example:

```
https://jellyflow.xyz/Leagues/?import-relics=Crystal%20Grace,Golden%20Touch
```

## What happens on load

1. The visitor's **entire** League Relics selection is replaced with the
   imported list (not merged) - an import represents a complete relic
   loadout from the other site, same convention as this site's own
   "load into my planner" action elsewhere.
2. Unrecognized names are silently dropped.
3. The "only one relic per tier" rule is enforced automatically - if the
   import contains two same-tier relics, whichever one appears first in the
   list wins, exactly as if the visitor had clicked one and then the other
   themselves.
4. The address bar is switched to `#league-relics` and the `import-relics`
   query param is stripped (so refreshing the page doesn't re-trigger the
   import).
5. A small one-time modal confirms what happened ("Relics imported - N
   league relics loaded into your League Relics tab") and is dismissed with
   a single button. There's no persistent banner and no "adopt"/"exit shared
   view" step - by the time the visitor sees anything, the import has
   already happened for real.

If the param is missing, or every name in it fails to match a known relic,
this is a complete no-op: no write, no redirect, no modal.

## Relic names

Names must match the `name` field in `src/data/leagueRelics.js` (case
doesn't matter, exact spelling does). As of writing:

`Endless Harvest`, `Survivalist`, `Golden Touch`, `Crystal Grace`, `Superheated`

This list is expected to grow substantially before and after the league's
10 August 2026 launch - see "Expanding as more relics are announced" below
for why integrators don't need to track a version number or wait on an API
change to use new relics as they're added.

## Implementation

- `src/utils/importRelics.js` - `parseImportRelicsParam()` /
  `stripImportRelicsParam()`, pure URL handling, no relic-data knowledge.
- `src/hooks/useLeagueRelicSelection.js` - `sanitizeLeagueRelicSelectionLoose()`,
  the case-insensitive validation + tier-collision resolution described
  above.
- `src/App.jsx` - the effect that wires the two together: on mount, parses
  the param, sanitizes it, writes to `LEAGUE_RELICS_STORAGE_KEY`, forces a
  remount of the app's stateful subtree (so the already-initialized
  `useLeagueRelicSelection` hook picks up the fresh write), switches route,
  and triggers `ImportRelicsModal`.

## Expanding as more relics are announced

Nothing about this API is hardcoded to today's five relics or today's
tiers. Matching is entirely data-driven against the `LEAGUE_RELICS` array in
`src/data/leagueRelics.js` - adding Jagex's next reveal to this site is just
adding a new entry there (`name`, `tier`, `effects`, `icon`), the same way
every other relic already was. The import API automatically recognizes the
new name the moment that entry exists, including:

- A relic in an already-known tier (the one-per-tier collision rule just
  works against the new entry too).
- A relic in a brand new tier number - `tier` is a plain value read off each
  entry, not a fixed enum, so a never-seen-before tier needs no code change.
- A relic with `tier: null` (unknown/unconfirmed tier, see the existing
  Crystal Grace/Superheated entries) - these are exempt from the one-per-tier
  rule entirely, matching how little is actually known about them until the
  wiki/Jagex confirms otherwise.

In short: this doc (and the API's URL shape) shouldn't need to change as the
league's relic reveals continue - only `src/data/leagueRelics.js` does.

## Future: Blessings

Equilibrium League also introduces **Blessings** - a second, separate
task-count-gated progression track (unlocking at task milestones like 10,
250, 3,150... tasks) alongside Relics. There's no data model or tab for
these in this codebase yet.

When Blessings do get built (following the same pattern League Relics
already established - a `src/data/blessings.js` catalog, a
`useBlessingSelection` hook, a `BlessingsPage` tab), the natural extension
of this API is a parallel, independent param on the same URL shape:

```
https://jellyflow.xyz/Leagues/?import-relics=Crystal%20Grace&import-blessings=<name>,<name>
```

Kept as a **separate param** rather than folded into one combined schema
now, on purpose - Relics and Blessings are unrelated progression systems in
the game itself, and keeping their import contracts independent means each
can evolve (new names, new constraints) without the other's format ever
needing to change. A visitor landing with both params present would expect
both imports to apply and both to redirect to whichever tab makes sense
last (or, if that's ever ambiguous, a single combined "N relics and M
blessings imported" modal instead of two - a real design decision to make
once Blessings actually exist, not before).
