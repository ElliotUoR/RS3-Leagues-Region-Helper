// Key formats for usage_counters (see deploy/migrations/008_usage_counters.sql),
// where the browser that writes a key and the admin route that reads it back
// have to agree on its shape. Shared by both rather than defined twice - the
// failure mode of drift is silent, since a counter written under a key nothing
// reads just quietly accumulates.

// User-submitted builds share the `build_guide` category with this site's own
// curated guides: the product question is the same one ("which builds are
// people actually opening"), so they belong in the same ranked list rather
// than a second panel nobody remembers to look at.
//
// Curated guides key on their slug id ("teragards-bulwark"), which is readable
// as-is. A user build has only a numeric id, so it is namespaced to keep the
// two apart, and the id - not the name - is what's stored: a build can be
// renamed (by its author or an admin) and its counter has to survive that. The
// admin route resolves the id to the current name at read time.
const USER_BUILD_PREFIX = 'user:';

export function userBuildCounterKey(id) {
  return `${USER_BUILD_PREFIX}${id}`;
}

// Returns the numeric id as a string for a user-build key, or null for a
// curated guide's slug.
export function userBuildIdFromCounterKey(key) {
  if (typeof key !== 'string' || !key.startsWith(USER_BUILD_PREFIX)) return null;
  const id = key.slice(USER_BUILD_PREFIX.length);
  return /^\d+$/.test(id) ? id : null;
}
