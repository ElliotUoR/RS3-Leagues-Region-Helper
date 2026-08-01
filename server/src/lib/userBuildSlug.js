// Turns a user build's name into the slug it lives at
// (/Leagues/build-guides/<slug>).
//
// That path is one namespace shared with this site's own curated guides, which
// resolve first (see routes/buildGuidePage.js) - so a user slug equal to a
// curated id would be permanently unreachable. Their ids are treated as
// reserved rather than allowed to collide, read from the real data here so a
// guide added later needs no migration.
//
// Kept deliberately in step with the backfill in
// deploy/migrations/015_user_build_slugs.sql: same character rule, same length
// cap, same "-2, -3, ..." suffixing. The migration hardcodes the reserved list
// because SQL cannot import a JS module; this is the version that stays live.
import { BLESSING_BUILDS_EXAMPLES } from '../../../src/data/blessingBuilds.js';

const MAX_SLUG_LENGTH = 60;
const FALLBACK_SLUG = 'build';

// Every curated id, including ones flagged `hidden`. A hidden guide is not
// reachable today but can be un-hidden by a deploy, and a user build that had
// quietly taken its slug would break at that moment - so the reservation is
// wider than the current visibility.
const RESERVED = new Set(BLESSING_BUILDS_EXAMPLES.map((build) => build.id));

export function slugify(name) {
  const base = String(name ?? '')
    .toLowerCase()
    // Apostrophes are DELETED, not turned into a separator, so "Teragard's
    // Bulwark" gives "teragards-bulwark" rather than "teragard-s-bulwark".
    // That is the convention the curated ids already follow, and it is what
    // makes the reserved-id check meaningful: without it a user build named
    // after a guide would slugify differently and quietly slip past.
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    // The slice can land mid-separator, leaving a trailing hyphen.
    .replace(/-+$/, '');
  return base || FALLBACK_SLUG;
}

export function isReservedSlug(slug) {
  return RESERVED.has(slug);
}

// The candidate to try on attempt `n` (0-based). The first is the bare slug,
// then "-2", "-3", ... - so the second build called "Big Boned Tank" is
// big-boned-tank-2, which is what a reader would guess.
//
// Only ever a CANDIDATE: uniqueness is enforced by the unique index, and the
// caller retries on conflict. Checking-then-inserting would race.
export function slugCandidate(base, n) {
  return n === 0 ? base : `${base}-${n + 1}`;
}
