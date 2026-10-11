// The sites whose analytics this service records. jellyflow.xyz hosts more
// than one project, and rather than each running its own tracking/rollup/admin
// stack, they all report through this one (POST /api/track with a `site`) and
// the admin dashboard shows each on its own tab - never mixed.
//
// Kept in sync by hand with the CHECK constraints on page_events.site,
// daily_path_stats.site and daily_sessions.site (see
// deploy/migrations/019_analytics_site.sql). Validated here too so a bad
// request 400s with a clear error rather than surfacing as a Postgres
// constraint violation - which, from track.js, would be swallowed and never
// seen at all (analytics inserts are fire-and-forget).
export const SITES = ['leagues', 'moviebattles'];

// What a request with no `site` means. Has to stay 'leagues': the RS3 Leagues
// frontend predates sites and never sends one, and it must keep working
// unchanged (it's also the column default in 019, for the same reason).
export const DEFAULT_SITE = 'leagues';

// Absent -> DEFAULT_SITE; one of SITES -> itself; anything else -> null, which
// callers turn into a 400. An unknown site is rejected rather than defaulted:
// quietly filing a typo'd site's pageviews under Leagues is exactly the mixing
// this exists to prevent.
export function parseSite(rawValue) {
  if (rawValue === undefined) return DEFAULT_SITE;
  return SITES.includes(rawValue) ? rawValue : null;
}
