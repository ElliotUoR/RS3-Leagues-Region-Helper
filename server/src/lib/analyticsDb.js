// Shared pg Pool for the low-privilege `analytics` Postgres role (see
// deploy/migrations/002_analytics_rollup.sql), used by both the rollup job
// (lib/analyticsRollup.js) and the admin stats API (routes/admin.js) - one
// pool per process rather than one per caller.
import pg from 'pg';

const { Pool } = pg;

let pool;
export function getAnalyticsPool() {
  if (!pool) {
    const connectionString = process.env.ANALYTICS_DATABASE_URL;
    if (!connectionString) {
      throw new Error('ANALYTICS_DATABASE_URL environment variable is required');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
