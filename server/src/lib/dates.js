// Returns "YYYY-MM-DD" for `days` days before today, in UTC. Negative
// `days` moves forward (e.g. -1 = tomorrow) - used by both the analytics
// rollup job and the admin summary endpoint to stay in exact agreement
// about UTC day boundaries.
export function utcDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
